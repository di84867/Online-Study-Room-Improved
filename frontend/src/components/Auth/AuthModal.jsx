import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Github, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

const AuthModal = ({ isOpen, onClose, onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        displayName: ''
    });
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(null);
    };

    const handleLocalAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                onLogin(data.user);
                onClose();
            } else {
                setError(data.message);
                // If user doesn't exist during login, prompt to signup
                if (isLogin && response.status === 404) {
                    setMessage("Don't have an account? Switch to Sign Up below.");
                }
            }
        } catch (err) {
            setError("Server connection failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider) => {
        setLoading(true);
        // Mocking social data since we don't have real app IDs
        const mockSocialData = {
            email: `${provider.toLowerCase()}_user@example.com`,
            displayName: `${provider} User`,
            photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${provider}`,
            provider: provider.toLowerCase()
        };

        try {
            const response = await fetch('/api/auth/social', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mockSocialData)
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                onLogin(data.user);
                onClose();
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError("Social login failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass-card"
                style={{ width: '420px', padding: '2.5rem', position: 'relative', overflow: 'hidden' }}
            >
                <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={24} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {isLogin ? 'Good to see you again!' : 'Start your collaborative study journey today.'}
                    </p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                {message && !error && (
                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '10px', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                        <CheckCircle size={18} /> {message}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                    <button onClick={() => handleSocialLogin('Google')} className="social-btn" style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        padding: '10px', borderRadius: '12px', border: '1px solid var(--glass-border)',
                        background: 'white', color: '#1f2937', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem'
                    }}>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" alt="G" />
                        Google
                    </button>

                    <button onClick={() => handleSocialLogin('Facebook')} className="social-btn" style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        padding: '10px', borderRadius: '12px', border: 'none',
                        background: '#1877F2', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem'
                    }}>
                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                        Facebook
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '1rem 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
                </div>

                <form onSubmit={handleLocalAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {!isLogin && (
                        <div style={{ position: 'relative' }}>
                            <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                            <input
                                type="text"
                                name="displayName"
                                placeholder="Full Name"
                                required
                                value={formData.displayName}
                                onChange={handleInputChange}
                                style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'white' }}
                            />
                        </div>
                    )}

                    <div style={{ position: 'relative' }}>
                        <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email Address"
                            required
                            value={formData.email}
                            onChange={handleInputChange}
                            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'white' }}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            required
                            value={formData.password}
                            onChange={handleInputChange}
                            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'white' }}
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}>
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                    </button>
                </form>

                <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                    <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {isLogin ? 'Sign Up' : 'Sign In'}
                    </button>
                </p>
            </motion.div>
        </div>
    );
};

export default AuthModal;
