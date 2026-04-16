import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  clearStoredResetPasswordState,
  clearStoredUserSession,
  getAuthHeaders,
  getStoredUserRole,
  hasStoredUserSession,
} from "../utils/auth";
import { API_BASE } from "../config";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  getPreferredTheme,
  persistTheme,
} from "../utils/theme";
import logo from "../assets/logo.jpg";
import { useToast } from "../components/toastContext";

const menuItems = [
  { to: "/", label: "Home", requiresAuth: true },
  { to: "/events", label: "Events", requiresAuth: true, requiresAdmin: true },
  { to: "/my-events", label: "My Events", requiresAuth: true, requiresMember: true },
  { to: "/users", label: "Users", requiresAuth: true, requiresAdmin: true },
  { to: "/history", label: "History", requiresAuth: true, requiresMember: true },
  { to: "/notifications", label: "Notifications", requiresAuth: true },
  { to: "/login", label: "Login", guestOnly: true },
  { to: "/register", label: "Register", guestOnly: true },
];

const accountItems = [
  { to: "/profile", label: "Profile" },
  { to: "/change-password", label: "Change Password" },
];

const AUTH_PAGES = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);

const baseNavLinkClass =
  "flex items-center justify-between rounded-full border px-4 py-2 text-sm font-medium transition";

const getNavLinkClass = (isActive) =>
  `${baseNavLinkClass} ${
    isActive
      ? "border-[var(--color-brand)] bg-[var(--color-brand-light)] text-[var(--color-brand-deep)]"
      : "border-[var(--color-border-subtle)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
  }`;

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [theme, setTheme] = useState(() => getPreferredTheme());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [, setAuthRevision] = useState(0);

  const isAuthenticated = hasStoredUserSession();
  const userRole = isAuthenticated ? getStoredUserRole() : null;
  const isAuthPage = AUTH_PAGES.has(location.pathname);
  const isDarkTheme = theme === "dark";
  const isAccountRoute = accountItems.some((item) => item.to === location.pathname);

  const visibleMenuItems = useMemo(
    () =>
      menuItems.filter((item) => {
        if (item.requiresAuth) {
          if (!isAuthenticated) {
            return false;
          }
          if (item.requiresAdmin && userRole !== "admin") {
            return false;
          }
          if (item.requiresMember && userRole !== "member") {
            return false;
          }
          return true;
        }

        if (item.guestOnly) {
          return !isAuthenticated;
        }

        return true;
      }),
    [isAuthenticated, userRole],
  );

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      setAuthRevision((value) => value + 1);
      if (!event.key || event.key === THEME_STORAGE_KEY) {
        setTheme(getPreferredTheme());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadUnreadCount = async () => {
      if (!isAuthenticated) {
        if (isActive) {
          setUnreadNotificationCount(0);
        }
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/notifications/unread-count`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!isActive) {
          return;
        }

        const nextCount = Number.parseInt(String(data?.unreadCount || 0), 10);
        setUnreadNotificationCount(Number.isFinite(nextCount) && nextCount > 0 ? nextCount : 0);
      } catch {
        if (isActive) {
          setUnreadNotificationCount(0);
        }
      }
    };

    loadUnreadCount();
    const intervalId = window.setInterval(loadUnreadCount, 30000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, location.pathname]);

  const handleLogout = () => {
    clearStoredUserSession();
    clearStoredResetPasswordState();
    setIsSidebarOpen(false);
    showToast({
      type: "success",
      title: "Logged Out",
      message: "You have been signed out successfully.",
    });
    navigate("/login", { replace: true });
  };

  const showSidebar = !isAuthPage && visibleMenuItems.length > 0;
  const showAccountSubmenu = isAccountMenuOpen || isAccountRoute;

  return (
    <div
      className="grid h-dvh min-h-dvh grid-rows-[64px_minmax(0,1fr)_44px]"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <header
        className="sticky top-0 z-40 border-b backdrop-blur"
        style={{
          borderColor: "var(--color-border-subtle)",
          background: "color-mix(in srgb, var(--color-bg) 94%, transparent)",
        }}
      >
        <div className="mx-auto flex h-full w-full max-w-[1200px] items-center gap-3 px-4">
          {showSidebar ? (
            <button
              type="button"
              onClick={() => setIsSidebarOpen((value) => !value)}
              className={`${baseNavLinkClass} w-10 justify-center px-0 ${!isMobile ? "invisible pointer-events-none" : ""}`}
              style={{
                borderColor: "var(--color-border-subtle)",
                background: "var(--color-bg)",
                color: "var(--color-text)",
              }}
              aria-label="Toggle navigation menu"
            >
              ☰
            </button>
          ) : null}

          <Link to="/" className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold">
            <img
              src={logo}
              alt="FlashGather logo"
              className="h-9 w-9 rounded-xl border object-cover"
              style={{ borderColor: "var(--color-border-subtle)" }}
            />
            <span className="truncate">FlashGather</span>
          </Link>

          <button
            type="button"
            onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
            className="ml-auto rounded-full border px-4 py-2 text-sm font-medium transition hover:opacity-90"
            style={{
              borderColor: "var(--color-border-medium)",
              background: "var(--color-bg)",
              color: "var(--color-text)",
            }}
            aria-label={`Switch to ${isDarkTheme ? "light" : "dark"} mode`}
          >
            {isDarkTheme ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      <div className={`grid min-h-0 ${showSidebar ? "md:grid-cols-[250px_minmax(0,1fr)]" : "grid-cols-1"}`}>
        {showSidebar && isMobile && isSidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 border-0 bg-black/35"
            aria-label="Close sidebar overlay"
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : null}

        {showSidebar ? (
          <aside
            className={`z-40 border-r p-4 ${
              isMobile
                ? `fixed left-0 top-16 h-[calc(100dvh-64px)] w-[250px] transition-transform ${
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                  }`
                : "relative"
            }`}
            style={{
              borderColor: "var(--color-border-subtle)",
              background: "var(--color-bg)",
            }}
          >
            <nav className="grid gap-2">
              {visibleMenuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) => getNavLinkClass(isActive)}
                >
                  <span>{item.label}</span>
                  {item.to === "/notifications" && unreadNotificationCount > 0 ? (
                    <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-[#18E299] px-1.5 py-0.5 text-[11px] font-semibold text-[#0d0d0d]">
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </span>
                  ) : null}
                </NavLink>
              ))}

              {isAuthenticated ? (
                <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <button
                    type="button"
                    onClick={() => setIsAccountMenuOpen((value) => !value)}
                    className={`${baseNavLinkClass} w-full justify-between border-[var(--color-border-subtle)] bg-[var(--color-bg)] text-[var(--color-text)]`}
                    aria-expanded={showAccountSubmenu}
                    aria-controls="account-submenu"
                  >
                    <span>Account</span>
                    <span>{showAccountSubmenu ? "▾" : "▸"}</span>
                  </button>

                  {showAccountSubmenu ? (
                    <div id="account-submenu" className="mt-2 grid gap-2">
                      {accountItems.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setIsSidebarOpen(false)}
                          className={({ isActive }) => getNavLinkClass(isActive)}
                        >
                          {item.label}
                        </NavLink>
                      ))}

                      <button
                        type="button"
                        onClick={handleLogout}
                        className={`${baseNavLinkClass} justify-center border-transparent bg-[#d45656] text-white hover:opacity-90`}
                      >
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </nav>
          </aside>
        ) : null}

        <main className={`min-w-0 overflow-y-auto ${isAuthPage ? "p-0" : "p-0 md:p-2"}`}>
          <Outlet />
        </main>
      </div>

      <footer
        className="flex items-center justify-center border-t px-4 text-[0.81rem]"
        style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-muted)" }}
      >
        <small>(c) {new Date().getFullYear()} FlashGather. All rights reserved.</small>
      </footer>
    </div>
  );
}
