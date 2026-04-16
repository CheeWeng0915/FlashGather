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
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-800 px-5 py-8 text-white sm:px-8 sm:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(99,102,241,0.24),_transparent_45%)]"></div>
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-200">
                  Notifications
                </p>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  Event updates for you
                </h1>
                <p className="mt-3 text-sm text-slate-200">
                  {unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadNotifications({ silent: true })}
                  disabled={isRefreshing}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isMarkingAllRead || unreadCount === 0}
                  className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
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
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                  <p className="mt-4 text-sm text-slate-600">Loading notifications...</p>
                </div>
              </div>
            ) : null}

            {!isLoading && loadError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
                <h2 className="text-lg font-semibold text-red-800">
                  Unable to load notifications
                </h2>
                <p className="mt-2 text-sm text-red-700">{loadError}</p>
                <button
                  type="button"
                  onClick={() => loadNotifications()}
                  className="mt-5 inline-flex items-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            ) : null}

            {!isLoading && !loadError && notifications.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <h2 className="text-lg font-semibold text-slate-900">No notifications yet</h2>
                <p className="mt-2 text-sm text-slate-600">
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
                        ? "border-slate-200 bg-white"
                        : "border-indigo-200 bg-indigo-50/40"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {notification.message}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </div>

                      {!notification.isRead ? (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(notification)}
                          disabled={markingNotificationId === notification.id}
                          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {markingNotificationId === notification.id
                            ? "Marking..."
                            : "Mark as read"}
                        </button>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
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
