import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../pages/auth.css';
import api from '../utils/api';

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }) {
  const { login } = useAuth();
  
  // Modes: 'login', 'register', 'register-otp', 'forgot-password', 'forgot-password-otp'
  const [mode, setMode] = useState(defaultMode);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Form Data
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ username: '', email: '', password: '', otp: '' });
  const [forgotForm, setForgotForm] = useState({ email: '', otp: '', newPassword: '' });

  // State
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setVisible(true);
      setExiting(false);
      document.body.style.overflow = 'hidden';
      // RESET forms
      setLoginForm({ email: '', password: '' });
      setRegForm({ username: '', email: '', password: '', otp: '' });
      setForgotForm({ email: '', otp: '', newPassword: '' });
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, defaultMode]);

  const handleClose = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      document.body.style.overflow = '';
      onClose();
      setError('');
      setSuccessMsg('');
    }, 350);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setSuccessMsg('');
  };

  /* ----- API HANDLERS ----- */

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/login', loginForm);
      login(res.data.token, res.data.user);
      handleClose();
    } catch (err) {
      const errorData = err.response?.data?.error || err.message || 'Invalid credentials';
      setError(typeof errorData === 'object' ? JSON.stringify(errorData) : String(errorData));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRegOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/register/request-otp', { email: regForm.email });
      switchMode('register-otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRegister = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/register/verify', regForm);
      login(res.data.token, res.data.user);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/forgot-password/request-otp', { email: forgotForm.email });
      switchMode('forgot-password-otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/forgot-password/reset', forgotForm);
      setSuccessMsg("Password updated! You can now login.");
      setTimeout(() => switchMode('login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className={`am-overlay ${exiting ? 'am-overlay--exit' : 'am-overlay--enter'}`} onClick={handleClose} aria-modal="true" role="dialog">
      <div className={`am-panel ${exiting ? 'am-panel--exit' : 'am-panel--enter'}`} onClick={(e) => e.stopPropagation()}>
        <button className="am-close" onClick={handleClose} aria-label="Close">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>

        <div className="am-brand">
          <div className="am-brand-orb" />
          <span className="am-brand-name">Orlune</span>
        </div>

        {/* ONLY SHOW TABS IF NOT IN OTP OR FORGOT PASSWORD STEPS */}
        {(mode === 'login' || mode === 'register') && (
          <div className="am-tabs">
            <button className={`am-tab ${mode === 'login' ? 'am-tab--active' : ''}`} onClick={() => switchMode('login')}>Sign In</button>
            <button className={`am-tab ${mode === 'register' ? 'am-tab--active' : ''}`} onClick={() => switchMode('register')}>Create Account</button>
            <div className={`am-tab-ink ${mode === 'register' ? 'am-tab-ink--right' : ''}`} />
          </div>
        )}

        <div className="am-body" style={{ minHeight: '300px' }}>
          
          {/* LOGIN */}
          {mode === 'login' && (
            <div className="am-slide am-slide--active">
              <div className="am-heading">
                <h2>Welcome back</h2><p>Your cinematic universe awaits</p>
              </div>
              {successMsg && <div className="am-success" style={{color: '#a3be8c', marginBottom: 15, fontSize: 13, background: 'rgba(163,190,140,0.1)', padding: 10, borderRadius: 6}}>{successMsg}</div>}
              <form onSubmit={handleLogin} className="am-form">
                <div className="am-field">
                  <label>Email</label>
                  <div className="am-input-wrap">
                    <IconMail />
                    <input type="email" placeholder="you@example.com" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required />
                  </div>
                </div>
                <div className="am-field">
                  <label>Password</label>
                  <div className="am-input-wrap">
                    <IconLock />
                    <input type="password" placeholder="••••••••" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '15px' }}>
                    <button type="button" className="am-link" style={{fontSize: '12px'}} onClick={() => switchMode('forgot-password')}>Forgot password?</button>
                </div>
                {error && <div className="am-error">{error}</div>}
                <button type="submit" className="am-submit" disabled={loading}>{loading ? <Dots /> : 'Sign In'}</button>
              </form>
              <p className="am-footer-text">New here? <button className="am-link" onClick={() => switchMode('register')}>Create an account</button></p>
            </div>
          )}

          {/* REGISTER STEP 1 */}
          {mode === 'register' && (
            <div className="am-slide am-slide--active">
              <div className="am-heading">
                <h2>Join Orlune</h2><p>Begin your journey through cinema</p>
              </div>
              <form onSubmit={handleRequestRegOtp} className="am-form">
                <div className="am-field">
                  <label>Username</label>
                  <div className="am-input-wrap"><IconUser /><input type="text" placeholder="Your name" value={regForm.username} onChange={(e) => setRegForm({ ...regForm, username: e.target.value })} required /></div>
                </div>
                <div className="am-field">
                  <label>Email</label>
                  <div className="am-input-wrap"><IconMail /><input type="email" placeholder="you@example.com" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} required /></div>
                </div>
                <div className="am-field">
                  <label>Choose Password</label>
                  <div className="am-input-wrap"><IconLock /><input type="password" placeholder="Min 6 characters" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} required minLength={6} /></div>
                </div>
                {error && <div className="am-error">{error}</div>}
                <button type="submit" className="am-submit" disabled={loading}>{loading ? <Dots /> : 'Send Verification OTP'}</button>
              </form>
            </div>
          )}

          {/* REGISTER STEP 2 (OTP) */}
          {mode === 'register-otp' && (
            <div className="am-slide am-slide--active">
              <div className="am-heading"><h2>Check your email</h2><p>We've sent a 6-digit code to {regForm.email}</p></div>
              <form onSubmit={handleVerifyRegister} className="am-form">
                <div className="am-field">
                  <label>Verification Code</label>
                  <div className="am-input-wrap">
                    <input type="text" placeholder="123456" maxLength={6} style={{letterSpacing: '5px', textAlign: 'center', fontSize: '20px', paddingLeft: '15px'}} value={regForm.otp} onChange={(e) => setRegForm({ ...regForm, otp: e.target.value })} required />
                  </div>
                </div>
                {error && <div className="am-error">{error}</div>}
                <button type="submit" className="am-submit" disabled={loading}>{loading ? <Dots /> : 'Verify & Create Account'}</button>
              </form>
              <button className="am-link" style={{display: 'block', margin: '20px auto 0'}} onClick={() => switchMode('register')}>← Back</button>
            </div>
          )}

          {/* FORGOT PASSWORD STEP 1 */}
          {mode === 'forgot-password' && (
            <div className="am-slide am-slide--active">
              <div className="am-heading"><h2>Reset Password</h2><p>Enter your email to receive a secure OTP</p></div>
              <form onSubmit={handleForgotOtp} className="am-form">
                <div className="am-field">
                  <label>Email</label>
                  <div className="am-input-wrap"><IconMail /><input type="email" placeholder="you@example.com" value={forgotForm.email} onChange={(e) => setForgotForm({ ...forgotForm, email: e.target.value })} required /></div>
                </div>
                {error && <div className="am-error">{error}</div>}
                <button type="submit" className="am-submit" disabled={loading}>{loading ? <Dots /> : 'Send Reset OTP'}</button>
              </form>
              <button className="am-link" style={{display: 'block', margin: '20px auto 0'}} onClick={() => switchMode('login')}>← Back to Login</button>
            </div>
          )}

          {/* FORGOT PASSWORD STEP 2 (OTP & NEW PASSWORD) */}
          {mode === 'forgot-password-otp' && (
            <div className="am-slide am-slide--active">
              <div className="am-heading"><h2>Create New Password</h2><p>OTP sent to {forgotForm.email}</p></div>
              <form onSubmit={handleResetPassword} className="am-form">
                <div className="am-field">
                  <label>Verification Code</label>
                  <div className="am-input-wrap">
                    <input type="text" placeholder="123456" maxLength={6} style={{letterSpacing: '5px', textAlign: 'center', fontSize: '20px', paddingLeft: '15px'}} value={forgotForm.otp} onChange={(e) => setForgotForm({ ...forgotForm, otp: e.target.value })} required />
                  </div>
                </div>
                <div className="am-field">
                  <label>New Password</label>
                  <div className="am-input-wrap"><IconLock /><input type="password" placeholder="Min 6 characters" value={forgotForm.newPassword} onChange={(e) => setForgotForm({ ...forgotForm, newPassword: e.target.value })} required minLength={6} /></div>
                </div>
                {error && <div className="am-error">{error}</div>}
                <button type="submit" className="am-submit" disabled={loading}>{loading ? <Dots /> : 'Update Password'}</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Dots() { return <span className="am-dots"><span /><span /><span /></span>; }
function IconMail() { return <svg className="am-icon" viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M1 5.5l7 4.5 7-4.5" stroke="currentColor" strokeWidth="1.2"/></svg>; }
function IconLock() { return <svg className="am-icon" viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="10.5" r="1" fill="currentColor"/></svg>; }
function IconUser() { return <svg className="am-icon" viewBox="0 0 16 16" fill="none" width="14" height="14"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.2"/><path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>; }