// Load in our dependencies
var $ = require('jquery');
var expect = require('chai').expect;
var applicationUtils = require('./utils/application');
var mouseUtils = require('./utils/mouse');

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
//   Test out using overlay enables "Find similar" button
//   Test out select overlay area (either via events or mocking) and finding similar images
//      - No matches found
//      - Matches found
//   Test out overlay selection with different values, verify it's cleared out and not appended to
//   Test out accepting all images (hits endpoint, approval/error)
//      Verify each image set is listed
//      Add TODOs about cleaning results and collapsing section and disabling "Find similar" button
//   Test out accepting some images (doesn't hit endpoint for all images)
//   Test out approving selection for all images (hits endpoint, approval/failure/error)
//   Test out approving selection for some images (doesn't hit endpoint for all images)
