import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearStoredUserSession, hasStoredUserSession } from '../utils/auth';
import logo from '../assets/logo.jpg';

const menuItems = [
  { to: '/', label: 'Home', requiresAuth: true },
  { to: '/new-event', label: 'New Event', requiresAuth: true },
  { to: '/login', label: 'Login', guestOnly: true },
  { to: '/register', label: 'Register', guestOnly: true }
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const [isAuthenticated, setIsAuthenticated] = useState(() => hasStoredUserSession());
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const visibleMenuItems = menuItems.filter((item) => {
    if (item.requiresAuth) {
      return isAuthenticated;
    }

    if (item.guestOnly) {
      return !isAuthenticated;
    }

    return true;
  });

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setIsAuthenticated(hasStoredUserSession());
  }, [location.pathname]);

  useEffect(() => {
    const syncAuthState = () => {
      setIsAuthenticated(hasStoredUserSession());
    };

    window.addEventListener('storage', syncAuthState);
    return () => window.removeEventListener('storage', syncAuthState);
  }, []);

  const handleLogout = () => {
    clearStoredUserSession();
    setIsAuthenticated(false);
    setIsSidebarOpen(false);
    navigate('/login', { replace: true });
  };

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button
            type="button"
            onClick={() => setIsSidebarOpen((value) => !value)}
            style={{ ...styles.menuButton, ...(isMobile ? null : styles.menuButtonHidden) }}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>

          <Link to="/" style={styles.brand}>
            <img src={logo} alt="Flash Gather Logo" style={styles.brandLogo} />
            Flash Gather
          </Link>
        </div>
      </header>

      <div style={{ ...styles.body, ...(isMobile ? styles.bodyMobile : styles.bodyDesktop) }}>
        {isMobile && isSidebarOpen ? (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            onClick={() => setIsSidebarOpen(false)}
            style={styles.overlay}
          />
        ) : null}

        <aside
          style={{
            ...styles.sidebar,
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
                  ...(isActive ? styles.menuLinkActive : null)
                })}
              >
                {item.label}
              </NavLink>
            ))}

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                style={{ ...styles.menuLink, ...styles.menuButtonAction }}
              >
                Logout
              </button>
            ) : null}
          </nav>
        </aside>

        <main style={{ ...styles.main, ...(isAuthPage ? styles.mainAuth : null) }}>
          <Outlet />
        </main>
      </div>

      <footer style={styles.footer}>
        <small>(c) {new Date().getFullYear()} FlashGather. All rights reserved.</small>
      </footer>
    </div>
  );
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
    height: '100%',
    margin: '0 auto',
    padding: '0 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
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
    gap: '10px'
  },
  brandLogo: {
    width: '36px',
    height: '36px',
    objectFit: 'cover',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
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
    width: '232px',
    height: 'calc(100dvh - 60px)'
  },
  sidebarOpen: {
    transform: 'translateX(0)'
  },
  sidebarClosed: {
    transform: 'translateX(-100%)'
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
    overflowY: 'auto'
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
};
