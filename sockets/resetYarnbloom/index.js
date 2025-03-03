const YarnbloomCatch = require('../../models/YarnbloomCatch');
const UpcomingYarn = require('../../models/UpcomingYarn');
const User = require('../../models/User');

module.exports = (socket) => {
  socket.on('resetYarnbloom', async (data) => {
    try {
      let eventObj;
      if (Array.isArray(data)) {
        if (data.length === 0) {
          console.warn("resetYarnbloom event array is empty:", data);
          return;
        }
        eventObj = data[0];
      } else if (typeof data === 'object' && data !== null) {
        eventObj = data;
      } else {
        console.warn("Invalid resetYarnbloom event data:", data);
        return;
      }
      
      const playerId = eventObj.playerId || "";
      const username = eventObj.username ? eventObj.username.trim().toLowerCase() : "";
      const catchColor = eventObj.oldColor ? eventObj.oldColor.trim().toLowerCase() : "";
      
      if (!username) {
        console.warn("No username found in resetYarnbloom event:", eventObj);
        return;
      }
      if (!catchColor) {
        console.warn("No oldColor found in resetYarnbloom event:", eventObj);
        return;
      }
      
      const catchDoc = {
        playerId,
        username,
        color: catchColor,
        timestamp: new Date()
      };
      await YarnbloomCatch.create(catchDoc);
      console.log(`${username} harvested a ${catchColor} yarnbloom`);
      
      await User.updateOne({ username }, { $inc: { totalYarnbloomsCaught: 1 } });

      if (eventObj.yarnbloomData && eventObj.yarnbloomData.x !== undefined && eventObj.yarnbloomData.y !== undefined) {
        const upcomingColor = eventObj.yarnbloomData.color
          ? eventObj.yarnbloomData.color.trim().toLowerCase()
          : "";

        const MAX_RETRIES = 5;
        let attempt = 0;
        let success = false;

        while (attempt < MAX_RETRIES && !success) {
          try {
            const result = await UpcomingYarn.updateOne(
              { x: eventObj.yarnbloomData.x, y: eventObj.yarnbloomData.y, state: 4 },
              { $set: { color: upcomingColor, lastCollectedTime: new Date(), state: 0 } },
              { upsert: true }
            );

            if (result.modifiedCount > 0) {
              success = true;
              console.log(`Yarnbloom at (${eventObj.yarnbloomData.x}, ${eventObj.yarnbloomData.y}) successfully reset to 0.`);
            } else {
              throw new Error("Update conflict detected, retrying...");
            }
          } catch (error) {
            attempt++;
            if (attempt < MAX_RETRIES) {
              console.warn(`Retry ${attempt}/${MAX_RETRIES} for resetting yarnbloom due to conflict.`);
              await new Promise(resolve => setTimeout(resolve, 50));
            } else {
              console.error("Failed to reset Yarnbloom after multiple attempts:", error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error processing resetYarnbloom event:", error);
    }
  });
};
