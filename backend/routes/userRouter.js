const usermodel = require('../models/usermodel');

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

router.post('/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const normalizedEmail = String(email).toLowerCase();
        const existingUser = await usermodel.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(String(password), 10);
        const user = await usermodel.create({
            firstName,
            lastName,
            email: normalizedEmail,
            passwordHash
        });
        return res.status(201).json(user);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to create user' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const normalizedEmail = String(email).toLowerCase();
        const user = await usermodel.findOne({ email: normalizedEmail });
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isPasswordValid = await bcrypt.compare(String(password), user.passwordHash);
        
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        return res.status(200).json({
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to login' });
    }
});

module.exports = router;