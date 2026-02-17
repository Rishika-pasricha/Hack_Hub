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

module.exports = router;