const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for social login
    displayName: { type: String, required: true },
    photoURL: { type: String },
    provider: { type: String, required: true, enum: ['local', 'google', 'facebook'] },
    isAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
