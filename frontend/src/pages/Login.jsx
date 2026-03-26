import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import {
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  clearStoredUserSession,
  hasStoredUserSession
} from '../utils/auth';
import './Login.css';
import logo from '../assets/logo.jpg';
import { useToast } from '../components/ToastProvider';
import { fetchWithTimeout, isAbortError } from '../utils/http';

const getErrorMessage = (payload, fallbackMessage) => {
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    return payload.errors[0]?.msg || fallbackMessage;
  }

  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  return fallbackMessage;
};

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (hasStoredUserSession()) {
      navigate('/', { replace: true });
      return;
    }

    // Clean up stale token-only state so the login page stays usable.
    clearStoredUserSession();
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLoading) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    setError('');
    setSuccess('');

    if (!normalizedEmail || !password) {
      const message = 'Please enter both email and password.';
      setError(message);
      showToast({ type: 'error', title: 'Sign In Failed', message });
      return;
    }

    if (!normalizedEmail.includes('@')) {
      const message = 'Please enter a valid email address.';
      setError(message);
      showToast({ type: 'error', title: 'Sign In Failed', message });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetchWithTimeout(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password })
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : null;

      if (!response.ok) {
        const message = getErrorMessage(data, 'Login failed.');
        setError(message);
        showToast({ type: 'error', title: 'Sign In Failed', message });
        return;
      }

      if (!data?.token) {
        const message = 'Login succeeded but no token was returned.';
        setError(message);
        showToast({ type: 'error', title: 'Sign In Failed', message });
        return;
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);

      if (data.user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }

      setSuccess('Login successful. Redirecting...');
      showToast({
        type: 'success',
        title: 'Signed In',
        message: 'Welcome back to FlashGather.'
      });
      setEmail('');
      setPassword('');

      window.setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);
    } catch (error) {
      const message = isAbortError(error)
        ? 'The server is taking too long to respond. If Render is waking up, wait a few seconds and try again.'
        : 'Cannot connect to server. Please try again.';
      setError(message);
      showToast({ type: 'error', title: 'Sign In Failed', message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="login-page">
      <div className="login-shell">
        <aside className="login-side">
          <div className="login-brand">
            <img className="login-brand-mark" src={logo} alt="FlashGather logo" />
            <span>FlashGather</span>
          </div>

          <div className="login-side-copy">
            <p className="login-side-kicker">New around here?</p>
            <h1 className="login-side-title">Join the Crew</h1>
            <p className="login-side-text">
              Create your account to plan events, gather friends, and keep
              every meetup in one place.
            </p>
          </div>

          <Link to="/register" className="login-side-button">
            Sign Up
          </Link>
        </aside>

        <div className="login-card">
          <div className="login-card-inner">
            <header className="login-header">
              <p className="login-title">Sign In</p>
            </header>

            <form onSubmit={handleSubmit} className="login-form">
              <label className="login-field" htmlFor="email">
                <span className="login-field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 6h16v12H4V6zm0 0l8 6 8-6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  className="login-input"
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                />
              </label>

              <label className="login-field" htmlFor="password">
                <span className="login-field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 11V8a5 5 0 1110 0v3m-9 0h8a2 2 0 012 2v5H6v-5a2 2 0 012-2z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  className="login-input"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="login-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={isLoading}
                >
                  {showPassword ? '👁' : '⌣'}
                </button>
              </label>

              {error ? <p className="login-message login-error">{error}</p> : null}
              {success ? <p className="login-message login-success">{success}</p> : null}

              <button type="submit" disabled={isLoading} className="login-submit">
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
