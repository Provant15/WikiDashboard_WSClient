/* sockets/gopherCaught/index.js */
const User = require('../../models/User');
const GopherCatch = require('../../models/GopherCatch');

module.exports = (socket) => {
  socket.on('gopherCaught', async (...args) => {
    try {
      if (args.length < 7) {
        console.warn("Invalid gopherCaught event data:", args);
        return;
      }
      const username = args[2].trim().toLowerCase();
      const playerId = args[0];
      const totalGophersCaught = args[6];
      
      await User.updateOne({ username }, { $set: { totalGophersCaught } });
      const now = new Date();
      await GopherCatch.create({ playerId, username, timestamp: now });
      console.log(`${username} has caught the gopher. They've now caught ${totalGophersCaught} gophers.`);
    } catch (error) {
      console.error("Error processing gopherCaught event:", error);
    }
  });
};
