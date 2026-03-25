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

export default function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (hasStoredUserSession()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLoading) {
      return;
    }

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    setError('');
    setSuccess('');

    if (!normalizedUsername || !normalizedEmail || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (normalizedUsername.length < 2) {
      setError('Username must be at least 2 characters.');
      return;
    }

    if (!normalizedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: normalizedUsername,
          email: normalizedEmail,
          password
        })
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : null;

      if (!response.ok) {
        setError(getErrorMessage(data, 'Registration failed.'));
        return;
      }

      // Registration should send the user to the login screen, not leave behind
      // a partial session that makes the auth flow inconsistent.
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);

      setSuccess('Account created successfully. Redirecting to login...');
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 900);
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
          <p className="login-kicker">New account</p>
          <h1 className="login-title">Create your FlashGather account</h1>
          <p className="login-subtitle">Register to start creating and joining events.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label" htmlFor="username">
            Username
          </label>
          <div className="login-input-wrap">
            <input
              className="login-input"
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="yourname"
              autoComplete="username"
              required
              disabled={isLoading}
            />
          </div>

          <label className="login-label" htmlFor="email">
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

          <label className="login-label" htmlFor="password">
            Password
          </label>
          <div className="login-input-wrap">
            <input
              className="login-input"
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
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

          <label className="login-label" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <div className="login-input-wrap">
            <input
              className="login-input"
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              className="login-toggle"
              onClick={() => setShowConfirmPassword((value) => !value)}
              disabled={isLoading}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error ? <p className="login-error">{error}</p> : null}
          {success ? <p className="login-success">{success}</p> : null}

          <button type="submit" disabled={isLoading} className="login-submit">
            {isLoading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="login-subtitle">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </section>
  );
}
