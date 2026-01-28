const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MEETINGS_FILE = path.join(DATA_DIR, 'meetings.json');

// Ensure data files exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
if (!fs.existsSync(MEETINGS_FILE)) fs.writeFileSync(MEETINGS_FILE, '[]');

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

// User Operations
const findUserByEmail = (email) => {
    const users = readJSON(USERS_FILE);
    return users.find(u => u.email === email);
};

const createUser = (userData) => {
    const users = readJSON(USERS_FILE);
    const newUser = { _id: uuidv4(), ...userData };
    users.push(newUser);
    writeJSON(USERS_FILE, users);
    return newUser;
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

const generateRoomId = () => {
    return 'OSR' + Math.floor(1000 + Math.random() * 9000); // e.g. OSR4052
};

// Meeting Operations
const createMeeting = (meetingData) => {
    const meetings = readJSON(MEETINGS_FILE);
    const roomId = meetingData.roomId || generateRoomId(); // Prefer provided ID or generate
    // Ensure uniqueness if generated (simple check)
    // while(meetings.find(m => m.roomId === roomId)) { roomId = generateRoomId(); } 
    
    // We store the 'roomId' field for display, but _id is internal. 
    // Actually, user wants "room code". Let's use roomId for that.
    
    const newMeeting = { 
        _id: uuidv4(), 
        ...meetingData,
        roomId: roomId, // Ensure roomId is set
        status: 'scheduled' // 'scheduled', 'active', 'ended'
    };
    meetings.push(newMeeting);
    writeJSON(MEETINGS_FILE, meetings);
    return newMeeting;
};

const getMeetings = () => {
    return readJSON(MEETINGS_FILE);
};

module.exports = {
    findUserByEmail,
    createUser,
    updateUser,
    createMeeting,
    getMeetings
};
