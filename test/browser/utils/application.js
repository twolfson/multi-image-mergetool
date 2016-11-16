// Load in our dependencies
var $ = require('jquery');
var fs = require('fs');
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

// Define our application utils
// DEV: If `applicationUtils` needs to be reused, place it into a `utils` folder,
//   add `(imageSets)` as an option, and define constants of `imageSets` for us to use in utils
exports.init = function () {
  before(function createApplication () {
    // DEV: We add `className` for nicer looking screenshots
    this.containerEl = document.createElement('div');
    this.containerEl.className = 'container-fluid';
    document.body.appendChild(this.containerEl);
    this.app = new Application(this.containerEl, [{
      id: 'mock-img-equal',
      currentImgUrl: 'data:image/png;base64,' + checkerboardBase64,
      diffImgUrl: 'data:image/png;base64,' + checkerboardBase64,
      refImgUrl: 'data:image/png;base64,' + checkerboardBase64,
      imagesEqual: true
    }, {
      id: 'mock-img-not-equal',
      currentImgUrl: 'data:image/png;base64,' + checkerboardBase64,
      diffImgUrl: 'data:image/png;base64,' + dotBase64,
      refImgUrl: 'data:image/png;base64,' + checkerboardDotDiffBase64,
      imagesEqual: false
    }]);
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
