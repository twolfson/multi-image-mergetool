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

exports._extendImageNdarray = function (baseImageNdarray, width, height) {
  // Generate our extended ndarray
  var imageNdarray = zeros([width, height, 4]);

  // Fill our image
  // DEV: We could repeat the image but we'll lose focus of where to test/debug
  ndarrayFill(imageNdarray, function fillImageNdarray (x, y, rgbaIndex) {
    // If values are within our base image, then use them
    if (x < 15 && y < 15) {
      return baseImageNdarray.get(x, y, rgbaIndex);
    }

    // Otherwise, return white (rgba(FF, FF, FF, FF))
    return 0xFF;
  });

  // Return our generated ndarray
  return imageNdarray;
};
exports._getLargeDiagonalNdarray = function () {
  return exports._extendImageNdarray(
    exports._getDiagonalNdarray(), 800, 600);
};
exports._getLargeDotNdarray = function () {
  return exports._extendImageNdarray(
    exports._getDotNdarray(), 800, 600);
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

  // If there's an environment variable to output the large images, then do so
  if (process.env.DEBUG === '1') {
    var largeDiagonalStream = createWriteStream('large-diagonal.png');
    savePixels(exports._getLargeDiagonalNdarray(), 'png').pipe(largeDiagonalStream);
    var largeDotStream = createWriteStream('large-dot.png');
    savePixels(exports._getLargeDotNdarray(), 'png').pipe(largeDotStream);
  }

  // Process will automatically terminate when streams complete
  // DEV: We could optionally use `merge-stream` as well (as with `gulp` tasks)
}
if (require.main === module) {
  main();
}
