import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import {
  clearStoredUserSession,
  getAuthHeaders,
  setStoredUser
} from '../utils/auth';
import { formatDisplayDate } from '../utils/dateDisplay';
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

const formatDate = (value) => {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return formatDisplayDate(date);
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

function DetailRow({ label, value }) {
  return (
    <div className="profile-detail-row">
      <dt>{label}</dt>
      <dd>{value || 'Not available'}</dd>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const response = await fetchWithTimeout(`${API_BASE}/auth/me`, {
          headers: getAuthHeaders()
        });
        const data = await readJson(response);

        if (!response.ok) {
          if (isSessionError(data)) {
            clearStoredUserSession();
            if (isActive) {
              showToast({
                type: 'error',
                title: 'Session Expired',
                message: 'Please sign in again to continue.'
              });
              navigate('/login', { replace: true });
            }
            return;
          }

          throw new Error(getErrorMessage(data, 'Unable to load your profile.'));
        }

        if (!data?.user) {
          throw new Error('Unable to load your profile.');
        }

        if (!isActive) {
          return;
        }

        setProfile(data.user);
        setStoredUser(data.user);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message = isAbortError(error)
          ? 'The server took too long to respond. Please try again.'
          : error.message || 'Unable to load your profile.';
        setLoadError(message);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [navigate, showToast]);

  return (
    <section className="profile-page">
      <div className="profile-shell">
        <div className="profile-hero">
          <div className="profile-hero-copy">
            <p className="profile-kicker">Account Center</p>
            <h1>Profile</h1>
            <p>
              Review your account details and keep your profile information in
              one place.
            </p>
            <div className="profile-hero-actions">
              <Link to="/" className="profile-link-button profile-link-primary">
                Back to Home
              </Link>
              <button
                type="button"
                className="profile-link-button profile-link-secondary"
                onClick={() => window.location.reload()}
              >
                Refresh Profile
              </button>
            </div>
          </div>

          <div className="profile-badge-card">
            <div className="profile-avatar" aria-hidden="true">
              {getInitials(profile)}
            </div>
            <div>
              <p className="profile-badge-label">Signed in as</p>
              <p className="profile-badge-title">{profile?.username || 'Loading...'}</p>
              <p className="profile-badge-value">{profile?.email || 'Fetching account data'}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="profile-state-card">
            <div className="profile-spinner" aria-hidden="true"></div>
            <p>Loading your profile...</p>
          </div>
        ) : null}

        {!isLoading && loadError ? (
          <div className="profile-state-card profile-state-error">
            <h2>Unable to load profile</h2>
            <p>{loadError}</p>
            <button
              type="button"
              className="profile-submit"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        ) : null}

        {!isLoading && !loadError && profile ? (
          <div className="profile-grid">
            <article className="profile-panel profile-panel-details">
              <div className="profile-panel-header">
                <div>
                  <p className="profile-section-kicker">User Detail</p>
                  <h2>Account information</h2>
                </div>
                <span className="profile-pill">Active Account</span>
              </div>

              <dl className="profile-details">
                <DetailRow label="Username" value={profile.username} />
                <DetailRow label="Email" value={profile.email} />
                <DetailRow
                  label="Role"
                  value={profile.role === 'admin' ? 'Admin' : 'Member'}
                />
                <DetailRow label="Member since" value={formatDate(profile.createdAt)} />
                <DetailRow label="Last updated" value={formatDate(profile.updatedAt)} />
              </dl>
            </article>
          </div>
        ) : null}
      </div>
    </section>
  );
}
