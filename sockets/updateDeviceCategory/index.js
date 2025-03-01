/* sockets/updateDeviceCategory/index.js */
const User = require('../../models/User');

module.exports = (socket) => {
  socket.on('updateDeviceCategory', async (data) => {
    try {
      if (typeof data !== 'object' || !data.playerId || !data.deviceCategory) {
        console.warn("Invalid updateDeviceCategory event data:", data);
        return;
      }
      const playerId = data.playerId;
      const newDeviceCategory = data.deviceCategory;
      
      const updatedUser = await User.findOneAndUpdate(
        { "sessions": { $elemMatch: { playerId, endTime: { $exists: false } } } },
        { $set: { "sessions.$[elem].deviceCategory": newDeviceCategory } },
        {
          arrayFilters: [{ "elem.playerId": playerId, "elem.endTime": { $exists: false } }],
          new: true,
          projection: { username: 1 } 
        }
      );

      if (updatedUser) {
        console.log(`Updated deviceCategory for active sessions for user "${updatedUser.username}" (playerId: ${playerId}) to ${newDeviceCategory}`);
      } else {
        console.log(`No active session found for playerId: ${playerId}.`);
      }
    } catch (error) {
      console.error("Error processing updateDeviceCategory event:", error);
    }
  });
};
