const mongoose = require('mongoose');

const onlineUserSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  playerId: { type: String, required: true },
  color: { type: String, required: false, default: null },
  currentRoom: { type: String, default: "" },
  deviceCategory: { type: String, default: "unknown" }
});

onlineUserSchema.index({ currentRoom: 1 });

module.exports = mongoose.model('OnlineUser', onlineUserSchema);
