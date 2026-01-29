import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, Layers, Plus, Shield, UserPlus, Mail, Trash2 } from 'lucide-react';
import './Organization.css';

const Organization = ({ user }) => {
    const [activeTab, setActiveTab] = useState('courses');
    const [courses, setCourses] = useState([]);
    const [classes, setClasses] = useState([]);
    const [orgUsers, setOrgUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form fields
    const [newItem, setNewItem] = useState({ name: '', email: '', role: 'student', courseId: '', classId: '' });

    const fetchData = async () => {
        if (!user?.orgId) return;
        setLoading(true);
        try {
            const [coursesRes, usersRes] = await Promise.all([
                fetch(`/api/org/courses?orgId=${user.orgId}`),
                fetch(`/api/org/users?orgId=${user.orgId}`)
            ]);
            setCourses(await coursesRes.json());
            setOrgUsers(await usersRes.json());
        } catch (err) {
            console.error("Fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [user?.orgId]);

    const handleAddItem = async (e) => {
        e.preventDefault();
        let endpoint = '';
        let body = { ...newItem, orgId: user.orgId };

        if (activeTab === 'courses') endpoint = '/api/org/courses';
        if (activeTab === 'classes') endpoint = '/api/org/classes';
        if (activeTab === 'users') endpoint = '/api/org/users';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setNewItem({ name: '', email: '', role: 'student', courseId: '', classId: '' });
                fetchData();
            }
        } catch (err) { console.error(err); }
    };

    if (user?.role !== 'owner') {
        return <div className="p-10 text-center"><h1>Access Denied</h1><p>Only organization owners can access this panel.</p></div>;
    }

    return (
        <div className="org-container">
            <header className="org-header">
                <div>
                    <h1>Manage <span style={{color:'var(--primary)'}}>Organization</span></h1>
                    <p>Hierarchical management of courses, sections, and students.</p>
                </div>
                <div className="org-badge">
                    <Shield size={16} /> Admin Panel
                </div>
            </header>

            <div className="org-tabs">
                <button className={activeTab === 'courses' ? 'active' : ''} onClick={() => setActiveTab('courses')}><BookOpen size={18}/> Courses</button>
                <button className={activeTab === 'classes' ? 'active' : ''} onClick={() => setActiveTab('classes')}><Layers size={18}/> Sections</button>
                <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}><Users size={18}/> Students & Staff</button>
            </div>

            <div className="org-content-grid">
                <div className="glass-card org-main-card">
                    {activeTab === 'courses' && (
                        <div className="item-list">
                            <h3>Active Courses</h3>
                            {courses.map(c => (
                                <div key={c._id} className="org-item">
                                    <div className="item-info">
                                        <div className="item-icon"><BookOpen size={20}/></div>
                                        <div>
                                            <strong>{c.name}</strong>
                                            <div className="meta">ID: {c._id.substring(0,8)}</div>
                                        </div>
                                    </div>
                                    <button className="delete-btn"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="item-list">
                            <h3>Directory</h3>
                            {orgUsers.map(u => (
                                <div key={u._id} className="org-item">
                                    <div className="item-info">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} alt="A" className="mini-avatar" />
                                        <div>
                                            <strong>{u.displayName}</strong>
                                            <div className="meta">{u.email} • <span className="role-tag">{u.role}</span></div>
                                        </div>
                                    </div>
                                    <div className="meta">Course: {courses.find(c => c._id === u.courseId)?.name || 'None'}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="glass-card org-sidebar-card">
                    <h3>Add New {activeTab.slice(0, -1)}</h3>
                    <form onSubmit={handleAddItem} className="org-form">
                        {activeTab === 'users' ? (
                            <>
                                <input type="text" placeholder="Full Name" required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value, displayName: e.target.value})} />
                                <input type="email" placeholder="Student Email (@domain)" required value={newItem.email} onChange={e => setNewItem({...newItem, email: e.target.value})} />
                                <select value={newItem.courseId} onChange={e => setNewItem({...newItem, courseId: e.target.value})}>
                                    <option value="">Select Course</option>
                                    {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                                <select value={newItem.role} onChange={e => setNewItem({...newItem, role: e.target.value})}>
                                    <option value="student">Student</option>
                                    <option value="teacher">Teacher</option>
                                </select>
                            </>
                        ) : (
                            <input type="text" placeholder={`${activeTab.slice(0, -1)} Name`} required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                        )}
                        <button type="submit" className="btn-primary w-full"><Plus size={18}/> Create {activeTab.slice(0, -1)}</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Organization;
