/* models/YarnbloomCatch.js */
const mongoose = require('mongoose');

const yarnbloomCatchSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  username: { type: String, required: true },
  color: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

yarnbloomCatchSchema.index({ color: 1, timestamp: 1 });
yarnbloomCatchSchema.index({ username: 1 });

module.exports = mongoose.model('YarnbloomCatch', yarnbloomCatchSchema);
