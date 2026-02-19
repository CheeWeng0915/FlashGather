import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          setError(data.errors[0].msg || 'Login failed.');
        } else {
          setError(data.error || 'Login failed.');
        }
        return;
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      navigate('/');
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
            />
            <button
              type="button"
              className="login-toggle"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error ? <p className="login-error">{error}</p> : null}

          <button type="submit" disabled={isLoading} className="login-submit">
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </section>
  );
}
