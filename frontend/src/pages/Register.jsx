import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { clearStoredUserSession, hasStoredUserSession } from '../utils/auth';
import './Register.css';
import logo from '../assets/logo.jpg';
import { useToast } from '../components/toastContext';
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

export default function Register() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

    if (!normalizedUsername || !normalizedEmail || !password) {
      const message = 'Please fill in all fields.';
      setError(message);
      showToast({ type: 'error', title: 'Sign Up Failed', message });
      return;
    }

    if (normalizedUsername.length < 2) {
      const message = 'Username must be at least 2 characters.';
      setError(message);
      showToast({ type: 'error', title: 'Sign Up Failed', message });
      return;
    }

    if (!normalizedEmail.includes('@')) {
      const message = 'Please enter a valid email address.';
      setError(message);
      showToast({ type: 'error', title: 'Sign Up Failed', message });
      return;
    }

    if (password.length < 6) {
      const message = 'Password must be at least 6 characters.';
      setError(message);
      showToast({ type: 'error', title: 'Sign Up Failed', message });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetchWithTimeout(`${API_BASE}/auth/register`, {
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
        const message = getErrorMessage(data, 'Registration failed.');
        setError(message);
        showToast({ type: 'error', title: 'Sign Up Failed', message });
        return;
      }

      // Registration should send the user to the login screen, not leave behind
      // a partial session that makes the auth flow inconsistent.
      clearStoredUserSession();

      setSuccess('Account created successfully. Redirecting to login...');
      showToast({
        type: 'success',
        title: 'Account Created',
        message: 'Your account is ready. Please sign in.'
      });
      setUsername('');
      setEmail('');
      setPassword('');

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 900);
    } catch (error) {
      const message = isAbortError(error)
        ? 'The server is taking too long to respond. If Render is waking up, wait a few seconds and try again.'
        : 'Cannot connect to server. If you are running locally, make sure the backend is running and MongoDB is reachable.';
      setError(message);
      showToast({ type: 'error', title: 'Sign Up Failed', message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="register-page">
      <div className="register-shell">
        <aside className="register-side">
          <div className="register-brand">
            <img className="register-brand-mark" src={logo} alt="Flash Gather logo" />
            <span>FlashGather</span>
          </div>

          <div className="register-side-copy">
            <p className="register-side-kicker">Already with us?</p>
            <h1 className="register-side-title">Welcome Back!</h1>
            <p className="register-side-text">
              To keep connected with your crew, log in with your personal info
              and jump back into your next event.
            </p>
          </div>

          <Link to="/login" className="register-side-button">
            Sign In
          </Link>
        </aside>

        <div className="register-card">
          <div className="register-card-inner">
            <header className="register-header">
              <p className="register-title">Create Account</p>
            </header>

            <form onSubmit={handleSubmit} className="register-form">
              <label className="register-field" htmlFor="username">
                <span className="register-field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  className="register-input"
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Name"
                  autoComplete="username"
                  required
                  disabled={isLoading}
                />
              </label>

              <label className="register-field" htmlFor="email">
                <span className="register-field-icon" aria-hidden="true">
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
                  className="register-input"
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

              <label className="register-field" htmlFor="password">
                <span className="register-field-icon" aria-hidden="true">
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
                  className="register-input"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="register-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isLoading}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </label>

              {error ? <p className="register-message register-error">{error}</p> : null}
              {success ? <p className="register-message register-success">{success}</p> : null}

              <button type="submit" disabled={isLoading} className="register-submit">
                {isLoading ? 'Creating...' : 'Sign Up'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
