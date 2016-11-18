// Load in our dependencies
var expect = require('chai').expect;
var childUtils = require('./utils/child');
var cliUtils = require('./utils/cli');
var multiImageMergetoolFilepath = __dirname + '/../../bin/multi-image-mergetool';
var checkerboardFilepath = __dirname + '/../test-files/checkerboard.png';
var dotFilepath = __dirname + '/../test-files/dot.png';

// Start our tests
describe('An in-process CLI invocation', function () {
  describe('with matching images', function () {
    cliUtils.parse([
      'node', multiImageMergetoolFilepath,
      '--current-images', dotFilepath, checkerboardFilepath,
      '--ref-images', dotFilepath, checkerboardFilepath
    ], {
      expectedExitCode: 0
    });

    it('exits cleanly', function () {
      // Asserted by expectedExitCode
    });

    it('contains matching output', function () {
      expect(this.loggerInfo).to.match(/✓.+test-files\/dot\.png/);
      expect(this.loggerInfo).to.match(/✓.+test-files\/checkerboard\.png/);
      expect(this.loggerInfo).to.contain('Images matched: 2 of 2');
    });
  });

  describe('with non-matching images', function () {
    cliUtils.parse([
      'node', multiImageMergetoolFilepath,
      '--current-images', dotFilepath,
      '--ref-images', checkerboardFilepath
    ], {
      expectedExitCode: null
    });

    it('does not exit', function () {
      expect(this.err).to.equal(null);
      expect(this.exitCode).to.equal(null);
    });

    it('contains non-matching output', function () {
      expect(this.loggerInfo).to.match(/✘.+test-files\/dot\.png/);
      expect(this.loggerInfo).to.contain('Images matched: 0 of 1');
    });

    it('starts a server', function () {

    });

    it('opens a browser', function () {

    })

    it('creates a diff file', function () {
      // Should be able to resolve from generateServer
      // Should be able to compare to `checkerboard-dot-diff` if we want
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
