import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Plus, X, Calendar as CalendarIcon, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Schedule.css';

const Schedule = ({ user }) => {
    const navigate = useNavigate();
    const [date, setDate] = useState(new Date());
    const [meetings, setMeetings] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Form State
    const [title, setTitle] = useState('');
    const [time, setTime] = useState('10:00');
    const [dateValue, setDateValue] = useState(new Date().toISOString().split('T')[0]);
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [isClosed, setIsClosed] = useState(false);

    const fetchMeetings = async () => {
        try {
            const url = user?.courseId ? `/api/meetings?courseId=${user.courseId}` : '/api/meetings';
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok) setMeetings(data);
        } catch (err) {
            console.error("Failed to fetch meetings:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCourses = async () => {
        if (user?.orgId) {
            const res = await fetch(`/api/org/courses?orgId=${user.orgId}`);
            if (res.ok) setCourses(await res.json());
        }
    };

    useEffect(() => { 
        fetchMeetings(); 
        if (user?.role === 'owner') fetchCourses();
    }, [user]);

    const handleSchedule = async (e) => {
        e.preventDefault();
        if (!user) return alert("Please login to schedule meetings");

        const roomId = 'OSR' + Math.floor(1000 + Math.random() * 9000);
        const meetingData = {
            title, 
            date: new Date(dateValue).toISOString(), 
            time, 
            creator: user._id, 
            roomId, 
            isClosed,
            courseId: selectedCourse || null
        };

        try {
            const res = await fetch('/api/meetings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(meetingData)
            });

            if (res.ok) {
                setShowModal(false);
                setTitle('');
                setSelectedCourse('');
                setIsClosed(false);
                fetchMeetings();
            }
        } catch (err) { console.error(err); }
    };

    const isSameDay = (d1, d2) => {
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    };

    const filteredMeetings = meetings.filter(m => isSameDay(m.date, date));

    // Mock Timetable Data for Organizational Feel
    const timetable = [
        { day: 'Monday', classes: [{ name: 'Computer Science (CS-301)', section: 'B', time: '09:00 AM' }, { name: 'Advanced Math', section: 'A', time: '11:30 AM' }] },
        { day: 'Wednesday', classes: [{ name: 'Digital Logic', section: 'B', time: '10:00 AM' }] },
        { day: 'Friday', classes: [{ name: 'Software Eng.', section: 'A', time: '02:00 PM' }] }
    ];

    return (
        <div className="schedule-container">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="schedule-header">
                <h1>Academic <span style={{ color: 'var(--secondary)' }}>Dashboard</span></h1>
                <p style={{ color: 'var(--text-muted)' }}>Manage your classes, meetings, and academic timetable.</p>
            </motion.div>

            <div className="schedule-content">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    className="upcoming-section"
                >
                    <div className="section-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Video size={24} color="var(--primary)" />
                            <h3>Sessions for {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                        </div>
                        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ boxShadow: '0 4px 15px rgba(26,115,232,0.3)' }}>
                            <Plus size={18} /> Schedule New
                        </button>
                    </div>

                    <div className="meetings-list">
                        {isLoading ? (
                            <div className="glass-card loading-state" style={{ padding: '60px', textAlign: 'center' }}>
                                <LoaderIcon />
                                <p style={{ marginTop: '20px', color: 'var(--text-muted)' }}>Retrieving your academic schedule...</p>
                            </div>
                        ) : filteredMeetings.length > 0 ? (
                            filteredMeetings.map((meeting) => {
                                const isCreator = user && user._id === meeting.creator;
                                return (
                                    <motion.div
                                        key={meeting._id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ y: -5 }}
                                        className="meeting-item"
                                        style={{ borderLeft: isCreator ? '6px solid var(--primary)' : '6px solid var(--secondary)' }}
                                    >
                                        <div className="meeting-main">
                                            <div className="time-badge">
                                                <span className="label">START</span>
                                                <span className="value">{meeting.time}</span>
                                            </div>
                                            <div className="meeting-info">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                                    <h4 style={{ margin: 0 }}>{meeting.title}</h4>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        {meeting.courseId && (
                                                            <span className="status-pill host" style={{ background: 'rgba(26,115,232,0.1)', color: 'var(--primary)' }}>
                                                                {courses.find(c => c._id === meeting.courseId)?.name || 'Course'}
                                                            </span>
                                                        )}
                                                        {meeting.isClosed && <span className="status-pill closed">Secure Mode</span>}
                                                        {isCreator && <span className="status-pill host">Host Profile</span>}
                                                    </div>
                                                </div>
                                                <div className="meta">
                                                    <span className="copy-id" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => {
                                                        navigator.clipboard.writeText(meeting.roomId);
                                                        alert("Room ID copied!");
                                                    }}>
                                                        <Video size={14} /> ID: <code style={{ color: 'var(--primary)', fontWeight: 700 }}>{meeting.roomId}</code>
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Users size={14} /> Organization: {user?.orgName || 'Global'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="meeting-actions">
                                            <button
                                                className={isCreator ? "btn-primary" : "btn-secondary"}
                                                onClick={() => navigate(`/room/${meeting.roomId}?host=${isCreator}&mode=${meeting.isClosed ? 'closed' : 'open'}`)}
                                                style={{ padding: '12px 28px', borderRadius: '12px', fontWeight: 600 }}
                                            >
                                                {isCreator ? "Start Session" : "Join Class"}
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="glass-card empty-state" style={{ padding: '80px 40px', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
                                <CalendarIcon size={64} color="var(--text-muted)" style={{ marginBottom: '24px', opacity: 0.2 }} />
                                <h3 style={{ fontWeight: 400, opacity: 0.7 }}>Clear Horizons</h3>
                                <p style={{ color: 'var(--text-muted)', maxWidth: '300px', margin: '12px auto' }}>No academic sessions are scheduled for this day. Use this time for self-study!</p>
                            </div>
                        )}
                    </div>

                    {/* Weekly Timetable View */}
                    <div className="timetable-section" style={{ marginTop: '48px' }}>
                        <div className="section-header" style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <CalendarIcon size={24} color="var(--secondary)" />
                                <h3>Weekly Academic Timetable</h3>
                            </div>
                        </div>
                        <div className="timetable-grid">
                            {timetable.map((day, idx) => (
                                <div key={idx} className="timetable-day-column shadow-premium">
                                    <h5 className="day-name" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '20px' }}>{day.day}</h5>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {day.classes.map((cls, cIdx) => (
                                            <div key={cIdx} className="class-token">
                                                <span className="class-time" style={{ color: 'var(--primary)' }}>{cls.time}</span>
                                                <span className="class-name" style={{ fontWeight: 600 }}>{cls.name}</span>
                                                <span className="class-meta">SEC-{cls.section}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, x: 20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    className="calendar-section"
                >
                    <div className="calendar-wrapper shadow-premium">
                        <Calendar onChange={setDate} value={date} className="custom-calendar" />
                    </div>
                    <div className="availability-card shadow-premium">
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                            <Clock size={20} color="var(--primary)" /> Academic Insights
                        </h4>
                        <div className="availability-stats">
                            <div className="stat">
                                <span className="stat-value">{meetings.length}</span>
                                <span className="stat-label">Total Sessions</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">{user?.role === 'owner' ? courses.length : '1'}</span>
                                <span className="stat-label">{user?.role === 'owner' ? 'Courses Managed' : 'Enrolled Course'}</span>
                            </div>
                        </div>
                        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '0.85rem' }}>
                            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                                You have <strong>{filteredMeetings.length}</strong> {filteredMeetings.length === 1 ? 'session' : 'sessions'} scheduled for {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="modal-overlay">
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="glass-card schedule-modal">
                            <div className="modal-header">
                                <h3>Organize New Session</h3>
                                <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSchedule}>
                                <div className="form-group">
                                    <label>Session Title</label>
                                    <input type="text" placeholder="e.g. Physics Section A" required value={title} onChange={(e) => setTitle(e.target.value)} />
                                </div>
                                {user?.role === 'owner' && (
                                    <div className="form-group">
                                        <label>Assign to Course (Optional)</label>
                                        <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} style={{ width: '100%', padding: '12px', background: 'var(--surface-hover)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none' }}>
                                            <option value="">Public / Unassigned</option>
                                            {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="form-row">
                                    <div className="form-group"><label>Date</label><input type="date" required value={dateValue} onChange={(e) => setDateValue(e.target.value)} /></div>
                                    <div className="form-group"><label>Time</label><input type="time" required value={time} onChange={(e) => setTime(e.target.value)} /></div>
                                </div>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(26, 115, 232, 0.05)', padding: '12px', borderRadius: '8px', cursor: 'pointer' }} onClick={() => setIsClosed(!isClosed)}>
                                    <div className={`mode-toggle ${isClosed ? 'active' : ''}`}>
                                        <div className="toggle-dot"></div>
                                    </div>
                                    <div>
                                        <label style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>Closed Meeting Mode</label>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>Students must be admitted by you to join.</p>
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1.5rem', height: '48px' }}>Schedule Session</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};


const LoaderIcon = () => (
    <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{ width: 40, height: 40, border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}
    />
);

export default Schedule;
