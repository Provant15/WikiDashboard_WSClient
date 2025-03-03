require('dotenv').config();
const sendHeartbeat = require("./utils/heartbeat");
const io = require('socket.io-client');
const connectDB = require('./config/db');
const User = require('./models/User');
const Stats = require('./models/Stats');
const OnlineUser = require('./models/OnlineUser');

connectDB();

const SOCKET_URL = process.env.SOCKET_URL || 'https://play.pixadom.com';
let SOCKET_HEADERS = {};
try {
  SOCKET_HEADERS = JSON.parse(process.env.SOCKET_HEADERS || '{}');
} catch (error) {
  console.error("Invalid JSON format in SOCKET_HEADERS. Please check your .env file.");
  process.exit(1);
}

const socket = io(SOCKET_URL, {
  withCredentials: true,
  reconnection: false,
  extraHeaders: SOCKET_HEADERS,
  pingInterval: 1500,
  pingTimeout: 3000,
  secure: true 
});

require('./sockets')(socket);

let isConnected = false;
let reconnectAttempts = 0;
let heartbeatInterval = null;
let disconnectTimeout = null;

/**
 * Immediately marks all users as offline by:
 * - Setting the endTime for all sessions missing one,
 * - Calculating session durations,
 * - And updating the user's isOnline flag.
 */
async function markAllUsersOffline() {
  const disconnectTime = new Date();
  try {
    const onlineUsers = await User.find({ isOnline: true });
    for (const user of onlineUsers) {
      user.sessions.forEach(sess => {
        if (!sess.endTime) {
          sess.endTime = disconnectTime;
          if (sess.startTime) {
            sess.duration = disconnectTime - new Date(sess.startTime);
          }
        }
      });
      user.isOnline = false;
      user.markModified("sessions");
      await user.save();
      console.log(`Marked user ${user.username} offline, updated sessions.`);
    }
    await Stats.findOneAndUpdate(
      { name: "global" },
      {
        $set: { currentOnline: 0, lastUpdated: disconnectTime },
        $push: { onlineHistory: { timestamp: disconnectTime, count: 0 } }
      },
      { upsert: true }
    );
    console.warn("All users marked offline due to lost connection.");
  } catch (error) {
    console.error("Error marking users offline:", error);
  }
}

/**
 * Removes all documents from the OnlineUser collection.
 */
async function removeAllOnlineUsers() {
  try {
    await OnlineUser.deleteMany({});
    console.log("Successfully removed all online users from OnlineUser collection.");
  } catch (error) {
    console.error("Error while removing online users:", error);
  }
}

socket.on('connect', () => {
  if (disconnectTimeout) {
    clearTimeout(disconnectTimeout);
    disconnectTimeout = null;
  }

  isConnected = true;
  reconnectAttempts = 0;
  console.log("Connected to socket server");

  sendHeartbeat("up");

  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(() => {
      sendHeartbeat("up");
    }, 30000);
  }
});

socket.on('connect_error', (error) => {
  isConnected = false;
  console.error("Socket connection error:", error);
});

socket.on('disconnect', () => {
  isConnected = false;
  console.warn("Socket disconnected. Scheduling offline routines...");

  disconnectTimeout = setTimeout(async () => {
    if (!isConnected) {
      console.warn("No reconnection detected. Marking users offline and cleaning up online users.");
      await markAllUsersOffline();
      await removeAllOnlineUsers();

      sendHeartbeat("down");

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    }
  }, 1000);
});

setInterval(() => {
  if (!isConnected) {
    console.warn("Socket not connected. Attempting reconnection...");
    socket.connect();
    reconnectAttempts++;
    setTimeout(async () => {
      if (socket.connected) {
        console.log("Reconnected to server!");
        isConnected = true;
        reconnectAttempts = 0;
      } else {
        console.error(`Reconnection attempt ${reconnectAttempts} failed.`);
        if (reconnectAttempts === 1) {
          await markAllUsersOffline();
          await removeAllOnlineUsers();
        }
      }
    }, 1000);
  }
}, 1000);
