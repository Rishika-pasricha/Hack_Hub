const usermodel = require('../models/usermodel');

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { generateOTP, sendOTPEmail } = require('../utils/emailService');
const { isMunicipalityEmail } = require('../utils/municipalityEmails');

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
        return res.status(201).json({
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
        });
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(409).json({ error: 'Email already registered' });
        }
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
            email: user.email,
            role: isMunicipalityEmail(normalizedEmail) ? 'admin' : 'user'
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to login' });
    }
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    console.log('Forgot password request for:', email);

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const normalizedEmail = String(email).toLowerCase();

        if (isMunicipalityEmail(normalizedEmail)) {
            return res.status(403).json({ error: 'Password reset is not available for municipality accounts' });
        }

        const user = await usermodel.findOne({ email: normalizedEmail });

        if (!user) {
            // Don't reveal if email exists or not for security
            return res.status(200).json({ message: 'If email exists, OTP has been sent' });
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        console.log('Generated OTP:', otp);

        await usermodel.updateOne(
            { email: normalizedEmail },
            { otp, otpExpiry }
        );

        console.log('OTP saved to database');

        const emailSent = await sendOTPEmail(email, otp);
        
        if (!emailSent) {
            console.log('Failed to send email');
            return res.status(500).json({ error: 'Failed to send OTP email' });
        }

        console.log('OTP email sent successfully');

        return res.status(200).json({ message: 'OTP sent to your email' });
    } catch (err) {
        console.error('Forgot password error:', err);
        return res.status(500).json({ error: 'Failed to process request' });
    }
});

router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    try {
        const normalizedEmail = String(email).toLowerCase();

        if (isMunicipalityEmail(normalizedEmail)) {
            return res.status(403).json({ error: 'Password reset is not available for municipality accounts' });
        }

        const user = await usermodel.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email' });
        }

        if (!user.otp || user.otp !== String(otp)) {
            return res.status(401).json({ error: 'Invalid OTP' });
        }

        if (new Date() > user.otpExpiry) {
            return res.status(401).json({ error: 'OTP has expired' });
        }

        // OTP is valid, return success
        return res.status(200).json({ message: 'OTP verified successfully', verified: true });
    } catch (err) {
        console.error('OTP verification error:', err);
        return res.status(500).json({ error: 'Failed to verify OTP' });
    }
});

router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
        const normalizedEmail = String(email).toLowerCase();

        if (isMunicipalityEmail(normalizedEmail)) {
            return res.status(403).json({ error: 'Password reset is not available for municipality accounts' });
        }

        const user = await usermodel.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email' });
        }

        if (!user.otp || user.otp !== String(otp)) {
            return res.status(401).json({ error: 'Invalid OTP' });
        }

        if (new Date() > user.otpExpiry) {
            return res.status(401).json({ error: 'OTP has expired' });
        }

        // Hash new password and update
        const passwordHash = await bcrypt.hash(String(newPassword), 10);
        
        await usermodel.updateOne(
            { email: normalizedEmail },
            { 
                passwordHash,
                otp: null,
                otpExpiry: null
            }
        );

        return res.status(200).json({ message: 'Password reset successful' });
    } catch (err) {
        console.error('Password reset error:', err);
        return res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;
