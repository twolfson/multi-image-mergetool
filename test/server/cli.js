// Load in our dependencies
var bufferedSpawn = require('buffered-spawn');
var expect = require('chai').expect;

// Define our test helpers
var childUtils = {
  spawn: function (cmd, args) {
    before(function spawnFn (done) {
      // Run our process, save its data, and callback
      var that = this;
      bufferedSpawn(cmd, args, function handleBufferedSpawn (err, stdout, stderr) {
        that.err = err;
        that.stdout = stdout;
        that.stderr = stderr;
        done();
      });
    });
    after(function cleanup () {
      delete this.err;
      delete this.stdout;
      delete this.stderr;
    });
  }
};

// Start our tests
// DEV: These are sanity checks for parse wrapper
var multiImageMergetoolFilepath = __dirname + '/../../bin/multi-image-mergetool';
describe('A CLI invocation with matching images', function () {
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

describe('A CLI invocation with uneven image counts', function () {
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
