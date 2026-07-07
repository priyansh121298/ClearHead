'use client';

import { useState } from 'react';
import Link from 'next/link';
import { type HistoryItem, getHistory, toggleComplete } from './actions';
import { chunkTask } from '../../actions/chunkTask';
import { motion, AnimatePresence } from 'motion/react';

const TABS = ['ALL', 'TASK', 'IDEA', 'WORRY', 'REMINDER'] as const;
type TabType = typeof TABS[number];

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return '1 month ago';
}

const getCategoryStyles = (category: string) => {
  switch (category) {
    case 'TASK': return { 
      headerBg: 'rgba(123,110,246,0.1)', 
      headerBorder: 'rgba(123,110,246,0.15)',
      badgeBg: 'rgba(123,110,246,0.2)',
      badgeColor: '#A89EF8',
      dot: '#7B6EF6'
    };
    case 'IDEA': return { 
      headerBg: 'rgba(167,139,250,0.08)', 
      headerBorder: 'rgba(167,139,250,0.12)',
      badgeBg: 'rgba(167,139,250,0.2)',
      badgeColor: '#C4B5FD',
      dot: '#A78BFA'
    };
    case 'WORRY': return { 
      headerBg: 'rgba(251,191,36,0.08)', 
      headerBorder: 'rgba(251,191,36,0.12)',
      badgeBg: 'rgba(251,191,36,0.2)',
      badgeColor: '#FCD34D',
      dot: '#FBBF24'
    };
    case 'REMINDER': return { 
      headerBg: 'rgba(45,212,191,0.08)', 
      headerBorder: 'rgba(45,212,191,0.12)',
      badgeBg: 'rgba(45,212,191,0.2)',
      badgeColor: '#5EEAD4',
      dot: '#2DD4BF'
    };
    default: return { 
      headerBg: 'rgba(255,255,255,0.05)', 
      headerBorder: 'rgba(255,255,255,0.1)',
      badgeBg: 'rgba(255,255,255,0.1)',
      badgeColor: '#F0EFF8',
      dot: '#F0EFF8'
    };
  }
};

export default function HistoryClient({ initialData }: { initialData: HistoryItem[] }) {
  const [items, setItems] = useState<HistoryItem[]>(initialData);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialData.length === 50);

  const [hoverTab, setHoverTab] = useState<string | null>(null);
  const [isChunking, setIsChunking] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => setExpandedTasks(prev => ({ ...prev, [id]: !prev[id] }));

  const loadFilter = async (filter: TabType) => {
    setIsLoading(true);
    setActiveTab(filter);
    setPage(0);
    try {
      const data = await getHistory(0, 50, filter);
      setItems(data);
      setHasMore(data.length === 50);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const loadMore = async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    const nextPage = page + 1;
    try {
      const data = await getHistory(nextPage, 50, activeTab);
      setItems(prev => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length === 50);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const handleToggle = async (id: string, currentStatus: boolean, isChild: boolean = false, parentId: string | null = null) => {
    setItems(prev => prev.map(i => {
      if (!isChild && i.id === id) {
        return { ...i, is_completed: !currentStatus };
      }
      if (isChild && i.id === parentId && i.children) {
        return {
          ...i,
          children: i.children.map(c => c.id === id ? { ...c, is_completed: !currentStatus } : c)
        };
      }
      return i;
    }));
    try {
      await toggleComplete(id, !currentStatus);
    } catch (e) {
      setItems(prev => prev.map(i => {
        if (!isChild && i.id === id) {
          return { ...i, is_completed: currentStatus };
        }
        if (isChild && i.id === parentId && i.children) {
          return {
            ...i,
            children: i.children.map(c => c.id === id ? { ...c, is_completed: currentStatus } : c)
          };
        }
        return i;
      }));
      console.error(e);
    }
  };

  const handleChunkTask = async (id: string) => {
    setIsChunking(id);
    try {
      const res = await chunkTask(id);
      if (res.success && res.data) {
        setItems(prev => prev.map(item => {
          if (item.id === id) {
            return { 
              ...item, 
              children: res.data?.map(child => ({
                id: child.id,
                category: 'TASK',
                text: child.text,
                is_completed: child.is_completed,
                estimated_minutes: child.estimated_minutes,
                created_at: child.created_at
              }))
            };
          }
          return item;
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsChunking(null);
    }
  };

  const groupedItems = items.reduce((acc, item) => {
    const relative = formatRelativeDate(item.created_at);
    if (!acc[relative]) acc[relative] = [];
    acc[relative].push(item);
    return acc;
  }, {} as Record<string, HistoryItem[]>);

  let staggerIndex = 0;

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '60px 0 100px 0' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 className="font-heading" style={{
          fontSize: '36px',
          fontWeight: 800,
          color: '#F0EFF8',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          margin: 0
        }}>
          History
        </h1>
        <p style={{
          fontSize: '15px',
          color: '#6B6882',
          marginTop: '10px',
          fontFamily: 'Inter',
          margin: '10px 0 0 0'
        }}>
          Review your past 30 days of thoughts.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          const isHovered = hoverTab === tab;
          return (
            <button
              key={tab}
              onClick={() => { if (!isActive) loadFilter(tab); }}
              onMouseEnter={() => setHoverTab(tab)}
              onMouseLeave={() => setHoverTab(null)}
              style={{
                padding: '10px 14px',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '10px',
                color: isActive ? '#A89EF8' : (isHovered ? '#F0EFF8' : '#6B6882'),
                background: isActive ? 'rgba(123,110,246,0.15)' : (isHovered ? 'rgba(255,255,255,0.06)' : 'transparent'),
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase() + 's'}
            </button>
          );
        })}
      </div>

      {/* Items List */}
      <div style={{ display: 'grid', gap: '28px' }}>
        {items.length === 0 && !isLoading ? (
          <div style={{ paddingTop: '80px', textAlign: 'center' }}>
            <span style={{ fontSize: '48px', display: 'block', filter: 'drop-shadow(0 0 16px rgba(123,110,246,0.6))' }}>
              🧠
            </span>
            <p style={{
              fontSize: '15px',
              color: '#6B6882',
              marginTop: '20px',
              margin: '20px 0 20px 0'
            }}>
              Nothing here yet. Go dump your first thoughts.
            </p>
            <Link 
              href="/app/dump" 
              className="font-heading"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 32px',
                height: '44px',
                background: 'linear-gradient(135deg, #6C5FE6 0%, #4ECDC4 100%)',
                color: 'white',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Clear my head
            </Link>
          </div>
        ) : (
          Object.entries(groupedItems).map(([date, dateItems]) => (
            <div key={date} style={{ display: 'grid', gap: '14px' }}>
              <h3 style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#6B6882',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 4px 8px'
              }}>
                {date}
              </h3>
              
              {/* Note: grouping items by category inside the date to match the new card design */}
              {(() => {
                const cats = ['TASK', 'IDEA', 'WORRY', 'REMINDER'].filter(c => dateItems.some(i => i.category === c));
                return cats.map(category => {
                  const itemsInCategory = dateItems.filter(i => i.category === category);
                  const styles = getCategoryStyles(category);
                  const delay = (staggerIndex++) * 0.08;

                  return (
                    <div 
                      key={category}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '16px',
                        padding: 0,
                        overflow: 'hidden',
                        animation: `fadeSlideUp 0.4s ease forwards`,
                        animationDelay: `${delay}s`,
                        opacity: 0,
                        transform: 'translateY(12px)'
                      }}
                    >
                      <div style={{
                        padding: '12px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: styles.headerBg,
                        borderBottom: `1px solid ${styles.headerBorder}`
                      }}>
                        <div style={{
                          background: styles.badgeBg,
                          color: styles.badgeColor,
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          padding: '3px 10px',
                          borderRadius: '20px'
                        }}>
                          {category}
                        </div>
                      </div>

                      <div>
                        {itemsInCategory.map((item, itemIndex) => (
                          <div 
                            key={item.id}
                            style={{
                              padding: '12px 18px',
                              borderBottom: itemIndex === itemsInCategory.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                              fontSize: '14px',
                              color: item.category === 'TASK' && item.is_completed ? '#6B6882' : '#C4C2D4',
                              textDecoration: item.category === 'TASK' && item.is_completed ? 'line-through' : 'none',
                              lineHeight: 1.55,
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '10px'
                            }}
                          >
                            {item.category === 'TASK' && (
                              <button
                                onClick={() => handleToggle(item.id, item.is_completed || false)}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  border: item.is_completed ? 'none' : '1.5px solid rgba(123,110,246,0.4)',
                                  background: item.is_completed ? '#7B6EF6' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                  marginTop: '2px'
                                }}
                              >
                                {item.is_completed && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </button>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                <span style={{ flex: 1 }}>{item.text}</span>
                                {item.estimated_minutes && (
                                  <span style={{ fontSize: '11px', color: '#6B6882' }}>~{item.estimated_minutes} min</span>
                                )}
                                {item.category === 'TASK' && item.estimated_minutes && item.estimated_minutes >= 20 && (!item.children || item.children.length === 0) && (
                                  <button
                                    onClick={() => handleChunkTask(item.id)}
                                    disabled={isChunking === item.id}
                                    style={{
                                      fontSize: '11px',
                                      color: '#A89EF8',
                                      background: 'rgba(123,110,246,0.1)',
                                      border: '1px solid rgba(123,110,246,0.2)',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      cursor: isChunking === item.id ? 'not-allowed' : 'pointer',
                                      opacity: isChunking === item.id ? 0.5 : 1
                                    }}
                                  >
                                    {isChunking === item.id ? 'Breaking down...' : 'Break it down'}
                                  </button>
                                )}
                              </div>
                              
                              {/* Render children if they exist */}
                              {item.children && item.children.length > 0 && (
                                <div style={{ marginTop: '8px' }}>
                                  <button
                                    onClick={() => toggleExpand(item.id)}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: '4px',
                                      fontSize: '11px', color: '#8E8BA8', background: 'transparent',
                                      border: 'none', cursor: 'pointer', padding: '4px 0'
                                    }}
                                  >
                                    {item.text.length > 0 && item.text.split(' ')[0]} ▾ {item.children.length} steps
                                  </button>
                                  <AnimatePresence initial={false}>
                                    {expandedTasks[item.id] && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ overflow: 'hidden' }}
                                      >
                                        <div style={{
                                          marginTop: '12px',
                                          paddingLeft: '16px',
                                          borderLeft: '1px solid rgba(255,255,255,0.08)',
                                          display: 'grid',
                                          gap: '10px',
                                          paddingBottom: '8px'
                                        }}>
                                          {item.children.map(child => (
                                            <div key={child.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                      <button
                                        onClick={() => handleToggle(child.id, child.is_completed || false, true, item.id)}
                                        style={{
                                          width: '14px', height: '14px', borderRadius: '50%',
                                          border: child.is_completed ? 'none' : '1.5px solid rgba(123,110,246,0.4)',
                                          background: child.is_completed ? '#7B6EF6' : 'transparent',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          cursor: 'pointer', flexShrink: 0, marginTop: '2px'
                                        }}
                                      >
                                        {child.is_completed && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                      </button>
                                      <div style={{ flex: 1, fontSize: '13px', color: child.is_completed ? '#6B6882' : '#C4C2D4', textDecoration: child.is_completed ? 'line-through' : 'none', lineHeight: 1.4 }}>
                                        {child.text}
                                        {child.estimated_minutes && (
                                          <span style={{ fontSize: '11px', color: '#6B6882', marginLeft: '6px' }}>~{child.estimated_minutes} min</span>
                                        )}
                                      </div>
                                    </div>
                                          ))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={loadMore}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '10px',
              color: '#F0EFF8',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? 'Loading...' : 'Load older thoughts'}
          </button>
        </div>
      )}
    </div>
  );
}
