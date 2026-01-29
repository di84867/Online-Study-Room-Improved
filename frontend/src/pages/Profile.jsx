import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, MapPin, Camera, Save, ArrowLeft, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

const Profile = ({ user, setUser }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        displayName: user?.displayName || '',
        email: user?.email || '',
        dob: user?.dob || '',
        bio: user?.bio || '',
        photoURL: user?.photoURL || ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!user) navigate('/');
    }, [user, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const res = await fetch('/api/auth/update-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (res.ok) {
                setUser(data.user);
                setMessage('Profile updated successfully!');
            } else {
                setMessage(data.message || 'Update failed');
            }
        } catch (err) {
            setMessage('Server error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-container">
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="profile-card glass-card shadow-premium"
            >
                <div className="profile-header">
                    <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
                    <h2>My Academic Profile</h2>
                    <div style={{ width: 40 }}></div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="avatar-section">
                        <div className="avatar-wrapper">
                            <img src={formData.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} alt="Profile" />
                            <div className="avatar-overlay">
                                <Camera size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Photo URL" 
                                    name="photoURL"
                                    value={formData.photoURL}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div className="avatar-info">
                            <h3>{formData.displayName || 'Guest User'}</h3>
                            <p>{user?.role?.toUpperCase()} • {user?.orgId ? 'Organization Member' : 'Global Explorer'}</p>
                        </div>
                    </div>

                    <div className="profile-grid">
                        <div className="form-group">
                            <label><User size={16} /> Full Name</label>
                            <input 
                                type="text" 
                                name="displayName"
                                value={formData.displayName} 
                                onChange={handleChange} 
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div className="form-group">
                            <label><Mail size={16} /> Email Address</label>
                            <input 
                                type="email" 
                                value={formData.email} 
                                disabled 
                                style={{ opacity: 0.6, cursor: 'not-allowed' }}
                            />
                        </div>

                        <div className="form-group">
                            <label><Calendar size={16} /> Date of Birth</label>
                            <input 
                                type="date" 
                                name="dob"
                                value={formData.dob} 
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label><Briefcase size={16} /> Academic Role</label>
                            <input 
                                type="text" 
                                value={user?.role || 'User'} 
                                disabled 
                                style={{ opacity: 0.6 }}
                            />
                        </div>
                    </div>

                    <div className="form-group biography">
                        <label>Academic Bio</label>
                        <textarea 
                            name="bio"
                            value={formData.bio} 
                            onChange={handleChange}
                            placeholder="Tell us about your studies and interests..."
                            rows="4"
                        />
                    </div>

                    {message && <div className={`profile-message ${message.includes('success') ? 'success' : 'error'}`}>{message}</div>}

                    <div className="profile-actions">
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? <div className="loader-mini"></div> : <><Save size={18} /> Save Changes</>}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default Profile;
