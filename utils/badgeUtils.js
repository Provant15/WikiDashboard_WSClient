/* utils/badgeUtils.js */
function processBadges(badges) {
    return badges.map(badge => {
      if (badge.badgeFamily == null) {
        const name = badge.badgeName.toLowerCase();
        if (name.includes("christmas")) {
          badge.badgeFamily = "christmas";
        } else if (name.includes("valentine")) {
          badge.badgeFamily = "valentine";
        } else if (name.includes("pixawards")) {
          badge.badgeFamily = "pixawards";
        } else if (name.includes("yarnbloom")) {
          badge.badgeFamily = "yarnbloomHarvester";
        } else if (name.includes("gopher")) {
          badge.badgeFamily = "gopherCatcher";
        } else if (name.includes("master angler")) {
          badge.badgeFamily = "masterAngler";
        } else {
          badge.badgeFamily = "default";
        }
      }
      return badge;
    });
  }
  
  module.exports = processBadges;
  