// Load in our dependencies
var expect = require('chai').expect;
var applicationUtils = require('./utils/application');
var domUtils = require('./utils/dom');
var ImageSet = require('../../browser/js/image-set');
var sinonUtils = require('../utils/sinon');
var xhrResponses = require('../test-files/http-responses/xhr');

// Start our tests
describe('An application with similarly failing images', function () {
  describe('when updating some similarly failing images partially', function () {
    applicationUtils.init(applicationUtils.IMAGE_SETS.MULTIPLE_NOT_EQUAL);
    domUtils.dragOverElement({
      selector: '[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]',
      startCoords: {x: 0, y: 0},
      endCoords: {x: 10, y: 10}
    });
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="find-similar-images"]');
    sinonUtils.spy(ImageSet, 'cachebustImg');
    sinonUtils.mockXHR([xhrResponses.UPDATE_IMAGE_SET_DISAPPROVE]);
    before(function deselectSimilarImageSets () {
      var currentSimilarImageSetEl = this.containerEl.querySelector('[data-similar-image-set="mock-img-not-equal"]');
      var saveUpdateEl = currentSimilarImageSetEl.querySelector('[name=save_update]');
      saveUpdateEl.checked = false;
    });
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="update-similar-images"]');
    // DEV: This is effectively waiting for new image sources to update
    // TODO: Figure out how to detect when images have new source and it's not yet loaded
    //   Maybe a cache table and cache table resetter via `applicationUtils.init`?
    before(function wait100Ms (done) {
      setTimeout(done, 100);
    });
    applicationUtils.screenshot('update-similar-images-partially');

    it('updates selected images partially in its image set', function () {
      // Verify image set status was updated-ish
      var updatedImageSetEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal2"]');
      var updatedTitleEl = updatedImageSetEl.querySelector('.image-set__title');
      expect(updatedTitleEl.getAttribute('data-images-equal')).to.equal('false');

      // Assert XHR sent
      var requests = this.sinonServer.requests;
      expect(requests).to.have.length(1);
      expect(requests[0].url).to.equal('/update-image-set/mock-img-not-equal2');
      // DEV: We don't exclusively compare to the original mock data as they could both be null or similar
      expect(requests[0].requestBody).to.contain('ref=data');

      // Deep assert XHR content
      // DEV: Updated image state is somewhere between ref and current so we can't quite assert it
      var updatedCurrentImgEl = updatedImageSetEl.querySelector('img[data-compare-type=current]');
      var updatedCurrentBase64 = applicationUtils.getBase64Content(updatedCurrentImgEl);
      var updatedRefImgEl = updatedImageSetEl.querySelector('img[data-compare-type=ref]');
      var updatedRefBase64 = applicationUtils.getBase64Content(updatedRefImgEl);
      expect(requests[0].requestBody).to.not.equal('ref=' + encodeURIComponent(updatedCurrentBase64));
      expect(requests[0].requestBody).to.not.equal('ref=' + encodeURIComponent(updatedRefBase64));

      // Verify we cachebust our images
      var updatedDiffImgEl = updatedImageSetEl.querySelector('img[data-compare-type=diff]');
      updatedRefImgEl = updatedImageSetEl.querySelector('img[data-compare-type=ref]');
      var cachebustImgSpy = ImageSet.cachebustImg;
      expect(cachebustImgSpy.callCount).to.equal(2);
      // DEV: We use `outerHTML` to prevent errors with Mocha's serializer
      expect(cachebustImgSpy.args[0][0].outerHTML).to.equal(updatedDiffImgEl.outerHTML);
      expect(cachebustImgSpy.args[1][0].outerHTML).to.equal(updatedRefImgEl.outerHTML);
    });

    it('doesn\'t update unselected images', function () {
      // Verify image set status not updated
      var notUpdatedImageSetEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"]');
      var notUpdatedTitleEl = notUpdatedImageSetEl.querySelector('.image-set__title');
      expect(notUpdatedTitleEl.getAttribute('data-images-equal')).to.equal('false');

      // DEV: XHR assertions are done in previous `it`
      //   Mostly via length check + url check
    });
  });

  describe('when updating some similarly failing images fully', function () {
    applicationUtils.init(applicationUtils.IMAGE_SETS.MULTIPLE_NOT_EQUAL);
    domUtils.dragOverElement({
      selector: '[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]',
      startCoords: {x: 0, y: 0},
      endCoords: {x: 15, y: 15}
    });
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="find-similar-images"]');
    sinonUtils.mockXHR([xhrResponses.UPDATE_IMAGE_SET_APPROVE]);
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="update-similar-images"]');
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
      // DEV: This is verifies we are using overlay selection whereas partial update test couldn't
      var imgEl = this.containerEl.querySelector(
        '[data-image-set="mock-img-not-equal"] img[data-compare-type=current]');
      var expectedBase64 = applicationUtils.getBase64Content(imgEl);
      expect(requests[0].requestBody).to.equal('ref=' + encodeURIComponent(expectedBase64));
      imgEl = this.containerEl.querySelector(
        '[data-image-set="mock-img-not-equal2"] img[data-compare-type=current]');
      expectedBase64 = applicationUtils.getBase64Content(imgEl);
      expect(requests[1].requestBody).to.equal('ref=' + encodeURIComponent(expectedBase64));

      // DEV: We don't test cachebusting due to it being fully redundant to partial update
    });

    it.skip('collapses current image set', function () {
      // Placeholder content
    });
  });
});

// Demo tests
describe('On a demo page', function () {
  describe.only('a user updating all similarly failing images partially', function () {
    applicationUtils.init(applicationUtils.IMAGE_SETS.MULTIPLE_NOT_EQUAL);
    applicationUtils.runDemo();
    domUtils.dragOverElement({
      selector: '[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]',
      startCoords: {x: 0, y: 0},
      endCoords: {x: 10, y: 10}
    });
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="find-similar-images"]');
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="update-similar-images"]');
    before(function waitForXHRToComplete (done) {
      setTimeout(done, 100);
    });
    applicationUtils.screenshot('demo-update-all-similar-images');

    it('has no errors', function () {
      // Verified by utilities
    });
  });
});
