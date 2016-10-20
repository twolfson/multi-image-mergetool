// Load in our dependencies
var server = require('./server');

// Define our configuration
exports.rootUrl = 'http://' + server.LISTEN_HOSTNAME + ':' + server.LISTEN_PORT;
exports.browsers = {
  Firefox: {
    desiredCapabilities: {
      browserName: 'firefox'
    },
    // Default to large screen as our window size
    windowSize: '1024x1600',

    // Restrict to 1 suite per session to prevent issues like mouse down sticking
    suitesPerSession: 1
  }
};

