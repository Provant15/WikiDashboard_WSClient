/* models/GopherCatch.js */
const mongoose = require('mongoose');

const gopherCatchSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  username: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

gopherCatchSchema.index({ username: 1, timestamp: 1 });

module.exports = mongoose.model('GopherCatch', gopherCatchSchema);
