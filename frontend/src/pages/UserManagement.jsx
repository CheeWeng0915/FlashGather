import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import { useToast } from "../components/toastContext";
import {
  clearStoredUserSession,
  getAuthHeaders,
  getStoredUser,
} from "../utils/auth";
import { formatDisplayDate } from "../utils/dateDisplay";
import { fetchWithTimeout, isAbortError } from "../utils/http";

const SESSION_ERROR_MESSAGES = new Set([
  "Authentication required",
  "Invalid or expired token",
]);

const getErrorMessage = (payload, fallbackMessage) => {
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    return payload.errors[0]?.msg || fallbackMessage;
  }

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

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  return formatDisplayDate(value);
};

const buildUsersUrl = (searchTerm) => {
  const params = new URLSearchParams();
  const normalizedSearch = searchTerm.trim();

  if (normalizedSearch) {
    params.set("search", normalizedSearch);
  }

  const queryString = params.toString();
  return queryString ? `${API_BASE}/users?${queryString}` : `${API_BASE}/users`;
};

const getRoleBadgeClasses = (role) =>
  role === "admin"
    ? "border border-blue-200 bg-blue-50 text-blue-700"
    : "border border-emerald-200 bg-emerald-50 text-emerald-700";

export default function UserManagement() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [updatingUserId, setUpdatingUserId] = useState("");
  const currentUserId = getStoredUser()?.id || "";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  useEffect(() => {
    let isActive = true;

    const loadUsers = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await fetchWithTimeout(buildUsersUrl(searchTerm), {
          headers: getAuthHeaders(),
        });
        const data = await readJson(response);

        if (!response.ok) {
          if (isSessionError(data)) {
            clearStoredUserSession();
            if (isActive) {
              showToast({
                type: "error",
                title: "Session Expired",
                message: "Please sign in again to continue.",
              });
              navigate("/login", { replace: true });
            }
            return;
          }

          if (response.status === 403) {
            if (isActive) {
              showToast({
                type: "error",
                title: "Access Denied",
                message: "Admin access is required to view user management.",
              });
              navigate("/", { replace: true });
            }
            return;
          }

          throw new Error(getErrorMessage(data, "Unable to load users."));
        }

        if (!isActive) {
          return;
        }

        setUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message = isAbortError(error)
          ? "The server took too long to respond. Please try again."
          : error.message || "Unable to load users.";
        setLoadError(message);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      isActive = false;
    };
  }, [navigate, refreshRevision, searchTerm, showToast]);

  const handleRefresh = () => {
    setSearchTerm(searchInput.trim());
    setRefreshRevision((value) => value + 1);
  };

  const handleToggleRole = async (user) => {
    if (!user?.id || user.id === currentUserId || updatingUserId) {
      return;
    }

    const nextRole = user.role === "admin" ? "member" : "admin";
    setUpdatingUserId(user.id);

    try {
      const response = await fetchWithTimeout(`${API_BASE}/users/${user.id}/role`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Unable to update user role."));
      }

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === user.id ? { ...item, role: data?.role || nextRole } : item,
        ),
      );

      showToast({
        type: "success",
        title: "Role updated",
        message: `${user.username} is now ${nextRole}.`,
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Role update failed",
        message: error.message || "Unable to update user role.",
      });
    } finally {
      setUpdatingUserId("");
    }
  };

  const summary = searchTerm
    ? `${users.length} ${users.length === 1 ? "user" : "users"} match "${searchTerm}"`
    : `${users.length} ${users.length === 1 ? "user" : "users"} in the system`;

  return (
    <div className="mint-page">
      <div className="mint-content max-w-7xl">
        <section className="mint-panel overflow-hidden">
          <div className="mint-hero rounded-none border-0 shadow-none">
            <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl">
                <p className="mint-label">
                  User Management
                </p>
                <h1 className="mt-4 text-[2.5rem] font-semibold tracking-[-0.8px]">
                  Review all FlashGather users
                </h1>
                <p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)]">
                  Search by username or email to find admins and members without
                  exposing any password data.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] xl:min-w-[420px]">
                <label className="block">
                  <span className="mint-label mb-2 block">
                    Search
                  </span>
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by username or email"
                    className="mint-input w-full mint-input-pill"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleRefresh}
                  className="mint-pill-btn mint-btn-primary inline-flex h-12 items-center justify-center px-4 xl:self-end"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-4 sm:px-8">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              {summary}
            </p>
          </div>

          <div className="px-4 py-6 sm:px-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 animate-spin text-[var(--color-accent)]"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <p className="mt-4 text-sm text-[var(--color-text-muted)]">
                    Loading users...
                  </p>
                </div>
              </div>
            ) : null}

            {!isLoading && loadError ? (
              <div className="mint-card border-red-200 bg-red-50 px-6 py-8 text-center">
                <h2 className="text-lg font-semibold text-red-800">
                  Unable to load users
                </h2>
                <p className="mt-2 text-sm text-red-700">{loadError}</p>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="mt-5 inline-flex items-center rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            ) : null}

            {!isLoading && !loadError && users.length === 0 ? (
              <div className="mint-card border-dashed px-6 py-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-[var(--color-text-muted)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.6"
                    d="M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-4-4H11a4 4 0 00-4 4v2m10 0H7m10-11a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <h2 className="mt-4 text-lg font-semibold text-[var(--color-text)]">
                  No users found
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  Try another username or email search.
                </p>
              </div>
            ) : null}

            {!isLoading && !loadError && users.length > 0 ? (
              <>
                <div className="space-y-4 md:hidden">
                  {users.map((user) => (
                    <article
                      key={user.id}
                      className="mint-card p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--color-text)]">
                              {user.username}
                            </h2>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                              {user.email}
                            </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeClasses(user.role)}`}
                        >
                          {user.role === "admin" ? "Admin" : "Member"}
                        </span>
                      </div>

                      <dl className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4 text-sm">
                        <div className="flex justify-between gap-4">
                          <dt className="text-[var(--color-text-muted)]">User ID</dt>
                          <dd className="truncate text-right font-medium text-[var(--color-text)]">
                            {user.id}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-[var(--color-text-muted)]">Member Since</dt>
                          <dd className="text-right font-medium text-[var(--color-text)]">
                            {formatDate(user.createdAt)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-[var(--color-text-muted)]">Last Updated</dt>
                          <dd className="text-right font-medium text-[var(--color-text)]">
                            {formatDate(user.updatedAt)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-[var(--color-text-muted)]">Actions</dt>
                          <dd className="text-right">
                            {user.id === currentUserId ? (
                                <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                                  Current account
                                </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleRole(user)}
                                disabled={updatingUserId === user.id}
                                 className="mint-pill-btn mint-btn-primary px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {updatingUserId === user.id
                                  ? "Updating..."
                                  : `Set as ${user.role === "admin" ? "Member" : "Admin"}`}
                              </button>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-[var(--color-border)]">
                    <thead>
                      <tr className="bg-[var(--color-surface-muted)] text-left text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                        <th className="px-5 py-4">Username</th>
                        <th className="px-5 py-4">Email</th>
                        <th className="px-5 py-4">Role</th>
                        <th className="px-5 py-4">User ID</th>
                        <th className="px-5 py-4">Member Since</th>
                        <th className="px-5 py-4">Last Updated</th>
                        <th className="px-5 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user.id}
                           className="border-t border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-secondary)]"
                        >
                          <td className="px-5 py-4 font-semibold text-[var(--color-text)]">
                            {user.username}
                          </td>
                          <td className="px-5 py-4">{user.email}</td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeClasses(user.role)}`}
                            >
                              {user.role === "admin" ? "Admin" : "Member"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-[var(--color-text-muted)]">
                            {user.id}
                          </td>
                          <td className="px-5 py-4">{formatDate(user.createdAt)}</td>
                          <td className="px-5 py-4">{formatDate(user.updatedAt)}</td>
                          <td className="px-5 py-4">
                            {user.id === currentUserId ? (
                               <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                                Current account
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleRole(user)}
                                disabled={updatingUserId === user.id}
                                 className="mint-pill-btn mint-btn-primary px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {updatingUserId === user.id
                                  ? "Updating..."
                                  : `Set as ${user.role === "admin" ? "Member" : "Admin"}`}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
