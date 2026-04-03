import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../pages/auth.css';
import api from '../utils/api';

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }) {
  const { login } = useAuth();
  const [mode, setMode] = useState(defaultMode);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [regForm, setRegForm] = useState({ username: '', email: '', password: '' });
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setVisible(true);
      setExiting(false);
      document.body.style.overflow = 'hidden';
    }
  }, [isOpen, defaultMode]);

  const handleClose = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      document.body.style.overflow = '';
      onClose();
      setLoginError('');
      setRegError('');
    }, 350);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  const switchMode = (m) => {
    setMode(m);
    setLoginError('');
    setRegError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await api.post('/auth/login', loginForm);
      login(res.data.token, res.data.user);
      handleClose();
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegLoading(true);
    try {
      const res = await api.post('/auth/register', regForm);
      login(res.data.token, res.data.user);
      handleClose();
    } catch (err) {
      setRegError(err.response?.data?.error || 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`am-overlay ${exiting ? 'am-overlay--exit' : 'am-overlay--enter'}`}
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`am-panel ${exiting ? 'am-panel--exit' : 'am-panel--enter'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="am-close" onClick={handleClose} aria-label="Close">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="am-brand">
          <div className="am-brand-orb" />
          <span className="am-brand-name">Orlune</span>
        </div>

        <div className="am-tabs">
          <button className={`am-tab ${mode === 'login' ? 'am-tab--active' : ''}`} onClick={() => switchMode('login')}>
            Sign In
          </button>
          <button className={`am-tab ${mode === 'register' ? 'am-tab--active' : ''}`} onClick={() => switchMode('register')}>
            Create Account
          </button>
          <div className={`am-tab-ink ${mode === 'register' ? 'am-tab-ink--right' : ''}`} />
        </div>

        <div className="am-body">
          {/* LOGIN PANEL */}
          <div className={`am-slide ${mode === 'login' ? 'am-slide--active' : 'am-slide--out-left'}`}>
            <div className="am-heading">
              <h2>Welcome back</h2>
              <p>Your cinematic universe awaits</p>
            </div>
            <form onSubmit={handleLogin} className="am-form">
              <div className="am-field">
                <label>Email</label>
                <div className="am-input-wrap">
                  <IconMail />
                  <input type="email" placeholder="you@example.com" value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required autoComplete="email" />
                </div>
              </div>
              <div className="am-field">
                <label>Password</label>
                <div className="am-input-wrap">
                  <IconLock />
                  <input type="password" placeholder="••••••••" value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required autoComplete="current-password" />
                </div>
              </div>
              {loginError && <div className="am-error">{loginError}</div>}
              <button type="submit" className="am-submit" disabled={loginLoading}>
                {loginLoading ? <Dots /> : 'Sign In'}
              </button>
            </form>
            <p className="am-footer-text">
              New here? <button className="am-link" onClick={() => switchMode('register')}>Create an account</button>
            </p>
          </div>

          {/* REGISTER PANEL */}
          <div className={`am-slide ${mode === 'register' ? 'am-slide--active' : 'am-slide--out-right'}`}>
            <div className="am-heading">
              <h2>Join Orlune</h2>
              <p>Begin your journey through cinema</p>
            </div>

            <div className="am-social-proof">
              <div className="am-faces">
                {['A','K','R','M','S'].map((l, i) => (
                  <div key={i} className="am-face" style={{ '--i': i }}>{l}</div>
                ))}
              </div>
              <span>500+ members · always free</span>
            </div>

            <form onSubmit={handleRegister} className="am-form">
              <div className="am-field">
                <label>Username</label>
                <div className="am-input-wrap">
                  <IconUser />
                  <input type="text" placeholder="Your name" value={regForm.username}
                    onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                    required autoComplete="username" />
                </div>
              </div>
              <div className="am-field">
                <label>Email</label>
                <div className="am-input-wrap">
                  <IconMail />
                  <input type="email" placeholder="you@example.com" value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    required autoComplete="email" />
                </div>
              </div>
              <div className="am-field">
                <label>Password</label>
                <div className="am-input-wrap">
                  <IconLock />
                  <input type="password" placeholder="Min 6 characters" value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    required minLength={6} autoComplete="new-password" />
                </div>
              </div>
              {regError && <div className="am-error">{regError}</div>}
              <button type="submit" className="am-submit" disabled={regLoading}>
                {regLoading ? <Dots /> : 'Join the Community'}
              </button>
            </form>
            <p className="am-footer-text">
              Already a member? <button className="am-link" onClick={() => switchMode('login')}>Sign in</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dots() {
  return <span className="am-dots"><span /><span /><span /></span>;
}

function IconMail() {
  return (
    <svg className="am-icon" viewBox="0 0 16 16" fill="none" width="14" height="14">
      <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 5.5l7 4.5 7-4.5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

function IconLock() {
  return (
    <svg className="am-icon" viewBox="0 0 16 16" fill="none" width="14" height="14">
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="8" cy="10.5" r="1" fill="currentColor"/>
    </svg>
  );
}

function IconUser() {
  return (
    <svg className="am-icon" viewBox="0 0 16 16" fill="none" width="14" height="14">
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}