import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle, Facebook, Twitter } from 'lucide-react';

const AuthModal = ({ isOpen, onClose, onLogin }) => {
    const [authMode, setAuthMode] = useState('login'); // login, signup, registerOrg
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        displayName: '',
        orgName: '',
        domain: ''
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

        let endpoint = '/api/auth/login';
        if (authMode === 'signup') endpoint = '/api/auth/signup';
        if (authMode === 'registerOrg') endpoint = '/api/auth/register-org';

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
        const profiles = {
            Google: { name: "Google Scholar", pic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix", email: "student@harvard.edu" },
            Facebook: { name: "Meta User", pic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka", email: "student@mit.edu" },
            Twitter: { name: "Tweet Master", pic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Toby", email: "learner@stanford.edu" },
            LinkedIn: { name: "Professional Learner", pic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pepper", email: "member@oxford.edu" }
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
            setError(`${provider} login failed. Is your organization registered?`);
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
                    borderRadius: '12px', 
                    position: 'relative', 
                    boxShadow: '0 24px 38px 2px rgba(0,0,0,0.3)' 
                }}
            >
                <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={24} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {authMode === 'login' ? 'Welcome Back' : authMode === 'signup' ? 'Join OSR+' : 'Register Organization'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '8px' }}>
                        {authMode === 'signup' ? 'Create your global academic profile.' : authMode === 'login' ? 'Collaborate with your team instantly.' : 'Establish a dedicated workspace for your school.'}
                    </p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(217, 48, 37, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: '4px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                {authMode !== 'registerOrg' && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                            <button onClick={() => handleSocialLogin('Google')} className="social-btn">
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="16" alt="G" />
                                Google
                            </button>
                            <button onClick={() => handleSocialLogin('Facebook')} className="social-btn" style={{ background:'#1877F2', color:'white', border:'none' }}>
                                <Facebook size={16} /> Facebook
                            </button>
                            <button onClick={() => handleSocialLogin('Twitter')} className="social-btn" style={{ background:'#1D9BF0', color:'white', border:'none' }}>
                                <Twitter size={16} /> Twitter
                            </button>
                            <button onClick={() => handleSocialLogin('LinkedIn')} className="social-btn" style={{ background:'#0A66C2', color:'white', border:'none' }}>
                                <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" width="16" style={{filter:'brightness(0) invert(1)'}} alt="L" />
                                LinkedIn
                            </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '20px 0' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>or use email</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
                        </div>
                    </>
                )}

                <form onSubmit={handleLocalAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {authMode !== 'login' && (
                        <input
                            type="text"
                            name="displayName"
                            placeholder="Full Name"
                            required
                            value={formData.displayName}
                            onChange={handleInputChange}
                            className="auth-input"
                        />
                    )}

                    {authMode === 'registerOrg' && (
                        <>
                            <input
                                type="text"
                                name="orgName"
                                placeholder="Organization Name (e.g. Stanford University)"
                                required
                                value={formData.orgName}
                                onChange={handleInputChange}
                                className="auth-input"
                            />
                            <input
                                type="text"
                                name="domain"
                                placeholder="Domain (e.g. stanford.edu)"
                                required
                                value={formData.domain}
                                onChange={handleInputChange}
                                className="auth-input"
                            />
                        </>
                    )}

                    <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%', height: '48px' }} disabled={loading}>
                            {loading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Sign Up')}
                        </button>
                        
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '0.85rem' }}>
                            <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                                {authMode === 'login' ? 'Create Account' : 'Already have account?'}
                            </button>
                            <span style={{ color: 'var(--text-muted)' }}>|</span>
                            <button type="button" onClick={() => setAuthMode('registerOrg')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                                For Organizations
                            </button>
                        </div>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default AuthModal;
