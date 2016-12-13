// Load in our dependencies
var assert = require('assert');
var cli = require('../../../server/cli');
var logger = require('../../../server/logger');
var sinonUtils = require('../../utils/sinon');

// Define our helpers
exports.parse = function (argv, options) {
  // Fallback our options
  options = options || {};

  // Stub out logger.info and `process.stdout.write` for `multispinner`
  var _write = process.stdout.write;
  var writeCaptureList = [
    // ✔ /home/todd/github/multi-image-mergetool/test/server/../test-files/dot.png
    /test-files\/[^\.]+.png/,
    // ✔ gemini-report/images/root/default-large/my-browser~current.png
    /gemini-report\/images\/.+png/,
    // ✔ gemini/screens/root/default-large/my-browser.png
    /gemini\/screens\/.+png/
  ];
  sinonUtils.stub(logger, 'info', function saveLoggerInfo (buff) {
    this.stdoutWrite = (this.stdoutWrite || '') + buff.toString() + '\n';
  });
  sinonUtils.stub(process.stdout, 'write', function saveStdoutWrite (buff) {
    var shouldBeCaptured = writeCaptureList.some(function buffMatchesPattern (pattern) {
      return pattern.exec(buff.toString());
    });
    // DEV: We have 'Error: ' here as a sanity check but it's shouldn't be touched as this is `stdout`
    if (shouldBeCaptured && buff.toString().indexOf('Error: ') === -1) {
      this.stdoutWrite = (this.stdoutWrite || '') + buff.toString() + '\n';
    } else {
      _write.call(process.stdout, buff);
    }
  });
  after(function cleanup () {
    delete this.stdoutWrite;
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
