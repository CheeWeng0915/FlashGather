import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

const menuItems = [
  { to: '/', label: 'Home' },
  { to: '/login', label: 'Login' },
  { to: '/register', label: 'Register' }
];

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <Link to="/" style={styles.brand}>
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
            {menuItems.map((item) => (
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
          </nav>
        </aside>

        <main style={styles.main}>
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
    minHeight: '100vh',
    display: 'grid',
    gridTemplateRows: '64px 1fr 48px',
    backgroundColor: '#f8fafc',
    color: '#0f172a'
  },
  header: {
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 40
  },
  headerInner: {
    maxWidth: '1200px',
    height: '100%',
    margin: '0 auto',
    padding: '0 16px',
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
    fontSize: '1.05rem'
  },
  body: {
    display: 'grid',
    minHeight: 0,
    position: 'relative'
  },
  bodyDesktop: {
    gridTemplateColumns: '260px 1fr'
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
    padding: '16px',
    zIndex: 35,
    transition: 'transform 0.2s ease'
  },
  sidebarDesktop: {
    position: 'relative',
    transform: 'translateX(0)'
  },
  sidebarMobile: {
    position: 'fixed',
    top: '64px',
    left: 0,
    width: '260px',
    height: 'calc(100vh - 64px)'
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
    padding: '10px 12px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.95rem'
  },
  menuLinkActive: {
    backgroundColor: '#e2e8f0',
    color: '#0f172a'
  },
  main: {
    padding: '20px 16px',
    minWidth: 0
  },
  footer: {
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 16px'
  }
};
