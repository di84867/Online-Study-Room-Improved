const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MEETINGS_FILE = path.join(DATA_DIR, 'meetings.json');
const ORGS_FILE = path.join(DATA_DIR, 'organizations.json');
const COURSES_FILE = path.join(DATA_DIR, 'courses.json');
const CLASSES_FILE = path.join(DATA_DIR, 'classes.json');

// Ensure data files exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
[USERS_FILE, MEETINGS_FILE, ORGS_FILE, COURSES_FILE, CLASSES_FILE].forEach(file => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
});

const readJSON = (file) => {
    try {
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

const writeJSON = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// --- Organization Operations ---
const createOrganization = (orgData) => {
    const orgs = readJSON(ORGS_FILE);
    const newOrg = { _id: uuidv4(), ...orgData, createdAt: new Date() };
    orgs.push(newOrg);
    writeJSON(ORGS_FILE, orgs);
    return newOrg;
};

const findOrgByDomain = (domain) => {
    const orgs = readJSON(ORGS_FILE);
    return orgs.find(o => o.domain.toLowerCase() === domain.toLowerCase());
};

const getOrganization = (id) => {
    return readJSON(ORGS_FILE).find(o => o._id === id);
};

// --- User Operations ---
const findUserByEmail = (email) => {
    const users = readJSON(USERS_FILE);
    return users.find(u => u.email === email);
};

const createUser = (userData) => {
    const users = readJSON(USERS_FILE);
    const newUser = { 
        _id: uuidv4(), 
        orgId: userData.orgId || null,
        role: userData.role || 'student', // student, teacher, admin, owner
        ...userData 
    };
    users.push(newUser);
    writeJSON(USERS_FILE, users);
    return newUser;
};

const getUsersByOrg = (orgId) => {
    return readJSON(USERS_FILE).filter(u => u.orgId === orgId);
};

const updateUser = (email, updates) => {
    const users = readJSON(USERS_FILE);
    const index = users.findIndex(u => u.email === email);
    if (index !== -1) {
        users[index] = { ...users[index], ...updates };
        writeJSON(USERS_FILE, users);
        return users[index];
    }
    return null;
};

// --- Course & Class Operations ---
const createCourse = (courseData) => {
    const courses = readJSON(COURSES_FILE);
    const newCourse = { _id: uuidv4(), ...courseData };
    courses.push(newCourse);
    writeJSON(COURSES_FILE, courses);
    return newCourse;
};

const getCoursesByOrg = (orgId) => {
    return readJSON(COURSES_FILE).filter(c => c.orgId === orgId);
};

const createClass = (classData) => {
    const classes = readJSON(CLASSES_FILE);
    const newClass = { _id: uuidv4(), ...classData };
    classes.push(newClass);
    writeJSON(CLASSES_FILE, classes);
    return newClass;
};

const getClassesByCourse = (courseId) => {
    return readJSON(CLASSES_FILE).filter(c => c.courseId === courseId);
};

const generateRoomId = () => {
    return 'OSR' + Math.floor(1000 + Math.random() * 9000);
};

// --- Meeting Operations ---
const createMeeting = (meetingData) => {
    const meetings = readJSON(MEETINGS_FILE);
    const roomId = meetingData.roomId || generateRoomId();
    const newMeeting = { 
        _id: uuidv4(), 
        ...meetingData,
        roomId: roomId,
        status: 'scheduled',
        mode: meetingData.mode || 'closed', // 'open' or 'closed'
        handRaisedUsers: [],
        blockedChat: false
    };
    meetings.push(newMeeting);
    writeJSON(MEETINGS_FILE, meetings);
    return newMeeting;
};

const updateMeeting = (id, updates) => {
    const meetings = readJSON(MEETINGS_FILE);
    const index = meetings.findIndex(m => m._id === id || m.roomId === id);
    if (index !== -1) {
        meetings[index] = { ...meetings[index], ...updates };
        writeJSON(MEETINGS_FILE, meetings);
        return meetings[index];
    }
    return null;
};

const getMeetings = () => {
    return readJSON(MEETINGS_FILE);
};

module.exports = {
    // Org
    createOrganization,
    findOrgByDomain,
    getOrganization,
    // User
    findUserByEmail,
    createUser,
    getUsersByOrg,
    updateUser,
    // Courses/Classes
    createCourse,
    getCoursesByOrg,
    createClass,
    getClassesByCourse,
    // Meetings
    createMeeting,
    updateMeeting,
    getMeetings
};

