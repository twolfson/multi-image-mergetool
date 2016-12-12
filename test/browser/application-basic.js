// Load in our dependencies
var $ = require('jquery');
var expect = require('chai').expect;
var applicationUtils = require('./utils/application');
var domUtils = require('./utils/dom');

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
  // TODO: Disable "Find similar images" button on initial render
  // before(function assertFindSimilarImagesDisabled () {
  //   var buttonEl = this.containerEl.querySelector(
  //     '[data-image-set="mock-img-not-equal"] button[data-action=find-similar-images]');
  //   expect(buttonEl.getAttribute('disabled')).to.equal('disabled');
  // });
  domUtils.dragOverElement({
    selector: '[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]',
    startCoords: {x: 0, y: 0},
    endCoords: {x: 10, y: 10}
  });
  applicationUtils.screenshot('overlay-generated');

  it('generates an overlay', function () {
    expect(document.body.querySelector('.overlay')).to.not.equal(null);
  });

  it.skip('enables the "Find similar images" button', function () {
    var buttonEl = this.containerEl.querySelector(
      '[data-image-set="mock-img-not-equal"] button[data-action=find-similar-images]');
    // TODO: Verify `getAttribute` is proper method and `disabled` is proper value for assertion
    expect(buttonEl.getAttribute('disabled')).to.not.equal('disabled');
  });

  describe('when the image set is collapsed', function () {
    before(function assertOverlayVisible () {
      var $overlay = $(document.body.querySelector('.overlay'));
      expect($overlay.filter(':visible').length).to.equal(1);
    });
    before(function collapseImageSet () {
      var imageSetEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"]');
      var imageSetTitleEl = imageSetEl.querySelector('.image-set__title');
      var imageSetCollapseEl = imageSetEl.querySelector('.image-set__collapse');
      $(imageSetTitleEl).click();
      expect([].slice.call(imageSetCollapseEl.classList)).to.not.include('in');
    });
    applicationUtils.screenshot('overlay-hidden');

    it('makes the overlay no longer visible', function () {
      var $overlay = $(document.body.querySelector('.overlay'));
      expect($overlay.filter(':visible').length).to.equal(0);
    });
  });
});

// TODO: Test out we don't oversize small images (both in normal and similar results)
// TODO: Test out we don't let big images be too big (both in normal and similar results)
