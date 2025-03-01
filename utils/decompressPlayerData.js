const pako = require('pako');
const processBadges = require('./badgeUtils.js');

/**
 * Decompresses compressed fields ("badges" and "fish") in the playerData.
 */
function decompressPlayerData(playerData) {
  ['badges', 'fish'].forEach(field => {
    const val = playerData[field];

    if (Buffer.isBuffer(val)) {
      try {
        const compressedUint8Array = new Uint8Array(val);
        const decompressedUint8Array = pako.inflate(compressedUint8Array);
        const decompressedString = new TextDecoder().decode(decompressedUint8Array);
        let parsed = JSON.parse(decompressedString);

        if (field === 'badges' && Array.isArray(parsed)) {
          parsed = processBadges(parsed);
        }

        playerData[field] = parsed;
      } catch (err) {
        console.error(`Error decompressing ${field}:`, err);
        playerData[field] = [];
      }
    }
  });

  return playerData;
}

module.exports = decompressPlayerData;
