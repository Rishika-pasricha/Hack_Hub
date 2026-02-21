const usermodel = require('../models/usermodel');
const Municipality = require('../models/municipalityModel');
const BlogPost = require('../models/blogPostModel');
const Issue = require('../models/issueModel');
const Product = require('../models/productModel');

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { generateOTP, sendOTPEmail } = require('../utils/emailService');
const { isMunicipalityEmail } = require('../utils/municipalityEmails');

function normalizeText(input) {
    return String(input || '').trim();
}

function escapeRegex(text) {
    return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isBase64ImageDataUrl(value) {
    const normalized = String(value || '').trim();
    return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(normalized);
}

function isBase64MediaDataUrl(value) {
    const normalized = String(value || '').trim();
    return /^data:(image|video)\/[a-zA-Z0-9.+-]+;base64,/.test(normalized);
}

router.post('/register', async (req, res) => {
    const { firstName, lastName, area, email, password } = req.body;

    if (!firstName || !lastName || !area || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const normalizedEmail = String(email).toLowerCase();
        const normalizedArea = String(area).trim();

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
            area: normalizedArea,
            email: normalizedEmail,
            passwordHash
        });
        return res.status(201).json({
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            area: user.area
        });
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        return res.status(500).json({ error: 'Failed to create user' });
    }
});

router.get('/municipality/by-area', async (req, res) => {
    const areaQuery = normalizeText(req.query.area).toLowerCase();

    if (!areaQuery) {
        return res.status(400).json({ error: 'area is required' });
    }

    try {
        let municipality = await Municipality.findOne({
            municipalityName: { $regex: `^${escapeRegex(areaQuery)}$`, $options: 'i' }
        });

        if (!municipality) {
            municipality = await Municipality.findOne({
                municipalityName: { $regex: escapeRegex(areaQuery), $options: 'i' }
            });
        }

        if (!municipality) {
            municipality = await Municipality.findOne({
                district: { $regex: escapeRegex(areaQuery), $options: 'i' }
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
                area: municipality.municipalityName,
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
            area: user.area || user.district || '',
            role: 'user'
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to login' });
    }
});

router.get('/blogs', async (req, res) => {
    const municipalityEmail = normalizeText(req.query.municipalityEmail).toLowerCase();
    const userEmail = normalizeText(req.query.userEmail).toLowerCase();

    try {
        const filter = { status: 'approved' };
        if (municipalityEmail) {
            filter.municipalityEmail = municipalityEmail;
        }

        const posts = await BlogPost.find(filter).sort({ approvedAt: -1, createdAt: -1 }).limit(200).lean();
        const hydratedPosts = posts.map((post) => {
            const likes = Array.isArray(post.likes) ? post.likes : [];
            return {
                ...post,
                likesCount: likes.length,
                likedByCurrentUser: userEmail ? likes.includes(userEmail) : false
            };
        });
        return res.status(200).json(hydratedPosts);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to load blogs' });
    }
});

router.patch('/blogs/:id/like', async (req, res) => {
    const { id } = req.params;
    const userEmail = normalizeText(req.body.userEmail).toLowerCase();

    if (!userEmail) {
        return res.status(400).json({ error: 'userEmail is required' });
    }

    try {
        const post = await BlogPost.findOne({ _id: id, status: 'approved' });

        if (!post) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        const likes = Array.isArray(post.likes) ? post.likes : [];
        const alreadyLiked = likes.includes(userEmail);
        post.likes = alreadyLiked
            ? likes.filter((email) => email !== userEmail)
            : [...likes, userEmail];

        await post.save();

        return res.status(200).json({
            liked: !alreadyLiked,
            likesCount: post.likes.length,
            message: alreadyLiked ? 'Post unliked' : 'Post liked'
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to update like status' });
    }
});

router.post('/blogs/submit', async (req, res) => {
    const { title, content, authorName, authorEmail, municipalityEmail, media } = req.body;
    const normalizedContent = String(content || '').trim();
    const normalizedMedia = Array.isArray(media) ? media : [];

    if (!title || !authorName || !authorEmail || !municipalityEmail) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!normalizedContent && normalizedMedia.length === 0) {
        return res.status(400).json({ error: 'Add text content or attach media to create a post' });
    }

    if (normalizedMedia.length > 4) {
        return res.status(400).json({ error: 'You can attach up to 4 media items per post' });
    }

    const sanitizedMedia = [];
    for (const mediaItem of normalizedMedia) {
        const mediaType = normalizeText(mediaItem?.mediaType).toLowerCase();
        const mediaUrl = String(mediaItem?.mediaUrl || '').trim();

        if (!['image', 'video'].includes(mediaType)) {
            return res.status(400).json({ error: 'Unsupported media type in post attachments' });
        }

        if (!isBase64MediaDataUrl(mediaUrl)) {
            return res.status(400).json({ error: 'Attached media must be a base64 image/video' });
        }

        if (!mediaUrl.startsWith(`data:${mediaType}/`)) {
            return res.status(400).json({ error: 'Media type does not match attached data' });
        }

        sanitizedMedia.push({ mediaType, mediaUrl });
    }

    try {
        const normalizedMunicipalityEmail = String(municipalityEmail).toLowerCase().trim();
        const municipality = await Municipality.findOne({ contactEmail: normalizedMunicipalityEmail });

        if (!municipality) {
            return res.status(400).json({ error: 'Invalid municipality selected' });
        }

        const post = await BlogPost.create({
            title: String(title),
            content: normalizedContent,
            authorName: String(authorName),
            authorEmail: String(authorEmail).toLowerCase().trim(),
            municipalityEmail: normalizedMunicipalityEmail,
            media: sanitizedMedia,
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

router.get('/issues/my', async (req, res) => {
    const userEmail = normalizeText(req.query.userEmail).toLowerCase();

    if (!userEmail) {
        return res.status(400).json({ error: 'userEmail is required' });
    }

    try {
        const issues = await Issue.find({ userEmail }).sort({ createdAt: -1 }).limit(200);
        return res.status(200).json(issues);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to load user issues' });
    }
});

router.patch('/issues/:id/resolve', async (req, res) => {
    const { id } = req.params;
    const userEmail = normalizeText(req.body.userEmail).toLowerCase();

    if (!userEmail) {
        return res.status(400).json({ error: 'userEmail is required' });
    }

    try {
        const updated = await Issue.findOneAndUpdate(
            { _id: id, userEmail, status: 'open' },
            { status: 'resolved' },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Open issue not found for this user' });
        }

        return res.status(200).json({ message: 'Issue marked as resolved' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to resolve issue' });
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
        const issues = await Issue.find({ municipalityEmail, status: 'open' }).sort({ createdAt: -1 }).limit(200);
        return res.status(200).json(issues);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to load municipality issues' });
    }
});

router.get('/products', async (_req, res) => {
    try {
        const products = await Product.find({}).sort({ createdAt: -1 }).limit(500);
        return res.status(200).json(products);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to load products' });
    }
});

router.get('/products/my', async (req, res) => {
    const sellerEmail = normalizeText(req.query.sellerEmail).toLowerCase();

    if (!sellerEmail) {
        return res.status(400).json({ error: 'sellerEmail is required' });
    }

    try {
        const products = await Product.find({ sellerEmail }).sort({ createdAt: -1 }).limit(500);
        return res.status(200).json(products);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to load your products' });
    }
});

router.post('/products/submit', async (req, res) => {
    const { productName, description, price, productImageUrl, sellerName, sellerEmail, city } = req.body;

    if (!productName || !price || !productImageUrl || !sellerName || !sellerEmail || !city) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ error: 'Price must be a positive number' });
    }

    if (!isBase64ImageDataUrl(productImageUrl)) {
        return res.status(400).json({ error: 'Please upload image from gallery' });
    }

    try {
        const product = await Product.create({
            productName: String(productName).trim(),
            description: String(description || '').trim(),
            price: parsedPrice,
            productImageUrl: String(productImageUrl).trim(),
            sellerName: String(sellerName).trim(),
            sellerEmail: String(sellerEmail).toLowerCase().trim(),
            city: String(city).trim()
        });

        return res.status(201).json({
            id: product._id,
            message: 'Product uploaded successfully'
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to upload product' });
    }
});

router.patch('/products/:id', async (req, res) => {
    const { id } = req.params;
    const { sellerEmail, productName, description, price, city, productImageUrl } = req.body;
    const normalizedSellerEmail = normalizeText(sellerEmail).toLowerCase();

    if (!normalizedSellerEmail) {
        return res.status(400).json({ error: 'sellerEmail is required' });
    }

    if (!productName || !price || !city) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ error: 'Price must be a positive number' });
    }

    try {
        const updateDoc = {
            productName: String(productName).trim(),
            description: String(description || '').trim(),
            price: parsedPrice,
            city: String(city).trim()
        };
        if (productImageUrl) {
            if (!isBase64ImageDataUrl(productImageUrl)) {
                return res.status(400).json({ error: 'Please upload image from gallery' });
            }
            updateDoc.productImageUrl = String(productImageUrl).trim();
        }

        const updated = await Product.findOneAndUpdate(
            { _id: id, sellerEmail: normalizedSellerEmail },
            updateDoc,
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Product not found for this account' });
        }

        return res.status(200).json({ message: 'Product updated successfully' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to update product' });
    }
});

router.delete('/products/:id', async (req, res) => {
    const { id } = req.params;
    const normalizedSellerEmail = normalizeText(req.body.sellerEmail).toLowerCase();

    if (!normalizedSellerEmail) {
        return res.status(400).json({ error: 'sellerEmail is required' });
    }

    try {
        const deleted = await Product.findOneAndDelete({
            _id: id,
            sellerEmail: normalizedSellerEmail
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Product not found for this account' });
        }

        return res.status(200).json({ message: 'Product deleted successfully' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to delete product' });
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
