// Load in our dependencies
var ndarrayFill = require('ndarray-fill');
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
    if ((0  < x && 0  < y && x < 5  && y < 5) ||
        (5  < x && 5  < y && x < 10 && y < 10) ||
        (10 < x && 10 < y && x < 15 && y < 15)) {
      // Generate black dot (00 00 00)
      return 0x00;
    // Otherwise, draw white (FF FF FF)
    } else {
      return 0xFF;
    }
  });
};

exports.getDiagonalBase64 = function () {
  // Grab our ndarray data
  var imageNdArray = exports._getDiagonalNdarray();

  // Create a canvas and write in the data
  // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData
  // https://github.com/scijs/save-pixels/blob/f7bf8c831927e3ade93ffe499b04f4013d641b93/save-pixels.js#L126-L136

  // Export the base64 result
};

exports.getDiagonalBase64 = function () {
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
};
