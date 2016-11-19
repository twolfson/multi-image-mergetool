// Load in our dependencies
var fs = require('fs');
var $ = require('jquery');
var assert = require('assert');
var expect = require('chai').expect;
var sinonUtils = require('../utils/sinon');
// DEV: For unknown reasons, we must import `sinonUtils` before `applicationUtils`
var applicationUtils = require('./utils/application');
var mouseUtils = require('./utils/mouse');
var updateImageSetFilepathEqualResponse = fs.readFileSync(
  __dirname + '/../test-files/http-responses/update-image-set-filepath-equal.json', 'utf8');
var updateImageSetFilepathNotEqualResponse = fs.readFileSync(
  __dirname + '/../test-files/http-responses/update-image-set-filepath-not-equal.json', 'utf8');

// Define reused actions in tests
// TODO: Consolidate reused actions in tests (currently not sober enough to consolidate them wisely)
function overlayDiffImg(done) {
  // DEV: We use an expanded image set so we can click/drag
  var diffImg = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]');
  var diffImgBounds = diffImg.getBoundingClientRect();
  mouseUtils.moveMouse({
    targetEl: diffImg,
    startCoords: {x: diffImgBounds.left, y: diffImgBounds.top},
    endCoords: {x: diffImgBounds.left + 10, y: diffImgBounds.top + 10},
    duration: 100 // ms
  }, done);
}
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
    // jscs:disable maximumLineLength
    // Set via: echo -n '{"imagesEqual":false}' > test/test-files/http-responses/update-image-set-filepath-not-equal.json
    // jscs:enable maximumLineLength
    body: updateImageSetFilepathEqualResponse // {imagesEqual: false}
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
  var buttonEl = this.containerEl.querySelector(
    '[data-image-set="mock-img-not-equal"] button[data-action="update-similar-images"]');
  assert(buttonEl);
  $(buttonEl).click();
}

// Start our tests
describe('An application with similarly failing images', function () {
  describe.only('when updating some similarly failing images partially', function () {
    applicationUtils.init(applicationUtils.IMAGE_SETS.MULTIPLE_NOT_EQUAL);
    before(overlayDiffImg);
    before(clickFindSimilarImages);
    disapproveAllXHRUpdates();
    before(function deselectSimilarImageSets () {
      var currentSimilarImageSetEl = this.containerEl.querySelector('[data-similar-image-set="mock-img-not-equal"]');
      var saveUpdateEl = currentSimilarImageSetEl.querySelector('[name=save_update]');
      saveUpdateEl.checked = false;
    });
    before(clickUpdateSimilarImages);
    applicationUtils.screenshot('update-similar-images-partially');

    it('updates selected images partially in its image set', function () {
      // Verify image set status updated
      var imageSetTitleEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal2"] .image-set__title');
      expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('true');

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
    before(function overlayDiffImg (done) {
      // DEV: We use an expanded image set so we can click/drag
      var diffImg = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]');
      var diffImgBounds = diffImg.getBoundingClientRect();
      mouseUtils.moveMouse({
        targetEl: diffImg,
        startCoords: {x: diffImgBounds.left, y: diffImgBounds.top},
        endCoords: {x: diffImgBounds.left + 15, y: diffImgBounds.top + 15},
        duration: 100 // ms
      }, done);
    });
    before(clickFindSimilarImages);
    approveAllXHRUpdates();
    before(clickUpdateSimilarImages);
    applicationUtils.screenshot('update-similar-images-fully');

    it.skip('collapses current image set', function () {
      // Placeholder content
    });
  });
});
