import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Settings, Video, User } from 'lucide-react';

const Sidebar = ({ user }) => {
    const menuItems = [
        { icon: Home, label: 'Dashboard', path: '/' },
        { icon: Video, label: 'Meetings', path: '/meetings' },
        { icon: Calendar, label: 'Schedule', path: '/schedule' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <aside className="sidebar">
            <div className="logo-section" style={{ marginBottom: '3rem', paddingLeft: '8px' }}>
                <h2 style={{
                    background: 'linear-gradient(to right, #6366f1, #06b6d4)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    margin: 0
                }}>
                    StudyRoom+
                </h2>
            </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {menuItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.path}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <div style={{ minWidth: '24px', display: 'flex', justifyContent: 'center' }}>
                            <item.icon size={22} />
                        </div>
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer" style={{ marginTop: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {user ? (
                        <img
                            src={user.photoURL}
                            alt="P"
                            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #6366f1', minWidth: '40px' }}
                        />
                    ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '40px' }}>
                            <User size={20} color="#94a3b8" />
                        </div>
                    )}
                    <div className="user-info" style={{ marginLeft: '12px' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff' }}>{user ? user.displayName : 'Guest User'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user ? 'Pro Plan' : 'Free Plan'}</div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
