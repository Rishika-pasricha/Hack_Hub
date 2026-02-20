const fs = require('fs');
const path = require('path');

function loadMunicipalityEmails() {
    const csvPath = path.resolve(__dirname, '..', '..', 'municipality_dataset.csv');

    try {
        const csv = fs.readFileSync(csvPath, 'utf8');
        const lines = csv.split(/\r?\n/).filter(Boolean);

        if (lines.length === 0) {
            return new Set();
        }

        const headers = lines[0].split(',').map((header) => header.trim());
        const emailIndex = headers.indexOf('Contact_Email');

        if (emailIndex === -1) {
            return new Set();
        }

        const emails = new Set();

        for (let i = 1; i < lines.length; i += 1) {
            const columns = lines[i].split(',');
            const rawEmail = columns[emailIndex];

            if (!rawEmail) {
                continue;
            }

            const normalizedEmail = rawEmail.trim().toLowerCase();
            if (normalizedEmail) {
                emails.add(normalizedEmail);
            }
        }

        return emails;
    } catch (error) {
        console.error('Failed to load municipality_dataset.csv:', error.message);
        return new Set();
    }
}

const municipalityEmails = loadMunicipalityEmails();

function isMunicipalityEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    return municipalityEmails.has(normalized);
}

module.exports = {
    isMunicipalityEmail
};
