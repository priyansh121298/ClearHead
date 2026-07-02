'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AppLayoutClient({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navLinks = [
    { name: 'Dump', href: '/app/dump' },
    { name: 'History', href: '/app/history' },
    { name: 'Settings', href: '/app/settings' },
  ];

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside 
        className="hidden md:flex flex-col relative z-20"
        style={{
          width: '220px',
          background: 'rgba(255,255,255,0.022)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}
      >
        <div className="flex items-center gap-2 pt-6 pb-8 px-4">
          <span style={{ filter: 'drop-shadow(0 0 8px rgba(123,110,246,0.8))' }}>🧠</span>
          <span className="font-heading font-bold" style={{ color: '#F0EFF8', fontSize: '16px' }}>
            ClearHead
          </span>
        </div>

        <nav className="flex-1 flex flex-col">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className="transition-all duration-200"
                style={{
                  margin: '2px 8px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: isActive ? '10px' : '10px',
                  color: isActive ? '#A89EF8' : '#6B6882',
                  background: isActive ? 'rgba(123,110,246,0.15)' : 'transparent',
                  borderLeft: isActive ? '3px solid #7B6EF6' : '3px solid transparent',
                  outline: 'none',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = '#F0EFF8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#6B6882';
                  }
                }}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="pb-4 flex flex-col">
          <p 
            className="truncate px-4 mb-2 font-medium" 
            style={{ fontSize: '11px', color: '#4A4762' }}
            title={userEmail}
          >
            {userEmail}
          </p>
          <button
            onClick={handleSignOut}
            className="transition-all duration-200 text-left cursor-pointer"
            style={{
              margin: '0 8px',
              padding: '10px 14px',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '10px',
              color: '#6B6882',
              background: 'transparent',
              border: 'none',
              borderLeft: '3px solid transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.color = '#F0EFF8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#6B6882';
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0 scroll-smooth relative z-10">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom pb-4"
        style={{
          background: 'rgba(255,255,255,0.022)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}
      >
        <div className="flex justify-around items-center p-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                style={{
                  padding: '10px 14px',
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: '10px',
                  color: isActive ? '#A89EF8' : '#6B6882',
                  background: isActive ? 'rgba(123,110,246,0.15)' : 'transparent',
                }}
              >
                {link.name}
              </Link>
            );
          })}
          <button
            onClick={handleSignOut}
            style={{
              padding: '10px 14px',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '10px',
              color: '#6B6882',
              background: 'transparent',
            }}
          >
            Sign out
          </button>
        </div>
      </nav>
    </div>
  );
}
