// Load in our dependencies
var async = require('async');
var path = require('path');
var glob = require('glob');
var mkdirp = require('mkdirp');
var tmp = require('tmp');
var looksSameComparator = require('./image-comparators/looks-same');
var logger = require('./logger');

// Define our constructor
// TODO: Ditch `options` or keep it...
function ImageSet(currentImg, refImg, options) {
  // Save our options for later
  this.currentImg = currentImg;
  this.refImg = refImg;

  // Log image set generation
  logger.verbose.info('Image set generated with current image "' + currentImg + '" and ' +
    'reference image "' + refImg + '"');
}

// Define class methods/properties
ImageSet.generateSets = function (currentImgGlob, refImgGlob, options, cb) {
  // Find images in our globs
  async.parallel([
    glob.bind(this, currentImgGlob),
    glob.bind(this, refImgGlob)
  ], function handleResults (err, results) {
    // If there was an error, callback with it
    if (err) {
      return cb(err);
    }

    // Otherwise, verify we have equal sets of images
    var currentImgArr = results[0];
    var refImgArr = results[1];
    if (currentImgArr.length !== refImgArr.length) {
      return cb(new Error('Found ' + currentImgArr.length + ' current images ' +
        'and ' + refImgArr.length + ' reference images. We expect these numbers to line up, please check ' +
        'current image glob "' + currentImgGlob + '" and reference image glob "' + currentImgGlob + '"'));
    }

    // Generate new sets of images
    var imageSets = currentImgArr.map(function createImgSet (currentImg, i) {
      var refImg = refImgArr[i];
      return new ImageSet(currentImg, refImg, options);
    });

    // Callback with our image sets
    cb(null, imageSets);
  });
};
ImageSet.getTemporaryDirectory = function () {
  // If we haven't set up a temporary directory, create one now
  var cls = this;
  if (!cls.temporaryDirectory) {
    // DEV: We use blocking creation to prevent multiple directories being created in parallel
    cls.temporaryDirectory = tmp.dirSync();
    logger.verbose.info('Created temporary directory "' + cls.temporaryDirectory.name + '"');
  }

  // Return our temporary directory
  return cls.temporaryDirectory.name;
};

// Define instance methods
ImageSet.prototype = {
  compare: function (cb) {
    // If there is no diff image path yet
    if (!this.diffImg) {
      // Get our temporary directory
      var temporaryDirectory = ImageSet.getTemporaryDirectory();

      // Resolve and save our filepath to the diff
      // https://nodejs.org/api/path.html#path_path_extname_path
      // `path/to/Chrome~current.png` -> `/tmp/123456/path/to/Chrome~current.png.diff.png`
      // DEV: We use `current` as we assume these are volatile whereas `ref` could be in version control
      var ext = path.extname(this.currentImg); // .png
      this.diffImg = path.join(temporaryDirectory, this.currentImg + '.diff' + ext);

      // Create our diff image's directory
      mkdirp(path.dirname(this.diffImg), function handleMkdirp (err) {
        // If there was an error, callback with it
        if (err) {
          return cb(err);
        }

        // Otherwise, continue
        next();
      });
    // Otherwise, in a split second continue to next part
    // DEV: We use `setImmediate` to avoid zalgo (i.e. we expect async behavior)
    } else {
      next();
    }

    var that = this;
    function next() { // jshint ignore:line
      // Compare our imges
      // https://github.com/gemini-testing/gemini/blob/v4.13.0/lib/image/index.js#L79-L104
      // TODO: Support multiple image comparators (e.g. `image-diff`)
      looksSameComparator(that, cb);
    }
  }
};

// Export our constructor
module.exports = ImageSet;
