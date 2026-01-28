const db = require('../db/localdb');
const { v4: uuidv4 } = require('uuid');

const createMeeting = async (req, res) => {
    try {
        const { title, date, time, duration, creator, roomId } = req.body;

        if (!title || !date || !time || !creator || !roomId) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const meeting = db.createMeeting({
            title,
            date: new Date(date),
            time,
            duration,
            creator,
            roomId
        });

        res.status(201).json(meeting);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error while creating meeting" });
    }
};

const getMeetings = async (req, res) => {
    try {
        const meetings = db.getMeetings().sort((a, b) => new Date(a.date) - new Date(b.date));
        res.json(meetings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error while fetching meetings" });
    }
};

module.exports = {
    createMeeting,
    getMeetings
};
