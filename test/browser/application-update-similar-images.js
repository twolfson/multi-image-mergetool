// Load in our dependencies
var fs = require('fs');
var $ = require('jquery');
var assert = require('assert');
var expect = require('chai').expect;
var sinonUtils = require('../utils/sinon');
// DEV: For unknown reasons, we must import `sinonUtils` before `applicationUtils`
var applicationUtils = require('./utils/application');
var domUtils = require('./utils/dom');
var updateImageSetFilepathEqualResponse = fs.readFileSync(
  __dirname + '/../test-files/http-responses/update-image-set-filepath-equal.json', 'utf8');
var updateImageSetFilepathNotEqualResponse = fs.readFileSync(
  __dirname + '/../test-files/http-responses/update-image-set-filepath-not-equal.json', 'utf8');

// Define reused actions in tests
// TODO: Consolidate reused actions in tests (currently not sober enough to consolidate them wisely)
function clickFindSimilarImages() {
  var buttonEl = this.containerEl.querySelector(
    '[data-image-set="mock-img-not-equal"] button[data-action="find-similar-images"]');
  assert(buttonEl);
  $(buttonEl).click();
}
function approveAllXHRUpdates() {
  sinonUtils.mockXHR([{
    method: 'POST',
    url: /\/update-image-set\/[^\/]+/,
    statusCode: 200,
    headers: {'Content-Type': 'application/json'},
    body: updateImageSetFilepathEqualResponse // {imagesEqual: true}
  }]);
}
function disapproveAllXHRUpdates() {
  sinonUtils.mockXHR([{
    method: 'POST',
    url: /\/update-image-set\/[^\/]+/,
    statusCode: 200,
    headers: {'Content-Type': 'application/json'},
    // jscs:disable maximumLineLength
    // Set via: echo -n '{"imagesEqual":false}' > test/test-files/http-responses/update-image-set-filepath-not-equal.json
    // jscs:enable maximumLineLength
    body: updateImageSetFilepathNotEqualResponse // {imagesEqual: false}
  }]);
}
function clickUpdateSimilarImages() {
  // Click our update button
  var buttonEl = this.containerEl.querySelector(
    '[data-image-set="mock-img-not-equal"] button[data-action="update-similar-images"]');
  assert(buttonEl);
  $(buttonEl).click();
}

// Start our tests
describe('An application with similarly failing images', function () {
  describe('when updating some similarly failing images partially', function () {
    applicationUtils.init(applicationUtils.IMAGE_SETS.MULTIPLE_NOT_EQUAL);
    before(function partiallyOverlayDiffImg (done) {
      // DEV: We use an expanded image set so we can click/drag
      var diffImg = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]');
      var diffImgBounds = diffImg.getBoundingClientRect();
      domUtils.dragMouse({
        targetEl: diffImg,
        startCoords: {x: diffImgBounds.left, y: diffImgBounds.top},
        endCoords: {x: diffImgBounds.left + 10, y: diffImgBounds.top + 10},
        duration: 100 // ms
      }, done);
    });
    before(clickFindSimilarImages);
    disapproveAllXHRUpdates();
    before(function deselectSimilarImageSets () {
      var currentSimilarImageSetEl = this.containerEl.querySelector('[data-similar-image-set="mock-img-not-equal"]');
      var saveUpdateEl = currentSimilarImageSetEl.querySelector('[name=save_update]');
      saveUpdateEl.checked = false;
    });
    before(clickUpdateSimilarImages);
    // DEV: This is effectively waiting for new image sources to update
    // TODO: Figure out how to detect when images have new source and it's not yet loaded
    //   Maybe a cache table and cache table resetter via `applicationUtils.init`?
    before(function wait100Ms (done) {
      setTimeout(done, 100);
    });
    applicationUtils.screenshot('update-similar-images-partially');

    it('updates selected images partially in its image set', function () {
      // Verify image set status was updated-ish
      var imageSetTitleEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal2"] .image-set__title');
      expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('false');

      // Assert XHR sent
      var requests = this.sinonServer.requests;
      expect(requests).to.have.length(1);
      expect(requests[0].url).to.equal('/update-image-set/mock-img-not-equal2');
      // DEV: We don't exclusively compare to the original mock data as they could both be null or similar
      expect(requests[0].requestBody).to.contain('ref=data');

      // Deep assert XHR content
      // DEV: It's somewhere in-between so we can't quite assert it
      var currentImgEl = this.containerEl.querySelector(
        '[data-image-set="mock-img-not-equal2"] img[data-compare-type=current]');
      var currentBase64 = applicationUtils.getBase64Content(currentImgEl);
      var refImgEl = this.containerEl.querySelector(
        '[data-image-set="mock-img-not-equal2"] img[data-compare-type=ref]');
      var refBase64 = applicationUtils.getBase64Content(refImgEl);
      expect(requests[0].requestBody).to.not.equal('ref=' + encodeURIComponent(currentBase64));
      expect(requests[0].requestBody).to.not.equal('ref=' + encodeURIComponent(refBase64));

      // DEV: We could assert cachebusted URLs but that is redundant at the moment
    });

    it('doesn\'t update unselected images', function () {
      // Verify image set status not updated
      var imageSetTitleEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"] .image-set__title');
      expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('false');

      // DEV: XHR assertions are done in previous `it`
      //   Mostly via length check + url check
    });
  });

  describe('when updating some similarly failing images fully', function () {
    applicationUtils.init(applicationUtils.IMAGE_SETS.MULTIPLE_NOT_EQUAL);
    before(function fullyOverlayDiffImg (done) {
      // DEV: We use an expanded image set so we can click/drag
      var diffImg = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]');
      var diffImgBounds = diffImg.getBoundingClientRect();
      domUtils.dragMouse({
        targetEl: diffImg,
        startCoords: {x: diffImgBounds.left, y: diffImgBounds.top},
        endCoords: {x: diffImgBounds.left + 15, y: diffImgBounds.top + 15},
        duration: 100 // ms
      }, done);
    });
    before(clickFindSimilarImages);
    approveAllXHRUpdates();
    before(clickUpdateSimilarImages);
    // DEV: This is effectively waiting for new image sources to update
    // TODO: Figure out how to detect when images have new source and it's not yet loaded
    //   Maybe a cache table and cache table resetter via `applicationUtils.init`?
    before(function wait100Ms (done) {
      setTimeout(done, 100);
    });
    applicationUtils.screenshot('update-similar-images-fully');

    it('updates selected images in full in its image set', function () {
      // Verify image set status updated
      var imageSetTitleEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal2"] .image-set__title');
      expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('true');

      // Assert XHR sent
      var requests = this.sinonServer.requests;
      expect(requests).to.have.length(2);
      expect(requests[0].url).to.equal('/update-image-set/mock-img-not-equal');
      expect(requests[1].url).to.equal('/update-image-set/mock-img-not-equal2');
      // DEV: We don't exclusively compare to the original mock data as they could both be null or similar
      expect(requests[0].requestBody).to.contain('ref=data');

      // Deep assert XHR content
      var imgEl = this.containerEl.querySelector(
        '[data-image-set="mock-img-not-equal"] img[data-compare-type=current]');
      var expectedBase64 = applicationUtils.getBase64Content(imgEl);
      expect(requests[0].requestBody).to.equal('ref=' + encodeURIComponent(expectedBase64));
      imgEl = this.containerEl.querySelector(
        '[data-image-set="mock-img-not-equal2"] img[data-compare-type=current]');
      expectedBase64 = applicationUtils.getBase64Content(imgEl);
      expect(requests[1].requestBody).to.equal('ref=' + encodeURIComponent(expectedBase64));

      // DEV: We could assert cachebusted URLs but that is redundant at the moment
    });

    it.skip('collapses current image set', function () {
      // Placeholder content
    });
  });
});
