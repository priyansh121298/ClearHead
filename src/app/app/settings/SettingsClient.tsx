'use client';

import { useState } from 'react';
import { type UserPrefs, saveUserPrefs, deleteAccount, changePassword } from './actions';
import Link from 'next/link';

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

export default function SettingsClient({ initialPrefs, email, provider }: { initialPrefs: UserPrefs, email: string, provider: string }) {
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
  const [username, setUsername] = useState(initialPrefs.username || '');
  const [enabled, setEnabled] = useState(initialPrefs.morning_card_enabled);
  const [weeklyEnabled, setWeeklyEnabled] = useState(initialPrefs.weekly_report_enabled);
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [isHoveredSubmit, setIsHoveredSubmit] = useState(false);
  const [isActiveSubmit, setIsActiveSubmit] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    let h = parseInt(hour, 10);
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    const hhmm = `${h.toString().padStart(2, '0')}:${minute}`;

    try {
      await saveUserPrefs({
        username,
        morning_card_time: hhmm,
        timezone,
        morning_card_enabled: enabled,
      });
      setMessage({ type: 'success', text: 'Preferences saved' });
      setMessage({ type: 'success', text: 'Username updated' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    }
    
    setIsSaving(false);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      alert('Failed to delete account.');
      setIsDeleting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }
    
    setIsUpdatingPassword(true);
    setPasswordMessage(null);
    
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res.error) {
        setPasswordMessage({ type: 'error', text: res.error });
      } else {
        setPasswordMessage({ type: 'success', text: 'Password updated' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setPasswordMessage(null);
          setShowPasswordChange(false);
        }, 2000);
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: 'An unexpected error occurred' });
    }
    
    setIsUpdatingPassword(false);
  };

  const handleExportData = () => {
    window.location.href = '/api/export-data';
  };

  const inputStyles = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color: '#F0EFF8',
    padding: '10px 14px',
    fontSize: '15px',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  const inputHoverClass = "hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)] focus:border-[#7B6EF6] focus:bg-[rgba(255,255,255,0.06)]";

  const sectionStyles = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '16px',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '32px',
    animation: 'fadeSlideUp 0.4s ease forwards'
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
          Manage your account, notifications, and data.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* ACCOUNT SECTION */}
        <section style={sectionStyles}>
          <div>
            <h2 className="font-heading" style={{ fontSize: '18px', fontWeight: 700, color: '#F0EFF8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 500, color: '#C4C2D4' }}>Username</span>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                maxLength={30}
                spellCheck={false}
                style={{ ...inputStyles, width: '200px', textAlign: 'right', cursor: 'text' }} 
                className={inputHoverClass}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 500, color: '#C4C2D4' }}>Email Address</span>
              <span style={{ fontSize: '15px', color: '#8E8BA8' }}>{email}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 500, color: '#C4C2D4' }}>Sign-in Method</span>
              <span style={{ fontSize: '15px', color: '#8E8BA8', textTransform: 'capitalize' }}>
                {provider === 'google' ? 'Google OAuth' : 'Email/Password'}
              </span>
            </div>
            
            {/* Change Password Section */}
            {provider === 'google' ? (
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '8px' }}>
                <p style={{ color: '#8E8BA8', fontSize: '14px', margin: 0 }}>
                  You're signed in with Google - password changes aren't applicable to your account.
                </p>
              </div>
            ) : (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '24px', marginTop: '8px' }}>
                {!showPasswordChange ? (
                  <button 
                    onClick={() => setShowPasswordChange(true)}
                    style={{ background: 'transparent', color: '#C4C2D4', padding: '8px 0', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    className="hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] transition-all duration-300"
                  >
                    Change Password
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '15px', fontWeight: 500, color: '#C4C2D4' }}>Change Password</span>
                      <button 
                        onClick={() => {
                          setShowPasswordChange(false);
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                          setPasswordMessage(null);
                        }}
                        style={{ background: 'transparent', color: '#8E8BA8', border: 'none', cursor: 'pointer', fontSize: '13px' }}
                        className="hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] transition-all duration-300"
                      >
                        Cancel
                      </button>
                    </div>
                    
                    <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <input 
                        type="password" 
                        placeholder="Current Password" 
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                        style={{ ...inputStyles, cursor: 'text' }} 
                        className={inputHoverClass}
                      />
                      <input 
                        type="password" 
                        placeholder="New Password (min 8 chars)" 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        style={{ ...inputStyles, cursor: 'text' }} 
                        className={inputHoverClass}
                      />
                      <input 
                        type="password" 
                        placeholder="Confirm New Password" 
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        style={{ ...inputStyles, cursor: 'text' }} 
                        className={inputHoverClass}
                      />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                        <button 
                          type="submit"
                          disabled={isUpdatingPassword}
                          style={{ background: 'rgba(255,255,255,0.08)', color: '#FFF', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: isUpdatingPassword ? 'not-allowed' : 'pointer', opacity: isUpdatingPassword ? 0.7 : 1 }}
                          className="hover:bg-[rgba(255,255,255,0.15)] hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:-translate-y-[1px] transition-all duration-200 active:scale-95"
                        >
                          {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                        </button>
                        {passwordMessage && (
                          <span style={{ fontSize: '14px', color: passwordMessage.type === 'success' ? '#2DD4BF' : '#F87171' }}>
                            {passwordMessage.text}
                          </span>
                        )}
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '24px' }}>
            {showDeleteConfirm ? (
              <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', padding: '16px', borderRadius: '12px' }}>
                <p style={{ color: '#F87171', fontSize: '14px', marginBottom: '16px', fontWeight: 500 }}>
                  Are you absolutely sure? This will permanently delete your account, all your dumps, tasks, and preferences. This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    style={{ background: '#F87171', color: '#000', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                    className="hover:bg-[#fca5a5] hover:shadow-[0_0_15px_rgba(248,113,113,0.3)] hover:-translate-y-[1px] transition-all duration-200 active:scale-95"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    style={{ background: 'transparent', color: '#C4C2D4', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                    className="hover:border-[rgba(255,255,255,0.4)] hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                style={{ background: 'transparent', color: '#F87171', padding: '8px 0', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                className="hover:text-[#fca5a5] hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.8)] transition-all duration-300"
              >
                Delete my account
              </button>
            )}
          </div>
        </section>

        {/* NOTIFICATIONS & SCHEDULING SECTION */}
        <section style={{...sectionStyles, animationDelay: '0.1s'}}>
          <div>
            <h2 className="font-heading" style={{ fontSize: '18px', fontWeight: 700, color: '#F0EFF8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notifications & Scheduling</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Morning Card Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '15px', fontWeight: 500, color: '#C4C2D4', display: 'block' }}>Morning Card</span>
                <span style={{ fontSize: '13px', color: '#8E8BA8' }}>Receive a daily email summarizing your top tasks</span>
              </div>
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
                  transition: 'background-color 0.3s ease-in-out, box-shadow 0.3s ease',
                  background: enabled ? '#7B6EF6' : 'rgba(255,255,255,0.1)'
                }}
                className={enabled ? "hover:shadow-[0_0_15px_rgba(123,110,246,0.4)]" : "hover:bg-[rgba(255,255,255,0.15)]"}
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
                    className={inputHoverClass}
                  >
                    {HOURS.map(h => <option key={h} value={h} style={{background: '#080810'}}>{h}</option>)}
                  </select>
                  <span style={{ color: '#6B6882', fontWeight: 700 }}>:</span>
                  <select 
                    value={minute} 
                    onChange={e => setMinute(e.target.value)}
                    style={inputStyles}
                    className={inputHoverClass}
                  >
                    {MINUTES.map(m => <option key={m} value={m} style={{background: '#080810'}}>{m}</option>)}
                  </select>
                  <select 
                    value={ampm} 
                    onChange={e => setAmpm(e.target.value)}
                    style={{ ...inputStyles, marginLeft: '8px' }}
                    className={inputHoverClass}
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
                  className={inputHoverClass}
                >
                  {TIMEZONES.map(tz => <option key={tz} value={tz} style={{background: '#080810'}}>{tz}</option>)}
                </select>
              </div>
            </div>

            {/* Weekly Report Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '32px' }}>
              <div>
                <span style={{ fontSize: '15px', fontWeight: 500, color: '#C4C2D4', display: 'block' }}>Weekly Report</span>
                <span style={{ fontSize: '13px', color: '#8E8BA8' }}>Receive a weekly synthesis of your mental clarity</span>
              </div>
              <button 
                type="button" 
                role="switch" 
                aria-checked={weeklyEnabled}
                onClick={() => setWeeklyEnabled(!weeklyEnabled)}
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
                  background: weeklyEnabled ? '#7B6EF6' : 'rgba(255,255,255,0.1)'
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
                    transform: weeklyEnabled ? 'translateX(20px)' : 'translateX(0)'
                  }}
                />
              </button>
            </div>
          </div>
        </section>

        {/* DATA & PRIVACY SECTION */}
        <section style={{...sectionStyles, animationDelay: '0.2s'}}>
          <div>
            <h2 className="font-heading" style={{ fontSize: '18px', fontWeight: 700, color: '#F0EFF8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data & Privacy</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 500, color: '#C4C2D4' }}>Export my data</span>
              <button 
                onClick={handleExportData}
                style={{ background: 'rgba(255,255,255,0.04)', color: '#F0EFF8', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                className="hover:bg-[rgba(255,255,255,0.08)] hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:-translate-y-[1px] transition-all duration-200 active:scale-95"
              >
                Download JSON
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '24px', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '24px' }}>
              <Link href="/privacy" className="text-sm text-[#7B6EF6] hover:text-[#2DD4BF] hover:drop-shadow-[0_0_8px_rgba(123,110,246,0.6)] transition-all duration-300 font-medium">Privacy Policy</Link>
              <Link href="/terms" className="text-sm text-[#7B6EF6] hover:text-[#2DD4BF] hover:drop-shadow-[0_0_8px_rgba(123,110,246,0.6)] transition-all duration-300 font-medium">Terms & Conditions</Link>
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
              boxShadow: (!isSaving && isHoveredSubmit) ? '0 0 30px rgba(108,95,230,0.5), 0 8px 25px rgba(108,95,230,0.35)' : 'none',
              transform: (!isSaving && isActiveSubmit) ? 'scale(0.98)' : ((!isSaving && isHoveredSubmit) ? 'translateY(-2px) scale(1.01)' : 'none'),
              transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
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
