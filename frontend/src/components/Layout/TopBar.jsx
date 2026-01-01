import React, { useState } from 'react';
import { Search, Bell, LogIn, LogOut } from 'lucide-react';
import AuthModal from '../Auth/AuthModal';

const TopBar = ({ user, setUser }) => {
    const [isAuthOpen, setIsAuthOpen] = useState(false);

    return (
        <header className="top-bar">
            <div className="search-container" style={{ position: 'relative', width: '400px' }}>
                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                <input
                    type="text"
                    placeholder="Search meetings, recordings, or students..."
                    style={{
                        width: '100%',
                        padding: '10px 10px 10px 40px',
                        borderRadius: '12px',
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        color: 'white',
                        outline: 'none'
                    }}
                />
            </div>

            <div className="top-bar-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <button className="icon-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <Bell size={20} />
                </button>

                {user ? (
                    <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{user.displayName}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.email}</div>
                        </div>
                        <img src={user.photoURL} alt="Profile" style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid var(--primary)' }} />
                        <button onClick={() => setUser(null)} className="icon-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <LogOut size={18} />
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => setIsAuthOpen(true)}>
                            Sign In
                        </button>
                        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => setIsAuthOpen(true)}>
                            <LogIn size={16} /> Get Started
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
