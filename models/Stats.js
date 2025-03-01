/* models/Stats.js */
const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  currentOnline: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  onlineHistory: [
    {
      timestamp: { type: Date, default: Date.now },
      count: { type: Number, required: true }
    }
  ]
});

statsSchema.index({ "onlineHistory.timestamp": -1 });
statsSchema.index({ currentOnline: 1 });

module.exports = mongoose.model('Stats', statsSchema);
