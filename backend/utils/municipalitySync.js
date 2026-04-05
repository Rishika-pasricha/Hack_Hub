const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Municipality = require('../models/municipalityModel');

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

async function syncMunicipalitiesFromCsv() {
  const defaultMunicipalityPassword = process.env.MUNICIPALITY_DEFAULT_PASSWORD || '';
  const generatedFallbackPassword = crypto.randomBytes(18).toString('base64url');

  if (!defaultMunicipalityPassword) {
    console.warn('MUNICIPALITY_DEFAULT_PASSWORD not set; using generated password only for newly inserted municipalities.');
  }

  const csvPath = path.resolve(__dirname, '..', '..', 'municipality_dataset.csv');
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const lines = csvText.split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) {
    throw new Error('CSV file has no data rows');
  }

  const headers = parseCsvLine(lines[0]);
  const idx = {
    district: headers.indexOf('District'),
    municipalityName: headers.indexOf('Municipality_Name'),
    municipalityType: headers.indexOf('Municipality_Type'),
    areaSqKm: headers.indexOf('Area_SqKm'),
    population: headers.indexOf('Population'),
    contactEmail: headers.indexOf('Contact_Email'),
    contactPhone: headers.indexOf('Contact_Phone')
  };

  const missing = Object.entries(idx)
    .filter(([, value]) => value === -1)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`CSV missing expected columns: ${missing.join(', ')}`);
  }

  let upserts = 0;

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);

    const district = cols[idx.district];
    const municipalityName = cols[idx.municipalityName];
    const municipalityType = cols[idx.municipalityType];
    const areaSqKm = Number(cols[idx.areaSqKm]);
    const population = Number(cols[idx.population]);
    const contactEmail = String(cols[idx.contactEmail] || '').toLowerCase().trim();
    const contactPhone = cols[idx.contactPhone];

    if (!district || !municipalityName || !municipalityType || !contactEmail) {
      continue;
    }

    await Municipality.updateOne(
      { contactEmail },
      {
        $set: {
          district,
          municipalityName,
          municipalityType,
          areaSqKm: Number.isFinite(areaSqKm) ? areaSqKm : 0,
          population: Number.isFinite(population) ? population : 0,
          contactEmail,
          contactPhone
        },
        $setOnInsert: {
          adminPassword: defaultMunicipalityPassword || generatedFallbackPassword
        }
      },
      { upsert: true }
    );

    upserts += 1;
  }

  return { upserts };
}

module.exports = {
  syncMunicipalitiesFromCsv
};
