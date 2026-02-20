const mongoose = require('../config/db');

const municipalitySchema = new mongoose.Schema(
  {
    district: { type: String, trim: true, required: true },
    municipalityName: { type: String, trim: true, required: true },
    municipalityType: { type: String, trim: true, required: true },
    areaSqKm: { type: Number, required: true },
    population: { type: Number, required: true },
    contactEmail: { type: String, trim: true, lowercase: true, required: true, unique: true },
    contactPhone: { type: String, trim: true, required: true }
  },
  { timestamps: true }
);

municipalitySchema.index({ contactEmail: 1 }, { unique: true });

module.exports = mongoose.model('Municipality', municipalitySchema);
