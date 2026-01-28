const db = require('../db/localdb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_super_secret_key_change_this'; // In production, use env variables

exports.signup = async (req, res) => {
    try {
        const { email, password, displayName } = req.body;

        const existingUser = db.findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = db.createUser({
            email,
            password: hashedPassword,
            displayName,
            provider: 'local',
            isAdmin: email.toLowerCase().includes('admin'),
            photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
        });

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            token,
            user: {
                _id: user._id,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                isAdmin: user.isAdmin
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = db.findUserByEmail(email);
        // Ensure provider is local if not specified, 
        // but simple email check is usually fine or check user.provider
        if (!user || user.provider !== 'local') {
            return res.status(404).json({ message: 'Account not found. Please create an account first.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                _id: user._id,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                isAdmin: user.isAdmin
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.socialAuth = async (req, res) => {
    try {
        const { email, displayName, photoURL, provider } = req.body;

        let user = db.findUserByEmail(email);

        if (!user) {
            // Create new user if doesn't exist
            user = db.createUser({
                email,
                displayName,
                photoURL,
                provider,
                isAdmin: email.toLowerCase().includes('admin')
            });
        } else {
            // Update user info if they exist
            user = db.updateUser(email, { displayName, photoURL });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                _id: user._id,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                isAdmin: user.isAdmin
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
