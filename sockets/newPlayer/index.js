require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../../models/User');
const Stats = require('../../models/Stats');
const OnlineUser = require('../../models/OnlineUser');
const decompressPlayerData = require('../../utils/decompressPlayerData');

/**
 * Handles newPlayer event with conflict resolution and decoupled Stats update.
 */
module.exports = (socket) => {
  socket.on('newPlayer', async (playerData) => {
    if (!playerData?.username?.trim()) {
      console.warn(`[newPlayer] Invalid or missing username. Skipping newPlayer event.`);
      return;
    }

    playerData = decompressPlayerData(playerData);
    const username = playerData.username.trim().toLowerCase();
    const deviceCategory = playerData.deviceCategory || "unknown";
    const loginTime = new Date();
    const startingRoom = playerData.room || "";
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        let user = await User.findOne({ username }).session(session);

        if (user) {
          let sessionsClosed = 0;
          user.sessions.forEach(sess => {
            if (!sess.endTime) {
              sess.endTime = loginTime;
              if (sess.startTime) {
                sess.duration = loginTime - new Date(sess.startTime);
              }
              sessionsClosed++;
            }
          });

          if (sessionsClosed > 0) {
            await user.save({ session });
            console.log(`[newPlayer] Closed ${sessionsClosed} active session(s) for user ${username}.`);
          }
        }

        const updateData = {
          lastLogin: loginTime,
          isOnline: true,
          currentRoom: startingRoom,
          gems: playerData.gems || 0,
          likes: playerData.likes || 0,
          likesGiven: playerData.likesGiven || 0,
          badges: playerData.badges || [],
          fish: playerData.fish || [],
          pixels: playerData.pixels || 0,
          role: playerData.role || 0,
          dateJoined: playerData.dateJoined ? new Date(parseInt(playerData.dateJoined)) : undefined,
          lastFishTime: playerData.lastFishTime ? new Date(playerData.lastFishTime) : undefined,
          bio: playerData.bio || "",
          color: playerData.color || "",
          outfit: {
            bottomDesign: playerData.bottomDesign || "",
            bottomColor: playerData.bottomColor || "",
            topDesign: playerData.topDesign || "",
            topColor: playerData.topColor || "",
            hairDesign: playerData.hairDesign || "",
            hairColor: playerData.hairColor || "",
            changeLookBottomColor: playerData.changeLookBottomColor || "",
            changeLookTopColor: playerData.changeLookTopColor || "",
            changeLookHairColor: playerData.changeLookHairColor || ""
          }
        };

        user = await User.findOneAndUpdate(
          { username },
          {
            $set: updateData,
            $push: {
              sessions: {
                playerId: playerData.playerId,
                startTime: loginTime,
                deviceCategory,
                loginTimestamp: loginTime,
                roomHistory: [{ room: startingRoom, enteredAt: loginTime }]
              }
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true, session }
        );

        console.log(`[newPlayer] ${username} has logged in. They are now in room ${startingRoom}.`);

        await OnlineUser.findOneAndUpdate(
          { user: user._id },
          {
            $set: {
              username: user.username,
              playerId: playerData.playerId,
              color: playerData.color || "",
              currentRoom: startingRoom,
              deviceCategory
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true, session }
        );

        await session.commitTransaction();
        session.endSession();

        try {
          const updatedStats = await Stats.findOneAndUpdate(
            { name: "global" },
            { $inc: { currentOnline: 1 } },
            { upsert: true, new: true }
          );
          await Stats.updateOne(
            { name: "global" },
            { $push: { onlineHistory: { timestamp: new Date(), count: updatedStats.currentOnline } } }
          );
          console.log(`[newPlayer] Online count updated: ${updatedStats.currentOnline} players currently online.`);
        } catch (statsError) {
          console.error(`[newPlayer] Failed to update global stats:`, statsError);
        }

        break;
      } catch (error) {
        await session.abortTransaction();
        session.endSession();

        if (error.code === 112) {
          console.warn(`[newPlayer] WriteConflict detected for ${username} (Attempt ${attempt}/${maxRetries}). Retrying...`);
          if (attempt < maxRetries) {
            const retryDelay = 100 * Math.pow(2, attempt);
            await new Promise(res => setTimeout(res, retryDelay));
          } else {
            console.error(`[newPlayer] Max retries reached for ${username}. Transaction failed.`);
            break;
          }
        } else {
          console.error(`[newPlayer] Error processing newPlayer event for ${username}:`, error);
          break;
        }
      }
    }
  });
};
