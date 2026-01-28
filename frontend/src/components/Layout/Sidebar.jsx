import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Settings, Video, User, Sun, Moon } from 'lucide-react';

const Sidebar = ({ user }) => {
    const [isDark, setIsDark] = useState(true);

    const toggleTheme = () => {
        setIsDark(!isDark);
        document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    };

    const menuItems = [
        { icon: Home, label: 'Dashboard', path: '/' },
        { icon: Video, label: 'Meetings', path: '/meetings' },
        { icon: Calendar, label: 'Schedule', path: '/schedule' },
    ];

    return (
        <aside className="sidebar">
            <div className="logo-section" style={{ marginBottom: '40px', padding: '0 8px' }}>
                <h2 style={{
                    color: 'var(--primary)',
                    fontSize: '1.5rem',
                    fontWeight: 500,
                    margin: 0,
                    letterSpacing: '-0.5px'
                }}>
                    OSR Meeting
                </h2>
            </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {menuItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.path}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <button 
                onClick={toggleTheme}
                style={{
                    margin: '24px 0',
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-main)',
                    padding: '12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    width: '100%',
                    fontSize: '0.9rem',
                    fontWeight: 500
                }}
            >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
                <span>{isDark ? 'Light' : 'Dark'}</span>
            </button>

            <div className="sidebar-footer" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {user ? (
                        <img
                            src={user.photoURL}
                            alt="P"
                            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--primary)', objectFit: 'cover' }}
                        />
                    ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={20} color="var(--text-muted)" />
                        </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user ? user.displayName : 'Guest User'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {user ? 'Online' : 'Not signed in'}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
