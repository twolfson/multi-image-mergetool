// Load in our dependencies
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');

// Create our helpers
exports.rimraf = function (filepath) {
  before(function rimrafFn (done) {
    rimraf(filepath, function handleError (err) {
      // If the error was about file not existing, reset it
      if (err && err.code === 'ENOENT') {
        err = null;
      }

      // Callback
      done(err);
    });
  });
};
exports.mkdirp = function (filepath) {
  before(function mkdirpFn (done) {
    mkdirp(filepath, done);
  });
};
exports.resetDir = function (filepath) {
  exports.rimraf(filepath);
  exports.mkdirp(filepath);
};
