// Load in our dependencies
var fs = require('fs');
var $ = require('jquery');
var expect = require('chai').expect;
var Application = require('../../browser/js/application');
var mouseUtils = require('./utils/mouse');
var checkerboardBase64 = fs.readFileSync(__dirname + '/../test-files/checkerboard.png', 'base64');
var checkerboardDotDiffBase64 = fs.readFileSync(__dirname + '/../test-files/checkerboard-dot-diff.png', 'base64');
var dotBase64 = fs.readFileSync(__dirname + '/../test-files/dot.png', 'base64');

// Disable transitions for Bootstrap
// https://github.com/twbs/bootstrap/blob/v3.3.7/js/transition.js#L45-L46
$(function handleReady () {
  $.support.transition = false;
});

// Define our application utils
// DEV: If `applicationUtils` needs to be reused, place it into a `utils` folder,
//   add `(imageSets)` as an option, and define constants of `imageSets` for us to use in utils
var applicationUtils = {
  init: function () {
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
  },
  _screenshot: function (filename) {
    // Call our to `onCallback` handler
    // https://github.com/karma-runner/karma/blob/v1.3.0/context/main.js#L5
    // DEV: We use `window.opener` as we're in a new window
    if (window.callPhantom) {
      window.callPhantom({type: 'render', filename: filename});
    }
  },
  screenshot: function (filename) {
    before(function screenshotFn () {
      applicationUtils._screenshot.call(this, filename);
    });
  }
};

// Start our tests
describe('An application with images', function () {
  // Create our application
  applicationUtils.init();
  applicationUtils.screenshot('generic');

  // Assert about our application
  it('lists images by reference images', function () {
    var imageSetTitleEls = this.containerEl.querySelectorAll('.image-set__title');
    expect(imageSetTitleEls).to.have.length(2);
    expect(imageSetTitleEls[0].textContent).to.match(/mock-img-equal$/);
    expect(imageSetTitleEls[1].textContent).to.match(/mock-img-not-equal$/);
  });

  it('indicates matching/non-matching image sets', function () {
    var imageSetTitleEl = this.containerEl.querySelector('[data-image-set="mock-img-equal"] .image-set__title');
    expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('true');
    imageSetTitleEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"] .image-set__title');
    expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('false');
  });

  it('collapses matching image sets', function () {
    var imageSetCollapseEl = this.containerEl.querySelector(
      '[data-image-set="mock-img-equal"] .image-set__collapse');
    expect([].slice.call(imageSetCollapseEl.classList)).to.not.include('in');
  });

  it('expands non-matching image sets', function () {
    var imageSetCollapseEl = this.containerEl.querySelector(
      '[data-image-set="mock-img-not-equal"] .image-set__collapse');
    expect([].slice.call(imageSetCollapseEl.classList)).to.include('in');
  });
});

describe('When an image set title is clicked', function () {
  applicationUtils.init();

  it('collapses/expands its contents', function () {
    // DEV: We don't test this thoroughly as it's Bootstrap's responsibility
    // Assert our initial state is open
    var imageSetEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"]');
    var imageSetTitleEl = imageSetEl.querySelector('.image-set__title');
    var imageSetCollapseEl = imageSetEl.querySelector('.image-set__collapse');
    expect([].slice.call(imageSetCollapseEl.classList)).to.include('in');

    // Click our element
    $(imageSetTitleEl).click();

    // Assert our element is closed
    expect([].slice.call(imageSetCollapseEl.classList)).to.not.include('in');
    applicationUtils._screenshot('after-collapse');
  });
});

describe('When we click/drag on a diff image', function () {
  applicationUtils.init();
  before(function assertNoOverlay () {
    expect(document.body.querySelector('.overlay')).to.equal(null);
  });
  before(function mouseMoveOnDiffImage (done) {
    // DEV: We use an expanded image set so we can click/drag
    var diffImg = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]');
    var diffImgBounds = diffImg.getBoundingClientRect();
    mouseUtils.moveMouse({
      targetEl: diffImg,
      startCoords: {x: diffImgBounds.left, y: diffImgBounds.top},
      endCoords: {x: diffImgBounds.left + 10, y: diffImgBounds.top + 10},
      duration: 100 // ms
    }, done);
  });

  it('generates an overlay', function () {
    // TODO: PhantomJS screenshot has overlay not directly on image yet Firefox is fine. Explore moving to Electron
    applicationUtils._screenshot('overlay-generated');
    expect(document.body.querySelector('.overlay')).to.not.equal(null);
  });

  describe('when the image set is collapsed', function () {
    before(function assertOverlayVisible () {
      var $overlay = $(document.body.querySelector('.overlay'));
      expect($overlay.filter(':visible').length).to.equal(1);
    });

    it('makes the overlay no longer visible', function () {
      // Click our title element
      var imageSetEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"]');
      var imageSetTitleEl = imageSetEl.querySelector('.image-set__title');
      var imageSetCollapseEl = imageSetEl.querySelector('.image-set__collapse');
      $(imageSetTitleEl).click();
      expect([].slice.call(imageSetCollapseEl.classList)).to.not.include('in');

      // Assert overlay is hidden
      applicationUtils._screenshot('overlay-hidden');
      var $overlay = $(document.body.querySelector('.overlay'));
      expect($overlay.filter(':visible').length).to.equal(0);
    });
  });
});

// TODO: These are probably ImageSet tests directly
//   Test out acceptance behavior (hits endpoint, approval/error)
//   Test out select overlay area (either via events or mocking) and finding similar images
//      - No matches found
//      - Matches found
//   Test out overlay selection with different values, verify it's cleared out and not appended to
//   Test out accepting all images (hits endpoint, approval/error)
//      Verify each image set is listed
//      Add TODOs about cleaning results and collapsing section
//   Test out accepting some images (doesn't hit endpoint for all images)
//   Test out approving selection for all images (hits endpoint, approval/failure/error)
//   Test out approving selection for some images (doesn't hit endpoint for all images)
