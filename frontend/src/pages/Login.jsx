import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import './Login.css';

const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'currentUser';

const getErrorMessage = (payload, fallbackMessage) => {
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    return payload.errors[0]?.msg || fallbackMessage;
  }

  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  return fallbackMessage;
};

const hasStoredUserSession = () => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const storedUser = localStorage.getItem(USER_STORAGE_KEY);

  if (!token || !storedUser) {
    return false;
  }

  try {
    const parsedUser = JSON.parse(storedUser);
    return Boolean(parsedUser?.id || parsedUser?.email || parsedUser?.username);
  } catch {
    return false;
  }
};

export default function Login() {
  const navigate = useNavigate();
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
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
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
      setError('Please enter both email and password.');
      return;
    }

    if (!normalizedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password })
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : null;

      if (!response.ok) {
        setError(getErrorMessage(data, 'Login failed.'));
        return;
      }

      if (!data?.token) {
        setError('Login succeeded but no token was returned.');
        return;
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);

      if (data.user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }

      setSuccess('Login successful. Redirecting...');
      setEmail('');
      setPassword('');

      window.setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);
    } catch {
      setError('Cannot connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="login-page">
      <div className="login-card">
        <div className="login-top">
          <p className="login-kicker">Welcome back</p>
          <h1 className="login-title">Sign in to FlashGather</h1>
          <p className="login-subtitle">Use your account to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="email" className="login-label">
            Email
          </label>
          <div className="login-input-wrap">
            <input
              className="login-input"
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>

          <label htmlFor="password" className="login-label">
            Password
          </label>
          <div className="login-input-wrap">
            <input
              className="login-input"
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
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
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error ? <p className="login-error">{error}</p> : null}
          {success ? <p className="login-success">{success}</p> : null}

          <button type="submit" disabled={isLoading} className="login-submit">
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p className="login-subtitle">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </section>
  );
}
