import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  clearStoredUserSession,
  getStoredUserRole,
  hasStoredUserSession
} from '../utils/auth'
import {
  THEME_STORAGE_KEY,
  applyTheme,
  getPreferredTheme,
  persistTheme
} from '../utils/theme'
import logo from '../assets/logo.jpg'
import { useToast } from '../components/ToastProvider'

const menuItems = [
  { to: '/', label: 'Home', requiresAuth: true },
  { to: '/events', label: 'Events', requiresAuth: true, requiresAdmin: true },
  { to: '/users', label: 'Users', requiresAuth: true, requiresAdmin: true },
  { to: '/history', label: 'History', requiresAuth: true, requiresMember: true },
  { to: '/profile', label: 'Profile', requiresAuth: true },
  { to: '/login', label: 'Login', guestOnly: true },
  { to: '/register', label: 'Register', guestOnly: true }
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)
  const [theme, setTheme] = useState(() => getPreferredTheme())
  const [, setAuthRevision] = useState(0)
  const isAuthenticated = hasStoredUserSession()
  const userRole = isAuthenticated ? getStoredUserRole() : null
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'
  const isMobile = viewportWidth < 900
  const isCompactHeader = viewportWidth < 560
  const isVerySmallHeader = viewportWidth < 420
  const isDarkTheme = theme === 'dark'
  const themeStyles = getThemeStyles(isDarkTheme)
  const visibleMenuItems = menuItems.filter((item) => {
    if (item.requiresAuth) {
      if (!isAuthenticated) {
        return false
      }

      if (item.requiresAdmin && userRole !== 'admin') {
        return false
      }

      if (item.requiresMember && userRole !== 'member') {
        return false
      }

      return true
    }

    if (item.guestOnly) {
      return !isAuthenticated
    }

    return true
  })
  const shouldShowNavigation = !isAuthPage && visibleMenuItems.length > 0

  useEffect(() => {
    const onResize = () => {
      const nextWidth = window.innerWidth
      const mobile = nextWidth < 900
      setViewportWidth(nextWidth)

      if (!mobile) {
        setIsSidebarOpen(false)
      }
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    applyTheme(theme)
    persistTheme(theme)
  }, [theme])

  useEffect(() => {
    const syncAuthState = () => {
      setAuthRevision((value) => value + 1)
    }

    const handleStorage = (event) => {
      syncAuthState()

      if (!event.key || event.key === THEME_STORAGE_KEY) {
        setTheme(getPreferredTheme())
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const handleLogout = () => {
    clearStoredUserSession()
    setIsSidebarOpen(false)
    showToast({
      type: 'success',
      title: 'Logged Out',
      message: 'You have been signed out successfully.'
    })
    navigate('/login', { replace: true })
  }

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  const brandLabel = isVerySmallHeader ? 'Flash' : 'Flash Gather'
  const bodyLayoutStyles = shouldShowNavigation
    ? isMobile
      ? styles.bodyMobile
      : styles.bodyDesktop
    : styles.bodySingleColumn

  return (
    <div style={{ ...styles.shell, ...themeStyles.shell }}>
      <header style={{ ...styles.header, ...themeStyles.header }}>
        <div
          style={{
            ...styles.headerInner,
            ...(isCompactHeader ? styles.headerInnerCompact : null)
          }}
        >
          {shouldShowNavigation ? (
            <button
              type="button"
              onClick={() => setIsSidebarOpen((value) => !value)}
              style={{
                ...styles.menuButton,
                ...themeStyles.menuButton,
                ...(isMobile ? null : styles.menuButtonHidden)
              }}
              aria-label="Toggle sidebar"
            >
              <svg viewBox="0 0 24 24" fill="none" style={styles.menuButtonIcon} aria-hidden="true">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}

          <Link
            to="/"
            style={{
              ...styles.brand,
              ...themeStyles.brand,
              ...(isCompactHeader ? styles.brandCompact : null)
            }}
          >
            <img
              src={logo}
              alt="Flash Gather Logo"
              style={{ ...styles.brandLogo, ...themeStyles.brandLogo }}
            />
            <span style={styles.brandText}>{brandLabel}</span>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            style={{
              ...styles.themeToggle,
              ...themeStyles.themeToggle,
              ...(isCompactHeader ? styles.themeToggleCompact : null)
            }}
            aria-label={`Switch to ${isDarkTheme ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDarkTheme ? 'light' : 'dark'} mode`}
          >
            <span style={styles.themeToggleIcon} aria-hidden="true">
              {isDarkTheme ? (
                <svg viewBox="0 0 24 24" fill="none" style={styles.themeToggleSvg}>
                  <path
                    d="M12 3v2.5m0 13V21m9-9h-2.5M5.5 12H3m15.364 6.364l-1.768-1.768M7.404 7.404L5.636 5.636m12.728 0l-1.768 1.768M7.404 16.596l-1.768 1.768M12 16a4 4 0 100-8 4 4 0 000 8z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" style={styles.themeToggleSvg}>
                  <path
                    d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            {!isCompactHeader ? <span>{isDarkTheme ? 'Light' : 'Dark'}</span> : null}
          </button>
        </div>
      </header>

      <div style={{ ...styles.body, ...bodyLayoutStyles }}>
        {shouldShowNavigation && isMobile && isSidebarOpen ? (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            onClick={() => setIsSidebarOpen(false)}
            style={styles.overlay}
          />
        ) : null}

        {shouldShowNavigation ? (
          <aside
            style={{
              ...styles.sidebar,
              ...themeStyles.sidebar,
              ...(isMobile ? styles.sidebarMobile : styles.sidebarDesktop),
              ...(isMobile && isSidebarOpen ? styles.sidebarOpen : null),
              ...(isMobile && !isSidebarOpen ? styles.sidebarClosed : null)
            }}
          >
            <nav style={styles.menu}>
              {visibleMenuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsSidebarOpen(false)}
                  style={({ isActive }) => ({
                    ...styles.menuLink,
                    ...themeStyles.menuLink,
                    ...(isActive ? styles.menuLinkActive : null),
                    ...(isActive ? themeStyles.menuLinkActive : null)
                  })}
                >
                  {item.label}
                </NavLink>
              ))}

              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    ...styles.menuLink,
                    ...themeStyles.menuLink,
                    ...styles.menuButtonAction,
                    ...themeStyles.menuButtonAction
                  }}
                >
                  Logout
                </button>
              ) : null}
            </nav>
          </aside>
        ) : null}

        <main
          style={{
            ...styles.main,
            ...(isMobile ? styles.mainMobile : null),
            ...(isAuthPage ? styles.mainAuth : null)
          }}
        >
          <Outlet />
        </main>
      </div>

      <footer style={{ ...styles.footer, ...themeStyles.footer }}>
        <small>(c) {new Date().getFullYear()} FlashGather. All rights reserved.</small>
      </footer>
    </div>
  )
}

const styles = {
  shell: {
    height: '100dvh',
    minHeight: '100dvh',
    display: 'grid',
    gridTemplateRows: '60px minmax(0, 1fr) 42px',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    overflow: 'hidden'
  },
  header: {
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 40
  },
  headerInner: {
    maxWidth: '1160px',
    width: '100%',
    height: '100%',
    margin: '0 auto',
    padding: '0 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0
  },
  headerInnerCompact: {
    padding: '0 10px',
    gap: '8px'
  },
  menuButton: {
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    width: '36px',
    height: '36px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    color: '#334155',
    cursor: 'pointer'
  },
  menuButtonIcon: {
    width: '18px',
    height: '18px',
    display: 'block'
  },
  menuButtonHidden: {
    visibility: 'hidden',
    pointerEvents: 'none'
  },
  brand: {
    textDecoration: 'none',
    color: '#0f172a',
    fontWeight: 800,
    fontSize: '1rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
    flex: '1 1 auto'
  },
  brandCompact: {
    gap: '8px'
  },
  brandText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  brandLogo: {
    width: '36px',
    height: '36px',
    objectFit: 'cover',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    display: 'block'
  },
  themeToggle: {
    marginLeft: 'auto',
    minHeight: '38px',
    padding: '0 14px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: '999px',
    fontSize: '0.9rem',
    fontWeight: 700,
    transition: 'transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease',
    flex: '0 0 auto'
  },
  themeToggleCompact: {
    minWidth: '38px',
    padding: '0 10px'
  },
  themeToggleIcon: {
    display: 'inline-flex',
    width: '16px',
    height: '16px'
  },
  themeToggleSvg: {
    width: '100%',
    height: '100%',
    display: 'block'
  },
  body: {
    display: 'grid',
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden'
  },
  bodyDesktop: {
    gridTemplateColumns: '232px minmax(0, 1fr)'
  },
  bodyMobile: {
    gridTemplateColumns: '1fr'
  },
  bodySingleColumn: {
    gridTemplateColumns: 'minmax(0, 1fr)'
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    border: 0,
    zIndex: 30
  },
  sidebar: {
    borderRight: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    padding: '14px',
    zIndex: 35,
    transition: 'transform 0.2s ease',
    overflowY: 'auto'
  },
  sidebarDesktop: {
    position: 'relative',
    transform: 'translateX(0)'
  },
  sidebarMobile: {
    position: 'fixed',
    top: '60px',
    left: 0,
    width: 'min(272px, calc(100vw - 24px))',
    height: 'calc(100dvh - 60px)'
  },
  sidebarOpen: {
    transform: 'translateX(0)'
  },
  sidebarClosed: {
    transform: 'translateX(-100%)',
    visibility: 'hidden',
    pointerEvents: 'none'
  },
  menu: {
    display: 'grid',
    gap: '8px'
  },
  menuLink: {
    textDecoration: 'none',
    color: '#334155',
    padding: '9px 11px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.92rem'
  },
  menuButtonAction: {
    border: 0,
    width: '100%',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    textAlign: 'left',
    cursor: 'pointer'
  },
  menuLinkActive: {
    backgroundColor: '#e2e8f0',
    color: '#0f172a'
  },
  main: {
    padding: '14px',
    minWidth: 0,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    overscrollBehavior: 'contain'
  },
  mainMobile: {
    padding: '12px'
  },
  mainAuth: {
    padding: 0
  },
  footer: {
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 14px',
    fontSize: '0.82rem'
  }
}

const getThemeStyles = (isDarkTheme) =>
  isDarkTheme
    ? {
        shell: {
          backgroundColor: '#020617',
          color: '#e2e8f0'
        },
        header: {
          borderBottom: '1px solid #1e293b',
          backgroundColor: 'rgba(2, 6, 23, 0.9)',
          backdropFilter: 'blur(18px)'
        },
        menuButton: {
          border: '1px solid #334155',
          backgroundColor: '#0f172a',
          color: '#e2e8f0'
        },
        brand: {
          color: '#f8fafc'
        },
        brandLogo: {
          border: '1px solid #334155',
          boxShadow: '0 10px 24px rgba(15, 23, 42, 0.32)'
        },
        themeToggle: {
          border: '1px solid #334155',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.96))',
          color: '#f8fafc',
          boxShadow: '0 10px 28px rgba(15, 23, 42, 0.3)'
        },
        sidebar: {
          borderRight: '1px solid #1e293b',
          backgroundColor: 'rgba(2, 6, 23, 0.94)'
        },
        menuLink: {
          color: '#cbd5e1'
        },
        menuButtonAction: {
          backgroundColor: 'rgba(127, 29, 29, 0.38)',
          color: '#fecaca'
        },
        menuLinkActive: {
          backgroundColor: '#1e293b',
          color: '#f8fafc'
        },
        footer: {
          borderTop: '1px solid #1e293b',
          backgroundColor: 'rgba(2, 6, 23, 0.92)',
          color: '#94a3b8'
        }
      }
    : {
        shell: {
          backgroundColor: '#f8fafc',
          color: '#0f172a'
        },
        header: {
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(18px)'
        },
        menuButton: {
          border: '1px solid #cbd5e1',
          backgroundColor: '#ffffff',
          color: '#334155'
        },
        brand: {
          color: '#0f172a'
        },
        brandLogo: {
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 22px rgba(15, 23, 42, 0.08)'
        },
        themeToggle: {
          border: '1px solid #cbd5e1',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 249, 0.98))',
          color: '#0f172a',
          boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)'
        },
        sidebar: {
          borderRight: '1px solid #e2e8f0',
          backgroundColor: 'rgba(255, 255, 255, 0.96)'
        },
        menuLink: {
          color: '#334155'
        },
        menuButtonAction: {
          backgroundColor: '#fee2e2',
          color: '#b91c1c'
        },
        menuLinkActive: {
          backgroundColor: '#e2e8f0',
          color: '#0f172a'
        },
        footer: {
          borderTop: '1px solid #e2e8f0',
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          color: '#475569'
        }
      }
