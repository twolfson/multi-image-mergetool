// Load in our dependencies
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var tmp = require('tmp');
var looksSameComparator = require('./image-comparators/looks-same');
var logger = require('./logger');

// Define our constructor
function ImageSet(currentImage, refImage, options) {
  // Save our options for later
  this.id = refImage;
  this.currentImage = currentImage;
  this.refImage = refImage;
  this.diffImage = options.diffImage || null;

  // Define placeholder attributes for comparison
  this.imagesEqual = null;
  this.isNew = null;

  // Log image set generation
  logger.verbose.info('Image set generated with current image "' + this.currentImage + '", ' +
    'reference image "' + this.refImage + '", and diff image "' + this.diffImage + '"');
}

// Define class methods/properties
ImageSet.generateSets = function (currentImages, refImages, options) {
  // Fallback our options
  options = options || {};

  // Verify we have equal sets of images
  if (currentImages.length !== refImages.length) {
    throw new Error(currentImages.length + ' current images ' +
      'and ' + refImages.length + ' reference images were received. We expect these numbers to line up, ' +
      'please check path resolution. ' +
      'It\'s possible the reference image doesn\'t exist yet as it\'s new so ' +
      'please avoid using \'*\' patterns or similar');
  }

  // If there are diff images, then verify they are equal as well
  var diffImages = options.diffImages;
  if (diffImages) {
    if (diffImages.length !== currentImages.length) {
      throw new Error(currentImages.length + ' current images ' +
        'and ' + diffImages.length + ' diff images were received. We expect these numbers to line up, ' +
        'please check path resolution. ' +
        'It\'s possible the reference image doesn\'t exist yet as it\'s new so ' +
        'please avoid using \'*\' patterns or similar');
    }
  }

  // Generate new sets of images
  var imageSets = currentImages.map(function createImageSet (currentImage, i) {
    return new ImageSet(currentImage, refImages[i], {
      diffImage: diffImages ? diffImages[i] : null
    });
  });

  // Return our image sets
  return imageSets;
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
    var that = this;
    if (!this.diffImage) {
      // Get our temporary directory synchronously (prevent creating multiple temporary directories)
      var temporaryDirectory = ImageSet.getTemporaryDirectory();

      // Resolve and save our filepath to the diff
      // https://nodejs.org/api/path.html#path_path_extname_path
      // `path/to/Chrome~current.png` -> `/tmp/123456/path/to/Chrome~current.png.diff.png`
      // DEV: We use `current` as we assume these are volatile whereas `ref` could be in version control
      var ext = path.extname(this.currentImage); // .png
      this.diffImage = path.join(temporaryDirectory, this.currentImage + '.diff' + ext);
    }

    // Create our diff image's directory
    // DEV: We could have a custom diff path that doesn't yet exist
    mkdirp(path.dirname(that.diffImage), function handleMkdirp (err) {
      // If there was an error, callback with it
      if (err) {
        return cb(err);
      }

      // Compare our images
      // https://github.com/gemini-testing/gemini/blob/v4.13.0/lib/image/index.js#L79-L104
      // TODO: Support multiple image comparators (e.g. `image-diff`)
      looksSameComparator(that, function handleResult (err, imagesEqual) {
        // If there was an error, callback with it
        if (err) {
          return cb(err);
        }

        // Otherwise, save the result and callback
        that.imagesEqual = imagesEqual;
        cb(null, imagesEqual);
      });
    });
  },
  // DEV: We could use `toJSON` but there is a trust issue of it always being used/not
  serialize: function () {
    return {
      id: this.id,
      currentImageUrl: '/images/' + encodeURIComponent(this.currentImage),
      diffImageUrl: '/images/' + encodeURIComponent(this.diffImage),
      refImageUrl: '/images/' + encodeURIComponent(this.refImage),
      imagesEqual: this.imagesEqual
    };
  },
  updateRef: function (refBuff, cb) {
    // Update our reference image
    // DEV: We could load a single file handler at start of application and persist it to avoid path shifting hacks
    //   but we shouldn't be run as root so we should be fine
    var that = this;
    fs.writeFile(this.refImage, refBuff, function handleWriteFile (err) {
      // If there was an error, callback with it
      if (err) {
        return cb(err);
      }

      // Otherwise, compare our images and callback with that result
      // DEV: We run this so we update our diff image
      that.compare(cb);
    });
  }
};

// Export our constructor
module.exports = ImageSet;
