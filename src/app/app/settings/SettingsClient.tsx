'use client';

import { useState } from 'react';
import { type UserPrefs, saveUserPrefs } from './actions';

const TIMEZONES = [
  'America/Los_Angeles',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const HOURS = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i).toString().padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const AMPM = ['AM', 'PM'];

export default function SettingsClient({ initialPrefs }: { initialPrefs: UserPrefs }) {
  const parseTime = (hhmm: string) => {
    const [hStr, mStr] = hhmm.split(':');
    let h = parseInt(hStr || '8', 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return {
      hour: h.toString().padStart(2, '0'),
      minute: (mStr || '00').padStart(2, '0'),
      ampm,
    };
  };

  const parsed = parseTime(initialPrefs.morning_card_time);

  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [ampm, setAmpm] = useState(parsed.ampm);
  const [timezone, setTimezone] = useState(initialPrefs.timezone);
  const [enabled, setEnabled] = useState(initialPrefs.morning_card_enabled);
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [isHoveredSubmit, setIsHoveredSubmit] = useState(false);
  const [isActiveSubmit, setIsActiveSubmit] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    let h = parseInt(hour, 10);
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    const hhmm = `${h.toString().padStart(2, '0')}:${minute}`;

    try {
      await saveUserPrefs({
        morning_card_time: hhmm,
        timezone,
        morning_card_enabled: enabled,
      });
      setMessage({ type: 'success', text: 'Preferences saved' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    }
    
    setIsSaving(false);
  };

  const inputStyles = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color: '#F0EFF8',
    padding: '10px 14px',
    fontSize: '15px',
    outline: 'none',
    cursor: 'pointer'
  };

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
          Settings
        </h1>
        <p style={{
          fontSize: '15px',
          color: '#6B6882',
          marginTop: '10px',
          fontFamily: 'Inter',
          margin: '10px 0 0 0'
        }}>
          Manage your morning digest and preferences.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Morning Digest Section */}
        <section style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          animation: 'fadeSlideUp 0.4s ease forwards'
        }}>
          <div>
            <h2 className="font-heading" style={{ fontSize: '18px', fontWeight: 700, color: '#F0EFF8', margin: 0 }}>Morning Card</h2>
            <p style={{ fontSize: '14px', color: '#6B6882', marginTop: '6px', marginBottom: 0 }}>
              Receive a daily email summarizing your top incomplete tasks.
            </p>
          </div>

          {/* Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: '#C4C2D4' }}>Enable daily morning card email</span>
            <button 
              type="button" 
              role="switch" 
              aria-checked={enabled}
              onClick={() => setEnabled(!enabled)}
              style={{
                position: 'relative',
                display: 'inline-flex',
                height: '24px',
                width: '44px',
                flexShrink: 0,
                cursor: 'pointer',
                borderRadius: '9999px',
                border: '2px solid transparent',
                transition: 'background-color 0.3s ease-in-out',
                background: enabled ? '#7B6EF6' : 'rgba(255,255,255,0.1)'
              }}
            >
              <span 
                aria-hidden="true" 
                style={{
                  pointerEvents: 'none',
                  display: 'inline-block',
                  height: '20px',
                  width: '20px',
                  borderRadius: '50%',
                  background: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'transform 0.3s ease-in-out',
                  transform: enabled ? 'translateX(20px)' : 'translateX(0)'
                }}
              />
            </button>
          </div>

          {/* Time Settings */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '24px',
            transition: 'all 0.3s ease',
            opacity: enabled ? 1 : 0.5,
            pointerEvents: enabled ? 'auto' : 'none',
            filter: enabled ? 'none' : 'grayscale(100%)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#6B6882', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Digest Time
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select 
                  value={hour} 
                  onChange={e => setHour(e.target.value)}
                  style={inputStyles}
                >
                  {HOURS.map(h => <option key={h} value={h} style={{background: '#080810'}}>{h}</option>)}
                </select>
                <span style={{ color: '#6B6882', fontWeight: 700 }}>:</span>
                <select 
                  value={minute} 
                  onChange={e => setMinute(e.target.value)}
                  style={inputStyles}
                >
                  {MINUTES.map(m => <option key={m} value={m} style={{background: '#080810'}}>{m}</option>)}
                </select>
                <select 
                  value={ampm} 
                  onChange={e => setAmpm(e.target.value)}
                  style={{ ...inputStyles, marginLeft: '8px' }}
                >
                  {AMPM.map(a => <option key={a} value={a} style={{background: '#080810'}}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#6B6882', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Timezone
              </label>
              <select 
                value={timezone} 
                onChange={e => setTimezone(e.target.value)}
                style={{ ...inputStyles, width: '100%', maxWidth: '300px' }}
              >
                {TIMEZONES.map(tz => <option key={tz} value={tz} style={{background: '#080810'}}>{tz}</option>)}
              </select>
            </div>
          </div>

        </section>

        {/* Save Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            onMouseEnter={() => setIsHoveredSubmit(true)}
            onMouseLeave={() => { setIsHoveredSubmit(false); setIsActiveSubmit(false); }}
            onMouseDown={() => setIsActiveSubmit(true)}
            onMouseUp={() => setIsActiveSubmit(false)}
            className="font-heading"
            style={{
              padding: '0 32px',
              height: '54px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6C5FE6 0%, #4ECDC4 100%)',
              color: 'white',
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '0.01em',
              border: 'none',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.5 : 1,
              boxShadow: (!isSaving && isHoveredSubmit) ? '0 0 30px rgba(108,95,230,0.45), 0 8px 25px rgba(108,95,230,0.3)' : 'none',
              transform: (!isSaving && isActiveSubmit) ? 'translateY(0px)' : ((!isSaving && isHoveredSubmit) ? 'translateY(-1px)' : 'none'),
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>

          {message && (
            <span style={{ 
              fontSize: '15px', 
              fontWeight: 500, 
              color: message.type === 'success' ? '#2DD4BF' : '#F87171',
              animation: 'fadeSlideUp 0.3s ease forwards'
            }}>
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
