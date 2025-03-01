require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../../models/User');
const Stats = require('../../models/Stats');
const OnlineUser = require('../../models/OnlineUser');

module.exports = (socket) => {
  socket.on('playerDisconnected', async (data) => {
    if (!data) {
      console.warn(`[playerDisconnected] Received null or undefined playerDisconnected event. Ignoring.`);
      return;
    }

    const eventArray = Array.isArray(data) ? data : [data];

    for (const event of eventArray) {
      if (!event?.username?.trim() || event.playerCount == null) {
        console.warn(`[playerDisconnected] Invalid event data in playerDisconnected. Skipping.`);
        continue;
      }

      const username = event.username.trim().toLowerCase();
      const disconnectTime = new Date();

      const MAX_RETRIES = 3;
      let transactionSuccessful = false;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        let user = null;
        let userSession = null;
        const session = await mongoose.startSession();
        try {
          session.startTransaction();
      
          user = await User.findOne(
            {
              username,
              "sessions": { $elemMatch: { playerId: event.playerId, endTime: { $exists: false } } }
            }
          ).session(session);
      
          if (!user) {
            console.warn(`[playerDisconnected] User ${username} not found or already logged out.`);
            break;
          }
      
          userSession = user.sessions.find(s => s.playerId === event.playerId && !s.endTime);
          if (!userSession) {
            console.warn(`[playerDisconnected] Active session not found for ${username} (playerId: ${event.playerId}). Skipping.`);
            break;
          }
      
          let rawDuration = disconnectTime - new Date(userSession.startTime);
          let sessionDuration = Math.max(1, rawDuration);
      
          if (userSession.roomHistory?.length > 0) {
            const lastRoom = userSession.roomHistory[userSession.roomHistory.length - 1];
            if (!lastRoom.exitedAt) {
              lastRoom.exitedAt = disconnectTime;
            }
          }
      
          const updateResult = await User.updateOne(
            { username, "sessions._id": userSession._id },
            {
              $set: {
                "sessions.$.endTime": disconnectTime,
                "sessions.$.duration": sessionDuration,
                "sessions.$.roomHistory.$[last].exitedAt": disconnectTime,
                isOnline: false,
                currentRoom: ""
              }
            },
            {
              session,
              arrayFilters: [{ "last.exitedAt": { $exists: false } }]
            }
          );
      
          if (updateResult.matchedCount === 0) {
            console.warn(`[playerDisconnected] Update failed for user ${username}. Possibly already updated.`);
            break;
          }
      
          console.log(`[playerDisconnected] User ${username} has logged out. Session duration: ${sessionDuration}ms`);
      
          await OnlineUser.deleteOne({ user: user._id }).session(session);
      
          await session.commitTransaction();
          break;
        } catch (error) {
          await session.abortTransaction();
      
          if (error.errorLabels?.includes("TransientTransactionError")) {
            console.warn(`[playerDisconnected] Write conflict detected for user ${username} (userId: ${user?._id || 'unknown'}, sessionId: ${userSession?._id || 'unknown'}) (Attempt ${attempt}/${MAX_RETRIES}). Retrying...`);
            if (attempt < MAX_RETRIES) {
              const retryDelay = Math.random() * 200 * attempt;
              await new Promise(res => setTimeout(res, retryDelay));
            } else {
              console.error(`[playerDisconnected] Max retries reached for ${username}. Transaction failed.`);
            }
          } else {
            console.error(`[playerDisconnected] Error processing playerDisconnected for ${username}:`, error);
            break;
          }
        } finally {
          session.endSession();
        }
      }      

      try {
        await Stats.findOneAndUpdate(
          { name: "global" },
          {
            $set: { currentOnline: event.playerCount, lastUpdated: disconnectTime },
            $push: { onlineHistory: { timestamp: disconnectTime, count: event.playerCount } }
          },
          { upsert: true }
        );
        console.log(`[playerDisconnected] Online count updated: ${event.playerCount} players currently online.`);
      } catch (err) {
        console.error(`[playerDisconnected] Failed to update global stats:`, err);
      }
    }
  });
};