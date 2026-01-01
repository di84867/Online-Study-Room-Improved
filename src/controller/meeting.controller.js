const Meeting = require("../models/Meeting");

const createMeeting = async (req, res) => {
    try {
        const { title, date, time, duration, creator, roomId } = req.body;

        if (!title || !date || !time || !creator || !roomId) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const meeting = new Meeting({
            title,
            date: new Date(date),
            time,
            duration,
            creator,
            roomId
        });

        await meeting.save();
        res.status(201).json(meeting);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error while creating meeting" });
    }
};

const getMeetings = async (req, res) => {
    try {
        const meetings = await Meeting.find().sort({ date: 1, time: 1 });
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
