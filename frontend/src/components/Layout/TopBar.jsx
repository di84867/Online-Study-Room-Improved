import React, { useState } from 'react';
import { Search, Bell, LogIn, LogOut, Home, Calendar, Shield, Sun, Moon } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import AuthModal from '../Auth/AuthModal';

const TopBar = ({ user, setUser, openAuth }) => {
    const [isDark, setIsDark] = useState(true);

    const toggleTheme = () => {
        const next = !isDark;
        setIsDark(next);
        document.body.setAttribute('data-theme', next ? 'dark' : 'light');
    };
    return (
        <header className="top-bar">
            <div className="search-container" style={{ position: 'relative', width: '300px' }}>
                <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                <input
                    type="text"
                    placeholder="Search..."
                    style={{
                        width: '100%',
                        padding: '10px 16px 10px 40px',
                        borderRadius: '8px',
                        background: 'var(--surface)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                        outline: 'none'
                    }}
                />
            </div>

            <nav className="top-nav" style={{ display: 'flex', gap: '8px', marginLeft: '24px', flex: 1 }}>
                <NavLink to="/" className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}>
                    <Home size={18} /> <span>Dashboard</span>
                </NavLink>
                <NavLink to="/schedule" className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}>
                    <Calendar size={18} /> <span>Schedule</span>
                </NavLink>
                {user?.role === 'owner' && (
                    <NavLink to="/organization" className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}>
                        <Shield size={18} /> <span>Org</span>
                    </NavLink>
                )}
            </nav>

            <div className="top-bar-actions" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <button className="icon-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                    <Bell size={20} />
                </button>

                <button onClick={toggleTheme} className="icon-btn-glass" style={{ border: 'none', background: 'var(--surface-hover)' }}>
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {user ? (
                    <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Link to="/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', color: 'inherit' }}>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>{user.displayName}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</span>
                            </div>
                            <img src={user.photoURL} alt="Profile" style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--glass-border)', cursor: 'pointer', transition: '0.2s' }} onMouseOver={(e) => e.target.style.borderColor = 'var(--primary)'} onMouseOut={(e) => e.target.style.borderColor = 'var(--glass-border)'} />
                        </Link>
                        <button onClick={() => setUser(null)} title="Sign out" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                            <LogOut size={18} />
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem', border: 'none' }} onClick={openAuth}>
                            Sign In
                        </button>
                        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} onClick={openAuth}>
                            Get Started
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default TopBar;
