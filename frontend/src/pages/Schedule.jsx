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
    const [duration, setDuration] = useState(60);

    const fetchMeetings = async () => {
        try {
            const res = await fetch('/api/meetings');
            const data = await res.json();
            if (res.ok) {
                setMeetings(data);
            }
        } catch (err) {
            console.error("Failed to fetch meetings:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMeetings();
    }, []);

    const handleSchedule = async (e) => {
        e.preventDefault();
        if (!user) {
            alert("Please login to schedule meetings");
            return;
        }

        const roomId = Math.random().toString(36).substring(2, 9);
        const meetingData = {
            title,
            date: date.toISOString(),
            time,
            duration,
            creator: user._id,
            roomId
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
                fetchMeetings();
            } else {
                const data = await res.json();
                alert(data.message || "Failed to schedule meeting");
            }
        } catch (err) {
            console.error(err);
            alert("Error connecting to server");
        }
    };

    const isSameDay = (d1, d2) => {
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    };

    const filteredMeetings = meetings.filter(m => isSameDay(m.date, date));

    return (
        <div className="schedule-container">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="schedule-header"
                style={{ marginBottom: '2rem' }}
            >
                <h1>Schedule <span style={{ color: 'var(--secondary)' }}>Meetings</span></h1>
                <p style={{ color: 'var(--text-muted)' }}>Organize and manage your upcoming study sessions.</p>
            </motion.div>

            <div className="schedule-content">
                <div className="upcoming-section">
                    <div className="section-header">
                        <h3>Meetings for {date.toDateString()}</h3>
                        <button className="btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={18} /> Schedule New
                        </button>
                    </div>

                    <div className="meetings-list">
                        {isLoading ? (
                            <div className="glass-card loading-state">
                                <LoaderIcon />
                                <p>Loading meetings...</p>
                            </div>
                        ) : filteredMeetings.length > 0 ? (
                            filteredMeetings.map((meeting) => (
                                <motion.div
                                    key={meeting._id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    whileHover={{ scale: 1.01 }}
                                    className="glass-card meeting-item"
                                >
                                    <div className="meeting-main">
                                        <div className="time-badge">
                                            <span className="label">TIME</span>
                                            <span className="value">{meeting.time}</span>
                                        </div>
                                        <div className="meeting-info">
                                            <h4>{meeting.title}</h4>
                                            <div className="meta">
                                                <span><Clock size={14} /> {meeting.duration} min</span>
                                                <span><Video size={14} /> ID: {meeting.roomId}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        className="btn-secondary join-btn"
                                        onClick={() => navigate(`/room/${meeting.roomId}`)}
                                    >
                                        Join Now
                                    </button>
                                </motion.div>
                            ))
                        ) : (
                            <div className="glass-card empty-state">
                                <CalendarIcon size={48} opacity={0.3} />
                                <p>No meetings scheduled for this day.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="calendar-section">
                    <div className="glass-card calendar-wrapper">
                        <Calendar
                            onChange={setDate}
                            value={date}
                            className="custom-calendar"
                        />
                    </div>

                    <div className="glass-card availability-card">
                        <h4>Session Insights</h4>
                        <div className="availability-stats">
                            <div className="stat">
                                <span className="stat-value">{meetings.length}</span>
                                <span className="stat-label">Total Meetings</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">{meetings.filter(m => new Date(m.date) > new Date()).length}</span>
                                <span className="stat-label">Upcoming</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="glass-card schedule-modal"
                        >
                            <div className="modal-header">
                                <h3>Schedule New Meeting</h3>
                                <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSchedule}>
                                <div className="form-group">
                                    <label>Meeting Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Physics Group Discussion"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Time</label>
                                        <input
                                            type="time"
                                            required
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Duration (mins)</label>
                                        <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                                            <option value={30}>30 min</option>
                                            <option value={60}>60 min</option>
                                            <option value={90}>90 min</option>
                                            <option value={120}>120 min</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Selected Date</label>
                                    <div className="date-display">{date.toDateString()}</div>
                                </div>
                                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                                    Confirm Schedule
                                </button>
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
