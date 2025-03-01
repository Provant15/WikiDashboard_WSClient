/* sockets/updateYarnblooms/index.js */
const UpcomingYarn = require('../../models/UpcomingYarn');
const pako = require('pako');

module.exports = (socket) => {
  socket.on('updateYarnblooms', async (data) => {
    try {
      const compressedUint8Array = new Uint8Array(data);
      const decompressedUint8Array = pako.inflate(compressedUint8Array);
      const decompressedString = new TextDecoder().decode(decompressedUint8Array);
      const yarnArray = JSON.parse(decompressedString);
      
      for (const yarn of yarnArray) {
        const updateData = {
          x: yarn.x,
          y: yarn.y,
          state: yarn.state,
          color: yarn.color
        };
        await UpcomingYarn.updateOne(
          { x: yarn.x, y: yarn.y },
          { $set: updateData },
          { upsert: true }
        );
      }
      console.log("Upcoming yarns updated successfully.");
    } catch (error) {
      console.error("Error processing updateYarnblooms event:", error);
    }
  });
};
