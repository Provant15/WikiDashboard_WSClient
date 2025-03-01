/* models/User.js */
const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  badgeId: Number,
  badgeName: String,
  badgeImage: String,
  badgeOrder: Number,
  badgeFamily: String
}, { _id: false });

const fishSchema = new mongoose.Schema({
  fish: String,
  count: Number
}, { _id: false });

const outfitSchema = new mongoose.Schema({
  bottomDesign: { type: String, default: "" },
  bottomColor: { type: String, default: "" },
  topDesign: { type: String, default: "" },
  topColor: { type: String, default: "" },
  hairDesign: { type: String, default: "" },
  hairColor: { type: String, default: "" },
  changeLookBottomColor: { type: String, default: "" },
  changeLookTopColor: { type: String, default: "" },
  changeLookHairColor: { type: String, default: "" }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  playerId: String,
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  duration: Number,
  deviceCategory: String,
  loginTimestamp: { type: Date, default: Date.now },
  roomHistory: [
    {
      room: { type: String, required: true },
      enteredAt: { type: Date, default: Date.now },
      exitedAt: { type: Date }
    }
  ]
});

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, lowercase: true },
  dateJoined: { type: Date },
  bio: { type: String, default: "" },
  isOnline: { type: Boolean, default: false },
  currentRoom: { type: String, default: "" },
  color: { type: String, default: "" },
  role: { type: Number, default: 0 },
  pixels: { type: Number, default: 0 },
  gems: { type: Number, default: 0 },
  firstLogin: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  likesGiven: { type: Number, default: 0 },
  badges: { type: [badgeSchema], default: [] },
  fish: { type: [fishSchema], default: [] },
  lastFishTime: { type: Date },
  totalGophersCaught: { type: Number, default: 0 },
  totalYarnbloomsCaught: { type: Number, default: 0 },
  outfit: { type: outfitSchema, default: {} },
  sessions: [sessionSchema],
  timesSearched: { type: Number, default: 0 }
});

userSchema.index({ isOnline: 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ "sessions.startTime": 1, "sessions.endTime": 1 });
userSchema.index({ timesSearched: -1 });

module.exports = mongoose.model('User', userSchema);
