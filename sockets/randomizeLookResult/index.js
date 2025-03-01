/* sockets/randomizeLookResult/index.js */
const User = require('../../models/User');

module.exports = (socket) => {
  socket.on('randomizeLookResult', async (data) => {
    try {
      const payload = Array.isArray(data) ? data[0] : data;

      if (typeof payload !== 'object' || !payload.playerId) {
        console.warn("Invalid randomizeLookResult event data:", data);
        return;
      }

      const playerId = payload.playerId;

      const newOutfit = {
        bottomDesign: payload.bottomDesign,
        bottomColor: payload.bottomColor,
        topDesign: payload.topDesign,
        topColor: payload.topColor,
        hairDesign: payload.hairDesign,
        hairColor: payload.hairColor,
        changeLookBottomColor: payload.changeLookBottomColor,
        changeLookTopColor: payload.changeLookTopColor,
        changeLookHairColor: payload.changeLookHairColor,
      };

      const updatedUser = await User.findOneAndUpdate(
        { "sessions": { $elemMatch: { playerId, endTime: { $exists: false } } } },
        { $set: { outfit: newOutfit } },
        { new: true, projection: { username: 1 } }
      );

      if (updatedUser) {
        console.log(`Updated outfit for active session for user "${updatedUser.username}" (playerId: ${playerId}).`);
      } else {
        console.log(`No active session found for playerId: ${playerId}.`);
      }
    } catch (error) {
      console.error("Error processing randomizeLookResult event:", error);
    }
  });
};
