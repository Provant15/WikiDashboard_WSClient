/* models/UpcomingYarn.js */
const mongoose = require('mongoose');

const upcomingYarnSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  state: { type: Number, required: true },  // 0=Seed, 1=Sapling, 2=Budding, 3=Pre-bloom, 4=Full bloom
  color: { type: String, required: true },
  lastCollectedTime: { type: Date },
  stageDuration: { type: Number, default: 5 }
}, { timestamps: true });

upcomingYarnSchema.index({ x: 1, y: 1 }, { unique: true });

module.exports = mongoose.model('UpcomingYarn', upcomingYarnSchema);
