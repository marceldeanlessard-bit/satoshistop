import React from 'react';
import { useUIStore } from '../store/store';

export const Navbar = ({ onAuthClick, isAuthenticated, userName }) => {
  const { theme, setSidebarOpen, setShowNotifications } = useUIStore();

  return (
    <nav style={styles.navbar}>
      <div style={styles.container}>
        <div style={styles.logoSection}>
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            style={styles.menuToggle}
          >
            ☰
          </button>
          <h1 style={styles.logo}>₿ SatoshiStop</h1>
        </div>

        <div style={styles.navCenter}>
          <input
            type="text"
            placeholder="Search products..."
            style={styles.searchInput}
          />
        </div>

        <div style={styles.navRight}>
          <button
            onClick={() => setShowNotifications(true)}
            style={styles.navButton}
          >
            🔔
          </button>
          {isAuthenticated ? (
            <div style={styles.userMenu}>
              <span>{userName}</span>
              <button onClick={onAuthClick} style={styles.navButton}>
                Logout
              </button>
            </div>
          ) : (
            <button onClick={onAuthClick} style={styles.navButton}>
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    backgroundColor: '#1a1a1a',
    color: 'white',
    padding: '1rem 0',
    borderBottom: '1px solid #333',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 1rem',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  menuToggle: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '1.5rem',
    cursor: 'pointer',
  },
  logo: {
    margin: 0,
    fontSize: '1.5rem',
  },
  navCenter: {
    flex: 1,
    margin: '0 2rem',
  },
  searchInput: {
    width: '100%',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#333',
    color: 'white',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  navButton: {
    background: 'none',
    border: '1px solid #666',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
};
