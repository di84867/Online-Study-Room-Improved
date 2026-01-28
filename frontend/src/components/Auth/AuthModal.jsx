import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle, Github, Twitter, Linkedin, Facebook } from 'lucide-react';

const AuthModal = ({ isOpen, onClose, onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        displayName: ''
    });
    const [error, setError] = useState(null);
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
            }
        } catch (err) {
            setError("Server connection failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider) => {
        setLoading(true);
        // Simulate importing profile data from social apps
        const profiles = {
            Google: {
                name: "Google Scholar",
                pic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
                email: "google_student@university.edu"
            },
            Facebook: {
                name: "Meta User",
                pic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
                email: "fb_user@meta.com"
            },
            Twitter: {
                name: "Tweet Master",
                pic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Toby",
                email: "twitter_study@x.com"
            },
            LinkedIn: {
                name: "Professional Learner",
                pic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pepper",
                email: "linkedin_pro@career.com"
            }
        };

        const mockSocialData = {
            email: profiles[provider].email,
            displayName: profiles[provider].name,
            photoURL: profiles[provider].pic,
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
            setError(`${provider} login failed.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.6)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            WebkitBackdropFilter: 'blur(4px)',
            backdropFilter: 'blur(4px)'
        }}>
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ 
                    width: '448px', 
                    padding: '40px', 
                    background: 'var(--surface)', 
                    borderRadius: '8px', 
                    position: 'relative', 
                    boxShadow: '0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12), 0 11px 15px -7px rgba(0,0,0,0.2)' 
                }}
            >
                <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={24} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 500, marginBottom: '8px', color: 'var(--text-main)' }}>
                        {isLogin ? 'Sign in' : 'Create account'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Join OSR Meeting to start collaborating
                    </p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(217, 48, 37, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: '4px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                    <button onClick={() => handleSocialLogin('Google')} className="social-btn">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="16" alt="G" />
                        Google
                    </button>
                    <button onClick={() => handleSocialLogin('Facebook')} className="social-btn" style={{ background:'#1877F2', color:'white', border:'none' }}>
                        <Facebook size={16} />
                        Facebook
                    </button>
                    <button onClick={() => handleSocialLogin('Twitter')} className="social-btn" style={{ background:'#000', color:'white', border:'none' }}>
                        <Twitter size={16} />
                        Twitter
                    </button>
                    <button onClick={() => handleSocialLogin('LinkedIn')} className="social-btn" style={{ background:'#0077B5', color:'white', border:'none' }}>
                        <Linkedin size={16} />
                        LinkedIn
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '20px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>or use email</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
                </div>

                <form onSubmit={handleLocalAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {!isLogin && (
                        <input
                            type="text"
                            name="displayName"
                            placeholder="Full name"
                            required
                            value={formData.displayName}
                            onChange={handleInputChange}
                            className="auth-input"
                        />
                    )}

                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="auth-input"
                    />

                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        className="auth-input"
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}
                        >
                            {isLogin ? 'Create account' : 'Sign in instead'}
                        </button>
                        
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? '...' : (isLogin ? 'Sign In' : 'Sign Up')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default AuthModal;
