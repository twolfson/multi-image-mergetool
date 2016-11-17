// Load in our dependencies
var fs = require('fs');
var $ = require('jquery');
var _ = require('underscore');
var async = require('async');
var Application = require('../../../browser/js/application');
var checkerboardBase64 = fs.readFileSync(__dirname + '/../../test-files/checkerboard.png', 'base64');
var checkerboardDotDiffBase64 = fs.readFileSync(__dirname + '/../../test-files/checkerboard-dot-diff.png', 'base64');
var dotBase64 = fs.readFileSync(__dirname + '/../../test-files/dot.png', 'base64');

// Disable transitions for Bootstrap
// https://github.com/twbs/bootstrap/blob/v3.3.7/js/transition.js#L45-L46
// DEV: This is used to speed up tests and make screenshots consistent
$(function handleReady () {
  $.support.transition = false;
});

// Run our DOM bindings once
Application.bindOnce();

// Define various image set configurations
var base64Prefix = 'data:image/png;base64,';
exports.IMAGE_SET_EQUAL = {
  id: 'mock-img-equal',
  currentImgUrl: base64Prefix + checkerboardBase64,
  diffImgUrl: base64Prefix + checkerboardBase64,
  refImgUrl: base64Prefix + checkerboardBase64,
  imagesEqual: true
};
exports.IMAGE_SET_NOT_EQUAL = {
  id: 'mock-img-not-equal',
  currentImgUrl: base64Prefix + checkerboardBase64,
  diffImgUrl: base64Prefix + dotBase64,
  refImgUrl: base64Prefix + checkerboardDotDiffBase64,
  imagesEqual: false
};
exports.IMAGE_SET_NOT_EQUAL2 = _.defaults({
  id: 'mock-img-not-equal2'
}, exports.IMAGE_SET_NOT_EQUAL);
exports.IMAGE_SETS = {
  DEFAULT: [exports.IMAGE_SET_EQUAL, exports.IMAGE_SET_NOT_EQUAL],
  MULTIPLE_NOT_EQUAL: [exports.IMAGE_SET_EQUAL, exports.IMAGE_SET_NOT_EQUAL, exports.IMAGE_SET_NOT_EQUAL2]
};

// Define our application utils
// DEV: If `applicationUtils` needs to be reused, place it into a `utils` folder,
//   add `(imageSets)` as an option, and define constants of `imageSets` for us to use in utils
exports.init = function (imageSetInfoArr) {
  before(function createApplication () {
    // DEV: We add `className` for nicer looking screenshots
    this.containerEl = document.createElement('div');
    this.containerEl.className = 'container-fluid';
    document.body.appendChild(this.containerEl);
    this.app = new Application(this.containerEl, imageSetInfoArr || exports.IMAGE_SETS.DEFAULT);
  });
  before(function waitForImagesToLoad (done) {
    // Wait for images to load to prevent canvas and screenshot issues
    var imgElArr = this.containerEl.querySelectorAll('img');
    async.forEach(imgElArr, function waitForImageToLoad (imgEl, cb) {
      // If the image is already loaded, then callback in a second (prevent zalgo)
      // https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement
      if (imgEl.complete) {
        return process.nextTick(cb);
      }

      // Set up onload/onerror bindings
      imgEl.onload = _.once(function () {
        cb(null);
      });
      imgEl.onerror = cb;
    }, done);
  });
  after(function cleanup () {
    // If we are on the debug page, expose everything
    if (window.location.pathname === '/debug.html')  {
      // If only 1 test is running, expose everything and stop
      if (window.mocha.options.hasOnly) {
        console.info('/debug.html and `hasOnly` detected, ' +
          'exposing `window.app` and `window.containerEl`');
        window.app = this.app;
        window.containerEl = this.containerEl;
        return;
      }

      // Notify user about debugging
      console.info('/debug.html detected but no `.only`. ' +
        'To visually debug tests/stop cleanup, add a `.only` to a test suite');
    }

    // Perform our cleanup
    document.body.removeChild(this.containerEl);
    delete this.app;
    delete this.containerEl;
  });
};

exports._screenshot = function (filename) {
  // Call our to `onCallback` handler
  // https://github.com/karma-runner/karma/blob/v1.3.0/context/main.js#L5
  // DEV: We use `window.opener` as we're in a new window
  if (window.callPhantom) {
    window.callPhantom({type: 'render', filename: filename});
  }
};
exports.screenshot = function (filename) {
  before(function screenshotFn () {
    exports._screenshot.call(this, filename);
  });
};

// DEV: This uses the same technique as our application so we can do direct comparisons
// DEV: We could do pixel based comparisons but that's overkill
exports.getBase64Content = function (imgEl) {
  // Create our elements
  var base64CanvasEl = document.createElement('canvas');
  var base64Context = base64CanvasEl.getContext('2d');

  // Resize our canvas to target size
  base64CanvasEl.width = imgEl.naturalWidth;
  base64CanvasEl.height = imgEl.naturalHeight;

  // Draw our image and return its data URL
  // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL
  // DEV: We use `image/png` for lossless encoding which is necessary for visual comparison
  base64Context.drawImage(imgEl, 0, 0);
  return base64CanvasEl.toDataURL('image/png');
};
