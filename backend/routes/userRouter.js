const usermodel = require('../models/usermodel');
const Municipality = require('../models/municipalityModel');
const BlogPost = require('../models/blogPostModel');
const Issue = require('../models/issueModel');

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { generateOTP, sendOTPEmail } = require('../utils/emailService');
const { isMunicipalityEmail } = require('../utils/municipalityEmails');

function normalizeText(input) {
    return String(input || '').trim();
}

router.post('/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const normalizedEmail = String(email).toLowerCase();

        if (isMunicipalityEmail(normalizedEmail)) {
            return res.status(409).json({ error: 'Municipality accounts are managed by admin' });
        }

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

router.get('/municipality/by-district', async (req, res) => {
    const districtQuery = normalizeText(req.query.district).toLowerCase();

    if (!districtQuery) {
        return res.status(400).json({ error: 'district is required' });
    }

    try {
        let municipality = await Municipality.findOne({
            district: { $regex: `^${districtQuery}$`, $options: 'i' }
        });

        if (!municipality) {
            municipality = await Municipality.findOne({
                district: { $regex: districtQuery, $options: 'i' }
            });
        }

        if (!municipality) {
            municipality = await Municipality.findOne({
                municipalityName: { $regex: districtQuery, $options: 'i' }
            });
        }

        if (!municipality) {
            return res.status(404).json({ error: 'No municipality found for provided location' });
        }

        return res.status(200).json({
            district: municipality.district,
            municipalityName: municipality.municipalityName,
            municipalityType: municipality.municipalityType,
            contactEmail: municipality.contactEmail,
            contactPhone: municipality.contactPhone
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch municipality details' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const normalizedEmail = String(email).toLowerCase();

        if (isMunicipalityEmail(normalizedEmail)) {
            const municipality = await Municipality.findOne({ contactEmail: normalizedEmail });

            if (!municipality) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            if (String(password) !== municipality.adminPassword) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            return res.status(200).json({
                id: municipality._id,
                firstName: municipality.municipalityName,
                lastName: municipality.district,
                email: municipality.contactEmail,
                role: 'admin'
            });
        }

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
            role: 'user'
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to login' });
    }
});

router.get('/blogs', async (req, res) => {
    const municipalityEmail = normalizeText(req.query.municipalityEmail).toLowerCase();

    try {
        const filter = { status: 'approved' };
        if (municipalityEmail) {
            filter.municipalityEmail = municipalityEmail;
        }

        const posts = await BlogPost.find(filter).sort({ approvedAt: -1, createdAt: -1 }).limit(200);
        return res.status(200).json(posts);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to load blogs' });
    }
});

router.post('/blogs/submit', async (req, res) => {
    const { title, content, authorName, authorEmail, municipalityEmail } = req.body;

    if (!title || !content || !authorName || !authorEmail || !municipalityEmail) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const normalizedMunicipalityEmail = String(municipalityEmail).toLowerCase().trim();
        const municipality = await Municipality.findOne({ contactEmail: normalizedMunicipalityEmail });

        if (!municipality) {
            return res.status(400).json({ error: 'Invalid municipality selected' });
        }

        const post = await BlogPost.create({
            title: String(title),
            content: String(content),
            authorName: String(authorName),
            authorEmail: String(authorEmail).toLowerCase().trim(),
            municipalityEmail: normalizedMunicipalityEmail,
            sourceType: 'user',
            status: 'pending'
        });

        return res.status(201).json({
            id: post._id,
            message: 'Blog submitted for municipality approval'
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to submit blog' });
    }
});

router.post('/issues/submit', async (req, res) => {
    const { subject, description, userName, userEmail, municipalityEmail } = req.body;

    if (!subject || !description || !userName || !userEmail || !municipalityEmail) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const normalizedMunicipalityEmail = String(municipalityEmail).toLowerCase().trim();
        const municipality = await Municipality.findOne({ contactEmail: normalizedMunicipalityEmail });

        if (!municipality) {
            return res.status(400).json({ error: 'Invalid municipality selected' });
        }

        const issue = await Issue.create({
            subject: String(subject),
            description: String(description),
            userName: String(userName),
            userEmail: String(userEmail).toLowerCase().trim(),
            municipalityEmail: normalizedMunicipalityEmail
        });

        return res.status(201).json({
            id: issue._id,
            message: 'Issue submitted successfully'
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to submit issue' });
    }
});

router.get('/admin/pending-blogs', async (req, res) => {
    const municipalityEmail = normalizeText(req.query.municipalityEmail).toLowerCase();

    if (!municipalityEmail) {
        return res.status(400).json({ error: 'municipalityEmail is required' });
    }

    try {
        const posts = await BlogPost.find({
            municipalityEmail,
            status: 'pending'
        }).sort({ createdAt: -1 });

        return res.status(200).json(posts);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to load pending blogs' });
    }
});

router.patch('/admin/blogs/:id/approve', async (req, res) => {
    const { id } = req.params;
    const municipalityEmail = normalizeText(req.body.municipalityEmail).toLowerCase();

    if (!municipalityEmail) {
        return res.status(400).json({ error: 'municipalityEmail is required' });
    }

    try {
        const updated = await BlogPost.findOneAndUpdate(
            { _id: id, municipalityEmail, status: 'pending' },
            { status: 'approved', approvedAt: new Date() },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Pending blog not found' });
        }

        return res.status(200).json({ message: 'Blog approved successfully' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to approve blog' });
    }
});

router.get('/admin/issues', async (req, res) => {
    const municipalityEmail = normalizeText(req.query.municipalityEmail).toLowerCase();

    if (!municipalityEmail) {
        return res.status(400).json({ error: 'municipalityEmail is required' });
    }

    try {
        const issues = await Issue.find({ municipalityEmail }).sort({ createdAt: -1 }).limit(200);
        return res.status(200).json(issues);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to load municipality issues' });
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
