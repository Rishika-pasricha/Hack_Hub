require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('../config/db');
const User = require('../models/usermodel');

function normalizeText(value) {
  return String(value || '').trim();
}

function dedupe(entries) {
  const latestByIssueId = new Map();

  for (const entry of entries || []) {
    const issueId = normalizeText(entry?.issueId);
    if (!issueId) {
      continue;
    }

    const prev = latestByIssueId.get(issueId);
    const currentCreatedAt = entry?.createdAt ? new Date(entry.createdAt).getTime() : 0;
    const prevCreatedAt = prev?.createdAt ? new Date(prev.createdAt).getTime() : 0;

    if (!prev || currentCreatedAt >= prevCreatedAt) {
      latestByIssueId.set(issueId, {
        issueId,
        issueSubject: normalizeText(entry?.issueSubject),
        municipalityName: normalizeText(entry?.municipalityName),
        message: normalizeText(entry?.message),
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

async function run() {
  const users = await User.find({ 'issueCompletionNotifications.0': { $exists: true } }).select('issueCompletionNotifications');

  let updatedUsers = 0;
  let removedEntries = 0;

  for (const user of users) {
    const before = user.issueCompletionNotifications || [];
    const after = dedupe(before);

    if (after.length === before.length) {
      continue;
    }

    updatedUsers += 1;
    removedEntries += before.length - after.length;

    user.issueCompletionNotifications = after;
    await user.save();
  }

  console.log(`Issue notification dedupe complete. Users updated: ${updatedUsers}, duplicates removed: ${removedEntries}`);
}

run()
  .catch((err) => {
    console.error('Issue notification dedupe failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
