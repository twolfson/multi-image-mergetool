// Load in our dependencies
var expect = require('chai').expect;
var Application = require('../../browser/js/application');

// Start our tests
describe('An application with images', function () {
  before(function createApplication () {
    this.containerEl = document.createElement('div');
    document.body.appendChild(this.containerEl);
    this.app = new Application(this.containerEl, [{
      currentImg: 'data:image/png;base64,mock-current-img-0',
      diffImg: 'data:image/png;base64,mock-diff-img-0',
      refImg: 'data:image/png;base64,mock-ref-img-0',
      imagesEqual: true
    }, {
      currentImg: 'data:image/png;base64,mock-current-img-1',
      diffImg: 'data:image/png;base64,mock-diff-img-1',
      refImg: 'data:image/png;base64,mock-ref-img-1',
      imagesEqual: false
    }]);
  });
  after(function cleanup () {
    // If we are on the debug page, expose everything
    if (window.location.pathname === '/debug.html') {
      console.debug('/debug.html detected, exposing `window.app` and `window.containerEl`');
      window.app = this.app;
      window.containerEl = this.containerEl;
    // Otherwise, cleanup
    } else {
      document.body.removeChild(this.containerEl);
      delete this.app;
      delete this.containerEl;
    }
  });

  it('lists images by reference images', function () {
    var imageSetTitleEls = this.containerEl.querySelectorAll('.image-set__title');
    expect(imageSetTitleEls).to.have.length(2);
    expect(imageSetTitleEls[0].textContent).to.match(/mock-ref-img-0$/);
    expect(imageSetTitleEls[1].textContent).to.match(/mock-ref-img-1$/);
  });

  it('indicates matching/non-matching image sets', function () {
    var imageSetTitleEl = this.containerEl.querySelector('[data-image-set$="mock-ref-img-0"] .image-set__title');
    expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('true');
    imageSetTitleEl = this.containerEl.querySelector('[data-image-set$="mock-ref-img-1"] .image-set__title');
    expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('false');
  });

  it('collapses matching image sets', function () {

  });

  it('collapses non-matching image sets', function () {

  });
});

describe.skip('When an image set title is clicked', function () {
  it('collapses/reveals its contents', function () {
    // Test me
  });
});

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
