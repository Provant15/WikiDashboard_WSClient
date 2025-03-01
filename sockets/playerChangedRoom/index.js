require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../../models/User');
const OnlineUser = require('../../models/OnlineUser');
const decompressPlayerData = require('../../utils/decompressPlayerData');

module.exports = (socket) => {
  socket.on('playerChangedRoom', async (playerData) => {
    const MAX_RETRIES = 5;
    const RETRY_BACKOFF = 200;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        
        if (!playerData?.username?.trim()) {
          console.warn("Invalid or missing username. Skipping playerChangedRoom event.");
          await session.abortTransaction();
          session.endSession();
          return;
        }

        playerData = decompressPlayerData(playerData);
        const username = playerData.username.trim().toLowerCase();
        const newRoom = playerData.room || "";
        const updateTime = new Date();

        let user = await User.findOne({ username }).session(session);
        if (!user) {
          console.warn(`[playerChangedRoom] User ${username} not found. Skipping update.`);
          await session.abortTransaction();
          session.endSession();
          return;
        }

        if (user.currentRoom === newRoom) {
          console.warn(`[playerChangedRoom] User ${username} already in room ${newRoom}. Skipping.`);
          await session.abortTransaction();
          session.endSession();
          return;
        }

        const activeSession = user.sessions.find(sess => !sess.endTime);
        if (!activeSession) {
          console.warn(`[playerChangedRoom] No active session found for ${username}. Skipping.`);
          await session.abortTransaction();
          session.endSession();
          return;
        }

        if (!activeSession.roomHistory) {
          activeSession.roomHistory = [];
        }

        if (activeSession.roomHistory.length > 0) {
          const lastRoomIndex = activeSession.roomHistory.length - 1;
          if (!activeSession.roomHistory[lastRoomIndex].exitedAt) {
            await User.updateOne(
              { username, "sessions._id": activeSession._id },
              { $set: { [`sessions.$.roomHistory.${lastRoomIndex}.exitedAt`]: updateTime } },
              { session }
            );
          }
        }

        await User.updateOne(
          { username, "sessions._id": activeSession._id },
          { 
            $push: { "sessions.$.roomHistory": { room: newRoom, enteredAt: updateTime } },
            $set: { currentRoom: newRoom, lastRoomChange: updateTime }
          },
          { session }
        );

        const onlineUserUpdate = await OnlineUser.findOneAndUpdate(
          { user: user._id },
          { $set: { currentRoom: newRoom } },
          { new: true, session }
        );

        if (!onlineUserUpdate) {
          console.warn(`[playerChangedRoom] OnlineUser entry not found for ${username}. Possibly disconnected.`);
        }

        console.log(`[playerChangedRoom] User ${username} moved to room: ${newRoom} (Updated in User & OnlineUser).`);

        await session.commitTransaction();
        session.endSession();
        break;
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        if (error.code === 112) {
          console.warn(`[playerChangedRoom] WriteConflict detected for ${playerData.username} (Attempt ${attempt}/${MAX_RETRIES}). Retrying...`);
          if (attempt < MAX_RETRIES) {
            const retryDelay = RETRY_BACKOFF * attempt;
            await new Promise(res => setTimeout(res, retryDelay));
          } else {
            console.error(`Max retries reached for ${playerData.username}. Transaction failed.`);
            break;
          }
        } else {
          console.error(`Error processing playerChangedRoom event for ${playerData.username}:`, error);
          break;
        }
      }
    }
  });
};
