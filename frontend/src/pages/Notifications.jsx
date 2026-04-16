import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import { useToast } from "../components/toastContext";
import { clearStoredUserSession, getAuthHeaders } from "../utils/auth";
import { fetchWithTimeout, isAbortError } from "../utils/http";

const SESSION_ERROR_MESSAGES = new Set([
  "Authentication required",
  "Invalid or expired token",
]);

const getErrorMessage = (payload, fallbackMessage) => {
  if (typeof payload?.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  return fallbackMessage;
};

const isSessionError = (payload) => SESSION_ERROR_MESSAGES.has(payload?.error);

const readJson = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : null;
};

const formatDateTime = (value) => {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

export default function Notifications() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [markingNotificationId, setMarkingNotificationId] = useState("");
  const [loadError, setLoadError] = useState("");

  const loadNotifications = async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setLoadError("");

    try {
      const response = await fetchWithTimeout(`${API_BASE}/notifications?limit=50`, {
        headers: getAuthHeaders(),
      });
      const data = await readJson(response);

      if (!response.ok) {
        if (isSessionError(data)) {
          clearStoredUserSession();
          showToast({
            type: "error",
            title: "Session Expired",
            message: "Please sign in again to continue.",
          });
          navigate("/login", { replace: true });
          return;
        }

        throw new Error(getErrorMessage(data, "Unable to load notifications."));
      }

      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      const message = isAbortError(error)
        ? "The server took too long to respond. Please try again."
        : error.message || "Unable to load notifications.";
      setLoadError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkRead = async (notification) => {
    if (notification?.isRead || !notification?.id || markingNotificationId) {
      return;
    }

    setMarkingNotificationId(notification.id);

    try {
      const response = await fetchWithTimeout(
        `${API_BASE}/notifications/${notification.id}/read`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
        },
      );
      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Unable to mark notification as read."));
      }

      setNotifications((currentItems) =>
        currentItems.map((item) =>
          item.id === notification.id ? { ...item, isRead: true, readAt: data?.readAt } : item,
        ),
      );
    } catch (error) {
      showToast({
        type: "error",
        title: "Update failed",
        message: error.message || "Unable to mark notification as read.",
      });
    } finally {
      setMarkingNotificationId("");
    }
  };

  const handleMarkAllRead = async () => {
    if (isMarkingAllRead) {
      return;
    }

    setIsMarkingAllRead(true);

    try {
      const response = await fetchWithTimeout(`${API_BASE}/notifications/read-all`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Unable to mark notifications as read."));
      }

      setNotifications((currentItems) =>
        currentItems.map((item) =>
          item.isRead ? item : { ...item, isRead: true, readAt: new Date().toISOString() },
        ),
      );
      showToast({
        type: "success",
        title: "Notifications updated",
        message: "All notifications were marked as read.",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Update failed",
        message: error.message || "Unable to mark notifications as read.",
      });
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <div className="mint-page">
      <div className="mint-content max-w-5xl">
        <section className="mint-panel overflow-hidden">
          <div className="mint-hero rounded-none border-0 shadow-none">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mint-label">
                  Notifications
                </p>
                <h1 className="mt-4 text-[2.5rem] font-semibold tracking-[-0.8px]">
                  Event updates for you
                </h1>
                <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                  {unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadNotifications({ silent: true })}
                  disabled={isRefreshing}
                  className="mint-pill-btn mint-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isMarkingAllRead || unreadCount === 0}
                  className="mint-pill-btn mint-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isMarkingAllRead ? "Marking..." : "Mark all read"}
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 py-6 sm:px-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-accent-soft)] border-t-[var(--color-accent)]"></div>
                  <p className="mt-4 text-sm text-[var(--color-text-muted)]">
                    Loading notifications...
                  </p>
                </div>
              </div>
            ) : null}

            {!isLoading && loadError ? (
              <div className="mint-card border-red-200 bg-red-50 px-6 py-8 text-center">
                <h2 className="text-lg font-semibold text-red-800">
                  Unable to load notifications
                </h2>
                <p className="mt-2 text-sm text-red-700">{loadError}</p>
                <button
                  type="button"
                  onClick={() => loadNotifications()}
                  className="mt-5 inline-flex items-center rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            ) : null}

            {!isLoading && !loadError && notifications.length === 0 ? (
              <div className="mint-card border-dashed px-6 py-12 text-center">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">
                  No notifications yet
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  Event updates and cancellations will appear here.
                </p>
              </div>
            ) : null}

            {!isLoading && !loadError && notifications.length > 0 ? (
              <ul className="space-y-3">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`rounded-2xl border p-4 shadow-sm transition sm:p-5 ${
                      notification.isRead
                        ? "border-[var(--color-border)] bg-[var(--color-surface)]"
                        : "border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)]/35"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text)]">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                          {notification.message}
                        </p>
                        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </div>

                      {!notification.isRead ? (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(notification)}
                          disabled={markingNotificationId === notification.id}
                          className="mint-pill-btn mint-btn-primary inline-flex items-center justify-center px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {markingNotificationId === notification.id
                            ? "Marking..."
                            : "Mark as read"}
                        </button>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
                          Read
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
