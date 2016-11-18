// Load in our dependencies
var bufferedSpawn = require('buffered-spawn');

// Define our helpers
exports.spawn = function (cmd, args) {
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
};
