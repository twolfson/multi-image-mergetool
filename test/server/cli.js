// Load in our dependencies
var expect = require('chai').expect;
var childUtils = require('./utils/child');
var sinonUtils = require('../utils/sinon');
var _cliParse = require('../../server/cli')._parse;
var logger = require('../../server/logger');
var multiImageMergetoolFilepath = __dirname + '/../../bin/multi-image-mergetool';
var checkerboardFilepath = __dirname + '/../test-files/checkerboard.png';
var dotFilepath = __dirname + '/../test-files/dot.png';

// Define our cliParse helper
var assert = require('assert');
var mimUtils = {
  parse: function (argv, options) {
    // Fallback our options
    options = options || {};

    // Stub out stdout
    sinonUtils.stub(process.stdout, 'write', function saveStdout (buff) {
      this.stdout = (this.stdout || '') + buff.toString() + '\n';
    });
    after(function cleanup () {
      delete this.stdout;
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
            'but received "' + exitCode + '" and stdout "' + that.stdout + '"');
        }
        done();
      });
    });
    after(function cleanup () {
      delete this.err;
      delete this.exitCode;
    });
  }
};

// Start our tests
describe('An in-process CLI invocation', function () {
  describe.only('with matching images', function () {
    mimUtils.parse([
      'node', multiImageMergetoolFilepath,
      '--current-images', dotFilepath, checkerboardFilepath,
      '--ref-images', dotFilepath, checkerboardFilepath
    ], {
      expectedExitCode: 0
    });

    it('exits cleanly', function () {
      // Asserted by expectedExitCode
    });
  });
});

// DEV: These are sanity checks for parse wrapper
describe('A CLI invocation', function () {
  describe('with matching images', function () {
    childUtils.spawn('node', [
      multiImageMergetoolFilepath,
      '--current-images', dotFilepath,
      '--ref-images', dotFilepath
    ]);

    it('exits cleanly', function () {
      expect(this.err).to.equal(null);
      expect(this.stdout).to.match(/✓.+test-files\/dot\.png/);
      expect(this.stdout).to.contain('Images matched: 1 of 1');
    });
  });

  describe('with uneven image counts', function () {
    childUtils.spawn('node', [
      multiImageMergetoolFilepath,
      '--current-images', dotFilepath, dotFilepath,
      '--ref-images', dotFilepath
    ]);

    it('exits uncleanly', function () {
      expect(this.err).to.have.property('status', 1);
      expect(this.err.stderr).to.contain(
        '2 current images and 1 reference images were received. We expect these numbers to line up');
    });
  });
});
