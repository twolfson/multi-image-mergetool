// Load in our dependencies
var expect = require('chai').expect;
var childUtils = require('./utils/child');
var multiImageMergetoolFilepath = __dirname + '/../../bin/multi-image-mergetool';

// Start our tests
// DEV: These are sanity checks for parse wrapper
describe('A CLI invocation', function () {
  describe('with matching images', function () {
    childUtils.spawn('node', [
      multiImageMergetoolFilepath,
      '--current-images', __dirname + '/../test-files/dot.png',
      '--ref-images', __dirname + '/../test-files/dot.png'
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
      '--current-images', __dirname + '/../test-files/dot.png', __dirname + '/../test-files/dot.png',
      '--ref-images', __dirname + '/../test-files/dot.png'
    ]);

    it('exits uncleanly', function () {
      expect(this.err).to.have.property('status', 1);
      expect(this.err.stderr).to.contain(
        '2 current images and 1 reference images were received. We expect these numbers to line up');
    });
  });
});
