const db = require('../db/localdb');
const { v4: uuidv4 } = require('uuid');

const createMeeting = async (req, res) => {
    try {
        const { title, date, time, creator, roomId, isClosed, courseId, classId } = req.body;

        if (!title || !date || !time || !creator || !roomId) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const meeting = db.createMeeting({
            title,
            date: new Date(date),
            time,
            creator,
            roomId,
            isClosed,
            courseId,
            classId
        });

        res.status(201).json(meeting);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error while creating meeting" });
    }
};

const getMeetings = async (req, res) => {
    try {
        const { courseId } = req.query;
        let meetings = db.getMeetings();
        
        if (courseId) {
            meetings = meetings.filter(m => m.courseId === courseId);
        }

        meetings.sort((a, b) => new Date(a.date) - new Date(b.date));
        res.json(meetings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error while fetching meetings" });
    }
};

const createCourse = (req, res) => {
    try {
        const course = db.createCourse(req.body);
        res.status(201).json(course);
    } catch (err) { res.status(500).json({ message: "Error" }); }
};

const getCourses = (req, res) => {
    try {
        const { orgId } = req.query;
        res.json(db.getCoursesByOrg(orgId));
    } catch (err) { res.status(500).json({ message: "Error" }); }
};

const createClass = (req, res) => {
    try {
        const cls = db.createClass(req.body);
        res.status(201).json(cls);
    } catch (err) { res.status(500).json({ message: "Error" }); }
};

const getClasses = (req, res) => {
    try {
        const { courseId } = req.query;
        res.json(db.getClassesByCourse(courseId));
    } catch (err) { res.status(500).json({ message: "Error" }); }
};

module.exports = {
    createMeeting,
    getMeetings,
    createCourse,
    getCourses,
    createClass,
    getClasses
};
