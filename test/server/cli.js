// Load in our dependencies
var expect = require('chai').expect;
var childUtils = require('./utils/child');
var sinonUtils = require('../utils/sinon');
var cliParse = require('../../server/cli').parse;
var logger = require('../../server/logger');
var multiImageMergetoolFilepath = __dirname + '/../../bin/multi-image-mergetool';
var checkerboardFilepath = __dirname + '/../test-files/checkerboard.png';
var dotFilepath = __dirname + '/../test-files/dot.png';

// Start our tests
describe('An in-process CLI invocation', function () {
  describe('with matching images', function () {
    // sinonUtils.stub(logger, 'log'); sinonUtils.stub(logger, 'info');
    sinonUtils.stub(process, 'exit');
    cliParse(['node',
      multiImageMergetoolFilepath,
      '--current-images', dotFilepath, checkerboardFilepath,
      '--ref-images', dotFilepath, checkerboardFilepath
    ]);

    it('exits cleanly', function () {
      var processExitStub = process.exit;
      expect(processExitStub.callCount).to.equal(1);
      expect(processExitStub.args[0]).to.deep.equal([0]);
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
