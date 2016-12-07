// Load in our dependencies
var fs = require('fs');
var ndarrayFill = require('ndarray-fill');
var savePixels = require('save-pixels');
var zeros = require('zeros');

// Define image generators
exports._getDiagonalNdarray = function () {
  // Create an ndarray with our pattern
  // https://github.com/twolfson/gif-encoder/blob/0.6.0/test/gif-encoder_test.js#L115-L132
  // +---------------+
  // |xxxxx          |
  // |xxxxx          |
  // |xxxxx          |
  // |xxxxx          |
  // |xxxxx          |
  // |     xxxxx     |
  // |     xxxxx     |
  // |     xxxxx     |
  // |     xxxxx     |
  // |     xxxxx     |
  // |          xxxxx|
  // |          xxxxx|
  // |          xxxxx|
  // |          xxxxx|
  // |          xxxxx|
  // +---------------+
  var imageNdarray = zeros([15, 15, 4]);
  ndarrayFill(imageNdarray, function fillImageNdarray (x, y, rgbaIndex) {
    // If this is the alpha channel, always return it as full
    if (rgbaIndex === 3) {
      return 0xFF;
    }

    // Otherwise, if we are on our black dot, then draw it
    if ((0  <= x && 0  <= y && x < 5  && y < 5) ||
        (5  <= x && 5  <= y && x < 10 && y < 10) ||
        (10 <= x && 10 <= y && x < 15 && y < 15)) {
      // Generate black dot (00 00 00)
      return 0x00;
    // Otherwise, draw white (FF FF FF)
    } else {
      return 0xFF;
    }
  });

  // Return our ndarray
  return imageNdarray;
};
exports._getDotNdarray = function () {
  // +---------------+
  // |               |
  // |               |
  // |               |
  // |               |
  // |               |
  // |     xxxxx     |
  // |     xxxxx     |
  // |     xxxxx     |
  // |     xxxxx     |
  // |     xxxxx     |
  // |               |
  // |               |
  // |               |
  // |               |
  // |               |
  // +---------------+
  var imageNdarray = zeros([15, 15, 4]);
  ndarrayFill(imageNdarray, function fillImageNdarray (x, y, rgbaIndex) {
    // If this is the alpha channel, always return it as full
    if (rgbaIndex === 3) {
      return 0xFF;
    }

    // Otherwise, if we are on our black dot, then draw it
    if (5  <= x && 5  <= y && x < 10 && y < 10) {
      // Generate black dot (00 00 00)
      return 0x00;
    // Otherwise, draw white (FF FF FF)
    } else {
      return 0xFF;
    }
  });

  // Return our ndarray
  return imageNdarray;
};

// Define our base64 helpers
exports.getDiagonalBase64 = function () {
  // Grab our ndarray data
  var imageNdarray = exports._getDiagonalNdarray();

  // Generate our canvas
  var canvasEl = savePixels(imageNdarray, 'canvas');

  // Export the base64 result
  return canvasEl.getContext('2d')
    .getImageData(0, 0, imageNdarray.shape[0], imageNdarray.shape[1]);
};
exports.getDotBase64 = function () {
  var imageNdarray = exports._getDotNdarray();
  var canvasEl = savePixels(imageNdarray, 'canvas');
  return canvasEl.getContext('2d')
    .getImageData(0, 0, imageNdarray.shape[0], imageNdarray.shape[1]);
};

// If this is the main script, then save images to disk
function main() {
  // Save our ndarrays to file streams
  var diagonalStream = fs.createWriteStream('diagonal.png');
  savePixels(exports._getDiagonalNdarray(), 'png').pipe(diagonalStream);
  var dotStream = fs.createWriteStream('dot.png');
  savePixels(exports._getDotNdarray(), 'png').pipe(dotStream);

  // Process will automatically terminate when streams complete
  // DEV: We could optionally use `merge-stream` as well (as with `gulp` tasks)
}
if (require.main === module) {
  main();
}
