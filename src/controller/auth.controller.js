const db = require('../db/localdb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_super_secret_key_change_this';

// Helper to extract domain from email
const getDomain = (email) => email.split('@')[1];

exports.registerOrganization = async (req, res) => {
    try {
        const { email, password, displayName, orgName, domain } = req.body;

        const existingUser = db.findUserByEmail(email);
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const existingOrg = db.findOrgByDomain(domain);
        if (existingOrg) return res.status(400).json({ message: 'Organization domain already registered' });

        const hashedPassword = await bcrypt.hash(password, 12);
        
        // 1. Create Org
        const org = db.createOrganization({
            name: orgName,
            domain: domain.toLowerCase(),
            settings: { restrictToDomain: true }
        });

        // 2. Create Owner User
        const user = db.createUser({
            email,
            password: hashedPassword,
            displayName,
            orgId: org._id,
            role: 'owner',
            provider: 'local',
            photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
        });

        const token = jwt.sign({ userId: user._id, orgId: org._id, role: 'owner' }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            token,
            user: {
                _id: user._id,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: user.role,
                orgId: user.orgId
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

exports.signup = async (req, res) => {
    try {
        const { email, password, displayName } = req.body;
        const domain = getDomain(email);

        const existingUser = db.findUserByEmail(email);
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        // Domain Check (Now optional)
        const org = db.findOrgByDomain(domain);
        
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = db.createUser({
            email,
            password: hashedPassword,
            displayName,
            orgId: org ? org._id : null,
            role: org ? 'student' : 'user', 
            provider: 'local',
            photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
        });

        const token = jwt.sign({ userId: user._id, orgId: user.orgId, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            token,
            user: {
                _id: user._id,
                email: user.email,
                displayName: user.displayName,
                role: user.role,
                orgId: user.orgId,
                photoURL: user.photoURL
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = db.findUserByEmail(email);

        if (!user || user.provider !== 'local') {
            return res.status(404).json({ message: 'Account not found.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id, orgId: user.orgId, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                _id: user._id,
                email: user.email,
                displayName: user.displayName,
                role: user.role,
                orgId: user.orgId,
                photoURL: user.photoURL,
                dob: user.dob,
                bio: user.bio
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.socialAuth = async (req, res) => {
    try {
        const { email, displayName, photoURL, provider } = req.body;
        const domain = getDomain(email);
        
        let org = db.findOrgByDomain(domain);
        let user = db.findUserByEmail(email);

        if (!user) {
            user = db.createUser({
                email,
                displayName,
                photoURL: photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
                provider,
                orgId: org ? org._id : null,
                role: org ? 'student' : 'user'
            });
        }

        const token = jwt.sign({ userId: user._id, orgId: user.orgId, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                _id: user._id,
                email: user.email,
                displayName: user.displayName,
                role: user.role,
                orgId: user.orgId,
                photoURL: user.photoURL
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { email, displayName, photoURL, dob, bio } = req.body;
        const updatedUser = db.updateUser(email, { displayName, photoURL, dob, bio });
        
        if (!updatedUser) return res.status(404).json({ message: 'User not found' });
        
        res.json({
            message: 'Profile updated successfully',
            user: {
                _id: updatedUser._id,
                email: updatedUser.email,
                displayName: updatedUser.displayName,
                role: updatedUser.role,
                orgId: updatedUser.orgId,
                photoURL: updatedUser.photoURL,
                dob: updatedUser.dob,
                bio: updatedUser.bio
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update profile' });
    }
};

// --- Admin Features ---
exports.getOrgUsers = async (req, res) => {
    try {
        const { orgId } = req.query;
        if (!orgId) return res.status(400).json({ message: 'OrgId required' });
        
        const users = db.getUsersByOrg(orgId);
        res.json(users.map(u => ({
            _id: u._id,
            email: u.email,
            displayName: u.displayName,
            role: u.role,
            courseId: u.courseId
        })));
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};

exports.addOrgUser = async (req, res) => {
    try {
        const { email, displayName, role, orgId, courseId } = req.body;
        
        const existing = db.findUserByEmail(email);
        if (existing) return res.status(400).json({ message: 'User already exists' });

        const newUser = db.createUser({
            email,
            displayName,
            role: role || 'student',
            orgId,
            courseId,
            password: await bcrypt.hash('password123', 12), // Default password
            provider: 'local',
            photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
        });

        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ message: 'Failed to add user' });
    }
};

