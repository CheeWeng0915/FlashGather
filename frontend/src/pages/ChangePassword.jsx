import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import {
  clearStoredUserSession,
  getAuthHeaders,
  getStoredUser
} from '../utils/auth';
import { fetchWithTimeout, isAbortError } from '../utils/http';
import { useToast } from '../components/toastContext';
import './Profile.css';

const SESSION_ERROR_MESSAGES = new Set([
  'Authentication required',
  'Invalid or expired token'
]);

const getErrorMessage = (payload, fallbackMessage) => {
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    return payload.errors[0]?.msg || fallbackMessage;
  }

  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  return fallbackMessage;
};

const isSessionError = (payload) => SESSION_ERROR_MESSAGES.has(payload?.error);

const readJson = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : null;
};

const getInitials = (profile) => {
  const source = profile?.username || profile?.email || 'User';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
};

export default function ChangePassword() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const user = useMemo(() => getStoredUser(), []);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setFormError('');
    setFormSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      const message = 'Please complete all password fields.';
      setFormError(message);
      showToast({ type: 'error', title: 'Password Not Updated', message });
      return;
    }

    if (newPassword.length < 6) {
      const message = 'New password must be at least 6 characters.';
      setFormError(message);
      showToast({ type: 'error', title: 'Password Not Updated', message });
      return;
    }

    if (newPassword === currentPassword) {
      const message = 'New password must be different from your current password.';
      setFormError(message);
      showToast({ type: 'error', title: 'Password Not Updated', message });
      return;
    }

    if (newPassword !== confirmPassword) {
      const message = 'New password and confirmation do not match.';
      setFormError(message);
      showToast({ type: 'error', title: 'Password Not Updated', message });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetchWithTimeout(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      const data = await readJson(response);

      if (!response.ok) {
        if (isSessionError(data)) {
          clearStoredUserSession();
          showToast({
            type: 'error',
            title: 'Session Expired',
            message: 'Please sign in again to change your password.'
          });
          navigate('/login', { replace: true });
          return;
        }

        const message = getErrorMessage(data, 'Unable to update your password.');
        setFormError(message);
        showToast({ type: 'error', title: 'Password Not Updated', message });
        return;
      }

      const message = data?.message || 'Password updated successfully. Please sign in again.';
      setFormSuccess(message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      clearStoredUserSession();
      showToast({ type: 'success', title: 'Password Updated', message });
      navigate('/login', { replace: true });
    } catch (error) {
      const message = isAbortError(error)
        ? 'The server took too long to respond. Please try again.'
        : 'Unable to update your password right now.';
      setFormError(message);
      showToast({ type: 'error', title: 'Password Not Updated', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="profile-page">
      <div className="profile-shell">
        <div className="profile-hero">
          <div className="profile-hero-copy">
            <p className="profile-kicker">Security Center</p>
            <h1>Change Password</h1>
            <p>
              Update your password from this dedicated page, then sign in again
              with your new credentials.
            </p>
            <div className="profile-hero-actions">
              <Link to="/profile" className="profile-link-button profile-link-primary">
                Back to Profile
              </Link>
              <Link to="/" className="profile-link-button profile-link-secondary">
                Home
              </Link>
            </div>
          </div>

          <div className="profile-badge-card">
            <div className="profile-avatar" aria-hidden="true">
              {getInitials(user)}
            </div>
            <div>
              <p className="profile-badge-label">Signed in as</p>
              <p className="profile-badge-title">{user?.username || 'Current User'}</p>
              <p className="profile-badge-value">{user?.email || 'Account session active'}</p>
            </div>
          </div>
        </div>

        <div className="profile-grid">
          <article className="profile-panel profile-panel-security">
            <div className="profile-panel-header">
              <div>
                <p className="profile-section-kicker">Security</p>
                <h2>Update your password</h2>
              </div>
            </div>

            <p className="profile-panel-text">
              Enter your current password first, then choose a new one with at
              least 6 characters.
            </p>

            <form className="profile-form" onSubmit={handlePasswordSubmit}>
              <label className="profile-field" htmlFor="currentPassword">
                <span>Current password</span>
                <div className="profile-password-row">
                  <input
                    id="currentPassword"
                    className="profile-input"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    className="profile-toggle"
                    onClick={() => setShowCurrentPassword((value) => !value)}
                    disabled={isSubmitting}
                  >
                    {showCurrentPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <label className="profile-field" htmlFor="newPassword">
                <span>New password</span>
                <div className="profile-password-row">
                  <input
                    id="newPassword"
                    className="profile-input"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    className="profile-toggle"
                    onClick={() => setShowNewPassword((value) => !value)}
                    disabled={isSubmitting}
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <label className="profile-field" htmlFor="confirmPassword">
                <span>Confirm new password</span>
                <div className="profile-password-row">
                  <input
                    id="confirmPassword"
                    className="profile-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    className="profile-toggle"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              {formError ? (
                <p className="profile-message profile-message-error">{formError}</p>
              ) : null}
              {formSuccess ? (
                <p className="profile-message profile-message-success">{formSuccess}</p>
              ) : null}

              <button type="submit" className="profile-submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </article>
        </div>
      </div>
    </section>
  );
}
