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

// If this is the main script, then save images to disk
function main() {
  // Save our ndarrays to file streams
  // DEV: We need to fallback `createWriteStream` to prevent bundling errors
  var createWriteStream = fs.createWriteStream || function () {};
  var diagonalStream = createWriteStream('diagonal.png');
  savePixels(exports._getDiagonalNdarray(), 'png').pipe(diagonalStream);
  var dotStream = createWriteStream('dot.png');
  savePixels(exports._getDotNdarray(), 'png').pipe(dotStream);

  // Process will automatically terminate when streams complete
  // DEV: We could optionally use `merge-stream` as well (as with `gulp` tasks)
}
if (require.main === module) {
  main();
}
