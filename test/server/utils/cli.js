// Load in our dependencies
var assert = require('assert');
var _cliParse = require('../../../server/cli')._parse;
var logger = require('../../../server/logger');
var sinonUtils = require('../../utils/sinon');

// Define our helpers
exports.parse = function (argv, options) {
  // Fallback our options
  options = options || {};

  // Stub out logger.info
  sinonUtils.stub(logger, 'info', function saveLoggerLog (buff) {
    this.loggerInfo = (this.loggerInfo || '') + buff.toString() + '\n';
  });
  after(function cleanup () {
    delete this.loggerInfo;
  });

  // Run our main function
  before(function runParse (done) {
    // Run cliParse, save results, and callback
    var that = this;
    _cliParse(argv, function handleCliParse (err, exitCode) {
      that.err = err;
      that.exitCode = exitCode;

      // If we have an expected exit code
      var expectedExitCode = options.expectedExitCode !== undefined ? options.expectedExitCode : 0;
      if (expectedExitCode !== null) {
        assert.strictEqual(err, null);
        assert.strictEqual(exitCode, expectedExitCode, 'Expected exit code "' + expectedExitCode + '" ' +
          'but received "' + exitCode + '" and logger.info "' + that.loggerInfo + '"');
      }
      done();
    });
  });
  after(function cleanup () {
    delete this.err;
    delete this.exitCode;
  });
};
