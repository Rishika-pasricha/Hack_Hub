const mongoose = require('../config/db');

const userSchema= new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    profileImageUrl: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true },
    otp: String,
    otpExpiry: Date,
    removedProductsCount: { type: Number, default: 0 },
    uploadBanUntil: { type: Date, default: null },
    reportNotifications: {
        type: [
            {
                type: { type: String, enum: ['product_reported', 'product_removed'], default: 'product_reported' },
                productId: { type: String, required: true },
                productName: { type: String, required: true },
                message: { type: String, required: true },
                createdAt: { type: Date, default: Date.now }
            }
        ],
        default: []
    },
    issueCompletionNotifications: {
        type: [
            {
                issueId: { type: String, required: true },
                issueSubject: { type: String, required: true },
                municipalityName: { type: String, required: true },
                message: { type: String, required: true },
                read: { type: Boolean, default: false },
                createdAt: { type: Date, default: Date.now }
            }
        ],
        default: []
    },
    createdAt: { type: Date, default: Date.now }
})

function dedupeIssueCompletionNotifications(entries) {
    const latestByIssueId = new Map();

    for (const entry of entries || []) {
        const issueId = String(entry?.issueId || '').trim();
        if (!issueId) {
            continue;
        }

        const prev = latestByIssueId.get(issueId);
        const currentCreatedAt = entry?.createdAt ? new Date(entry.createdAt).getTime() : 0;
        const prevCreatedAt = prev?.createdAt ? new Date(prev.createdAt).getTime() : 0;

        if (!prev || currentCreatedAt >= prevCreatedAt) {
            latestByIssueId.set(issueId, {
                issueId,
                issueSubject: String(entry?.issueSubject || '').trim(),
                municipalityName: String(entry?.municipalityName || '').trim(),
                message: String(entry?.message || '').trim(),
                read: Boolean(entry?.read),
                createdAt: entry?.createdAt || new Date(0)
            });
            continue;
        }

        if (entry?.read) {
            prev.read = true;
        }
    }

    return Array.from(latestByIssueId.values());
}

userSchema.pre('save', function dedupeNotifications(next) {
    if (!this.isModified('issueCompletionNotifications')) {
        next();
        return;
    }

    this.issueCompletionNotifications = dedupeIssueCompletionNotifications(this.issueCompletionNotifications || []);
    next();
});

userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema)
