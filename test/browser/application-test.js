// Load in our dependencies
var $ = require('jquery');
var expect = require('chai').expect;
var Application = require('../../browser/js/application');

// Define our application utils
// DEV: If `applicationUtils` needs to be reused, place it into a `utils` folder,
//   add `(imageSets)` as an option, and define constants of `imageSets` for us to use in utils
var applicationUtils = {
  init: function () {
    before(function createApplication () {
      this.containerEl = document.createElement('div');
      document.body.appendChild(this.containerEl);
      this.app = new Application(this.containerEl, [{
        id: 'mock-ref-img-equal',
        currentImgUrl: 'data:image/png;base64,mock-current-img-equal',
        diffImgUrl: 'data:image/png;base64,mock-diff-img-equal',
        refImgUrl: 'data:image/png;base64,mock-ref-img-equal',
        imagesEqual: true
      }, {
        id: 'mock-ref-img-not-equal',
        currentImgUrl: 'data:image/png;base64,mock-current-img-not-equal',
        diffImgUrl: 'data:image/png;base64,mock-diff-img-not-equal',
        refImgUrl: 'data:image/png;base64,mock-ref-img-not-equal',
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
    if (window.top && window.top.callPhantom) {
      window.top.callPhantom({type: 'render', filename: filename});
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
    expect(imageSetTitleEls[0].textContent).to.match(/mock-ref-img-equal$/);
    expect(imageSetTitleEls[1].textContent).to.match(/mock-ref-img-not-equal$/);
  });

  it('indicates matching/non-matching image sets', function () {
    var imageSetTitleEl = this.containerEl.querySelector('[data-image-set$="mock-ref-img-equal"] .image-set__title');
    expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('true');
    imageSetTitleEl = this.containerEl.querySelector('[data-image-set$="mock-ref-img-not-equal"] .image-set__title');
    expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('false');
  });

  it('collapses matching image sets', function () {
    var imageSetCollapseEl = this.containerEl.querySelector(
      '[data-image-set$="mock-ref-img-equal"] .image-set__collapse');
    expect([].slice.call(imageSetCollapseEl.classList)).to.not.include('in');
  });

  it('expands non-matching image sets', function () {
    var imageSetCollapseEl = this.containerEl.querySelector(
      '[data-image-set$="mock-ref-img-not-equal"] .image-set__collapse');
    expect([].slice.call(imageSetCollapseEl.classList)).to.include('in');
  });
});

describe('When an image set title is clicked', function () {
  applicationUtils.init();

  it('collapses/expands its contents', function () {
    // DEV: We don't test this thoroughly as it's Bootstrap's responsibility
    // Assert our initial state is open
    var imageSetEl = this.containerEl.querySelector('[data-image-set$="mock-ref-img-not-equal"]');
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

// Define our edge case tests
describe.skip('An overlay in a collapsed image set', function () {
  it('is not visible', function () {
    // Test me
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
