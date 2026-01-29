import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Calendar, Plus, MessageCircle, Play } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = ({ user }) => {
    const navigate = useNavigate();
    const [roomName, setRoomName] = useState('');

    const createInstantMeeting = () => {
        const id = Math.random().toString(36).substring(2, 9);
        navigate(`/room/${id}?host=true`);
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
        <div className="dashboard-container" style={{ padding: '40px 60px', width: '100%' }}>
            <div className="dashboard-layout" style={{ display: 'flex', gap: '60px', alignItems: 'center', minHeight: '80vh' }}>
                
                {/* Left side: Hero & Title */}
                <div className="hero-content" style={{ flex: 1 }}>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h1 style={{ fontSize: '3.5rem', fontWeight: 400, marginBottom: '1.5rem', lineHeight: 1.1 }}>
                            Premium video meetings.<br/>
                            <span style={{ color: 'var(--text-muted)' }}>Now free for everyone.</span>
                        </h1>
                        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '440px' }}>
                            A dedicated space for students and educators to collaborate, study, and grow together with advanced academic tools.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                            <button onClick={createInstantMeeting} className="btn-primary" style={{ padding: '12px 24px', fontSize: '1rem', borderRadius: '4px' }}>
                                <Plus size={20} /> New meeting
                            </button>
                            
                            <form onSubmit={joinMeeting} style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--glass-border)', borderRadius: '4px', padding: '4px 8px', background: 'rgba(255,255,255,0.05)' }}>
                                <Play size={20} style={{ margin: '0 8px', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Enter a code or link"
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    style={{ background: 'none', border: 'none', padding: '8px', color: 'white', outline: 'none', width: '200px' }}
                                />
                                <button type="submit" disabled={!roomName} style={{ background: 'none', border: 'none', color: roomName ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', padding: '8px 16px' }}>
                                    Join
                                </button>
                            </form>
                        </div>
                        
                    </motion.div>
                </div>

                {/* Right side: Visuals/Stats */}
                <div className="hero-visual" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card" 
                        style={{ width: '400px', padding: '30px', textAlign: 'center', borderRadius: '24px', position: 'relative' }}
                    >
                        <div style={{ width: '80px', height: '80px', background: 'var(--primary)', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Video size={40} color="white" />
                        </div>
                        <h2 style={{ marginBottom: '10px' }}>Your study room is ready</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>Stay connected with your crew and collaborate effectively with our shared whiteboard.</p>
                        
                        {user && (
                            <div className="stats-mini" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {stats.map((stat, i) => (
                                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', textAlign: 'left' }}>
                                        <stat.icon size={16} color={stat.color} style={{ marginBottom: '4px' }} />
                                        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{stat.value}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Home;
