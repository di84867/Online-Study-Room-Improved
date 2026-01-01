import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Calendar, Plus, MessageCircle, Play } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = ({ user }) => {
    const navigate = useNavigate();
    const [roomName, setRoomName] = useState('');

    const createInstantMeeting = () => {
        const id = Math.random().toString(36).substring(2, 9);
        navigate(`/room/${id}`);
    };

    const joinMeeting = (e) => {
        e.preventDefault();
        if (roomName) navigate(`/room/${roomName}`);
    };

    const stats = [
        { label: 'Meetings Held', value: '12', icon: Video, color: '#6366f1' },
        { label: 'Total Hours', value: '48.5', icon: Calendar, color: '#06b6d4' },
        { label: 'Active Contacts', value: '24', icon: MessageCircle, color: '#f472b6' },
    ];

    return (
        <div className="dashboard-container">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="hero-section"
                style={{ marginBottom: '3rem' }}
            >
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Welcome back, <span style={{ color: 'var(--primary)' }}>{user ? user.displayName : 'Scholar'}!</span></h1>
                <p style={{ color: 'var(--text-muted)', maxWidth: '600px' }}>
                    Connect with your study group instantly. {!user && "Sign in to schedule meetings and save your progress."}
                </p>
            </motion.div>

            <div className="action-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '2rem' }}>
                    <div style={{ background: 'rgba(99, 102, 241, 0.2)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                        <Plus color="#6366f1" size={24} />
                    </div>
                    <h3 style={{ marginBottom: '0.5rem' }}>New Meeting</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Start an instant local meeting and invite others to join.</p>
                    <button onClick={createInstantMeeting} className="btn-primary" style={{ width: '100%' }}>Create Meeting</button>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '2rem' }}>
                    <div style={{ background: 'rgba(6, 182, 212, 0.2)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                        <Play color="#06b6d4" size={24} />
                    </div>
                    <h3 style={{ marginBottom: '0.5rem' }}>Join Meeting</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Enter a room ID or link to join an existing study session.</p>
                    <form onSubmit={joinMeeting} style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            placeholder="Room ID"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'white' }}
                        />
                        <button type="submit" className="btn-secondary">Join</button>
                    </form>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '2rem' }}>
                    <div style={{ background: 'rgba(244, 114, 182, 0.2)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                        <Calendar color="#f472b6" size={24} />
                    </div>
                    <h3 style={{ marginBottom: '0.5rem' }}>Schedule</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Plan your study sessions and stay organized with your team.</p>
                    <button onClick={() => navigate('/schedule')} className="btn-secondary" style={{ width: '100%', border: '1px solid var(--f472b6)' }}>Schedule Meeting</button>
                </motion.div>
            </div>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                {stats.map((stat, i) => (
                    <div key={i} className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: `${stat.color}15` }}>
                            <stat.icon color={stat.color} size={28} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stat.value}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Home;
