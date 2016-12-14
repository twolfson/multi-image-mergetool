// Load in our dependencies
var assert = require('assert');
var cli = require('../../../server/cli');
var logger = require('../../../server/logger');
var sinonUtils = require('../../utils/sinon');
var Multispinner = require('multispinner');

// Overwrite Multispinner.prototype.update to prevent accidental output
function noop() {}
Object.defineProperty(Multispinner.prototype, 'update', {
  configurable: true,
  get: function () {
    var stack = (new Error()).stack;
    if (stack.indexOf('sinon') === -1) {
      throw new Error('`Multispinner.prototype.update` was not stubbed. Please use `cliutils.parse` to stub it');
    }
  },
  set: noop
});

// Define our helpers
exports.parse = function (argv, options) {
  // Fallback our options
  options = options || {};

  // Stub out `logger.info` and `update` for `multispinner`
  sinonUtils.stub(logger, 'info', function saveLoggerInfo (buff) {
    this.loggerOutput = (this.stdoutWrite || '') + buff.toString() + '\n';
  });
  sinonUtils.stub(Multispinner.prototype, 'update', {
    get: function () {
      var that = this;
      function logUpdateMock(content) {
        that.logUpdateOutput = content;
      }
      logUpdateMock.clear = noop;
      logUpdateMock.done = noop;
      return logUpdateMock;
    },
    set: noop
  });
  after(function cleanup () {
    delete this.loggerOutput;
    delete this.logUpdateOutput;
  });

  // Stub our generateServer and browser opener as well
  // DEV: We look at `cli.generateServer` and `cli.opener` for spy info
  sinonUtils.stub(cli, 'generateServer', function () {
    var that = this;
    return {
      listen: function (port, hostname) {
        that.generateServerPort = port;
        that.generateServerHostname = hostname;
      }
    };
  });
  after(function cleanup () {
    delete this.generateServerPort;
    delete this.generateServerHostname;
  });
  sinonUtils.stub(cli, 'opener');

  // Run our main function
  before(function runParse (done) {
    // Run cliParse, save results, and callback
    var that = this;
    cli._parse(argv, function handleCliParse (err, exitCode) {
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
