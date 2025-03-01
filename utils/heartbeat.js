/* utils/heartbeat.js */
const BASE_URL = "https://pulse.owp.au/api/push/Q5Qkbg2YcjrYEorZ0AEfJjlw9mxT0sf6";

/**
 * Sends a heartbeat update with the given status.
 * @param {string} status - The status to send ("up" or "down").
 */
async function sendHeartbeat(status = "up") {
  try {
    const start = Date.now();
    const response = await fetch(BASE_URL);
    const ping = Date.now() - start;

    if (!response.ok) {
      console.error(`Error! Heartbeat failed: ${response.status} - ${response.statusText}`);
    }

    const msg = status === "up" ? "OK" : "DISCONNECTED";
    const pingResponse = await fetch(`${BASE_URL}?status=${status}&msg=${msg}&ping=${ping}`);
    if (!pingResponse.ok) {
      console.error(`Error! Ping update failed: ${pingResponse.status} - ${pingResponse.statusText}`);
    } else {
      console.log(`Ping value (${ping}ms) sent successfully with status ${status}.`);
    }
  } catch (error) {
    console.error("Error sending heartbeat:", error);
  }
}

module.exports = sendHeartbeat;