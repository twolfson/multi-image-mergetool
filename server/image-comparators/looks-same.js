// Load in our dependencies
var async = require('async');
var looksSame = require('looks-same');

// Define our comparator
// DEV: We perform diff always for consistency with `image-diff`
module.exports = function (params, callback) {
  async.parallel([
    // https://github.com/gemini-testing/gemini/blob/v4.13.0/lib/image/index.js#L79-L104
    // TODO: Add support for highlight color, tolerance, and more
    function runLooksSame (cb) {
      looksSame(params.currentImage, params.refImage, {}, cb);
    },
    function generateLooksSameDiff (cb) {
      looksSame.createDiff({
        reference: params.refImage,
        current: params.currentImage,
        diff: params.diffImage,
        highlightColor: '#ff00ff'
      }, cb);
    }
  ], function handleResults (err, results) {
    // If there was an error, callback with it
    if (err) {
      return callback(err);
    }

    // Otherwise, callback with pass/fail
    callback(null, results[0]);
  });
};
