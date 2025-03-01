/* sockets/index.js */
module.exports = (socket) => {
    require('./newPlayer')(socket);
    require('./gopherCaught')(socket);
    require('./resetYarnbloom')(socket);
    require('./updateYarnblooms')(socket);
    require('./playerChangedRoom')(socket);
    require('./playerDisconnected')(socket);
    require('./randomizeLookResult')(socket);
    require('./updateDeviceCategory')(socket);
  };
  