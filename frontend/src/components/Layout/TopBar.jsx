import React, { useState } from 'react';
import { Search, Bell, LogIn, LogOut } from 'lucide-react';
import AuthModal from '../Auth/AuthModal';

const TopBar = ({ user, setUser }) => {
    const [isAuthOpen, setIsAuthOpen] = useState(false);

    return (
        <header className="top-bar">
            <div className="search-container" style={{ position: 'relative', width: '400px' }}>
                <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                <input
                    type="text"
                    placeholder="Search meetings or recordings..."
                    style={{
                        width: '100%',
                        padding: '12px 16px 12px 48px',
                        borderRadius: '8px',
                        background: 'var(--surface)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        outline: 'none'
                    }}
                />
            </div>

            <div className="top-bar-actions" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <button className="icon-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                    <Bell size={20} />
                </button>

                {user ? (
                    <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>{user.displayName}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</span>
                        </div>
                        <img src={user.photoURL} alt="Profile" style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--glass-border)' }} />
                        <button onClick={() => setUser(null)} title="Sign out" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                            <LogOut size={18} />
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem', border: 'none' }} onClick={() => setIsAuthOpen(true)}>
                            Sign In
                        </button>
                        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} onClick={() => setIsAuthOpen(true)}>
                            Get Started
                        </button>
                    </div>
                )}
            </div>

            <AuthModal
                isOpen={isAuthOpen}
                onClose={() => setIsAuthOpen(false)}
                onLogin={(u) => setUser(u)}
            />
        </header>
    );
};

export default TopBar;
