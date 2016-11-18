// Load in our dependencies
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

// Create our helpers
exports.tmpFile = function (filepath) {
  before(function setup () {
    // Create directory for file
    mkdirp.sync(path.dirname(filepath));

    // Remove any existing file
    try {
      fs.unlinkSync(filepath);
    } catch (err) {
      // If the error wasn't about the file not existing, throw the error
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  });
};
