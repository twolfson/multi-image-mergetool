// Load in our dependencies
var async = require('async');
var glob = require('glob');
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

// Define class methods
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
      return cb(new Error('Found "' + currentImgArr.length + '" current images ' +
        'and "' + refImgArr.length + '" reference images. We expect these numbers to line up, please check ' +
        'current image glob: "' + currentImgGlob + '" and reference image glob: "' + currentImgGlob + '"'));
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

// Export our constructor
module.exports = ImageSet;
