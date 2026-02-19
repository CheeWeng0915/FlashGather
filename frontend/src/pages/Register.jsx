import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

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

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
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
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          setError(data.errors[0].msg || 'Registration failed.');
        } else {
          setError(data.error || 'Registration failed.');
        }
        return;
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      setSuccess('Account created successfully. Redirecting to login...');

      setTimeout(() => {
        navigate('/login');
      }, 900);
    } catch (requestError) {
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
            />
            <button
              type="button"
              className="login-toggle"
              onClick={() => setShowPassword((value) => !value)}
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
            />
            <button
              type="button"
              className="login-toggle"
              onClick={() => setShowConfirmPassword((value) => !value)}
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
      </div>
    </section>
  );
}
