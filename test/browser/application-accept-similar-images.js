// Load in our dependencies
var expect = require('chai').expect;
var applicationUtils = require('./utils/application');
var ImageSet = require('../../browser/js/image-set');
var domUtils = require('./utils/dom');
var sinonUtils = require('../utils/sinon');
var xhrResponses = require('../test-files/http-responses/xhr');

// Start our tests
describe('An application with similarly failing images', function () {
  describe('when accepting some similarly failing images', function () {
    // Create an overlay for one of our image sets
    applicationUtils.init(applicationUtils.IMAGE_SETS.MULTIPLE_NOT_EQUAL);
    domUtils.dragOverElement({
      selector: '[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]',
      startCoords: {x: 0, y: 0},
      endCoords: {x: 10, y: 10}
    });

    // Find similar images for said image set
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="find-similar-images"]');

    // Deselect similar images and set up mocks/spies
    before(function deselectSimilarImageSets () {
      var currentSimilarImageSetEl = this.containerEl.querySelector('[data-similar-image-set="mock-img-not-equal"]');
      var saveUpdateEl = currentSimilarImageSetEl.querySelector('[name=save_update]');
      saveUpdateEl.checked = false;
    });
    sinonUtils.spy(ImageSet, 'cachebustImg');
    sinonUtils.mockXHR([xhrResponses.UPDATE_IMAGE_SET_APPROVE]);

    // Trigger accept similar images button and wait for it to process
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="accept-similar-images"]');
    before(function waitForXHRToComplete (done) {
      setTimeout(done, 100);
    });
    applicationUtils.screenshot('accept-some-similar-images');

    it('updates selected images in full in its image set', function () {
      // Verify image set status updated
      var updatedImageSetEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal2"]');
      var updatedTitleEl = updatedImageSetEl.querySelector('.image-set__title');
      expect(updatedTitleEl.getAttribute('data-images-equal')).to.equal('true');

      // Assert XHR sent
      var requests = this.sinonServer.requests;
      expect(requests).to.have.length(1);
      expect(requests[0].url).to.equal('/update-image-set/mock-img-not-equal2');
      // DEV: We don't exclusively compare to the original mock data as they could both be null or similar
      expect(requests[0].requestBody).to.contain('ref=data');

      // Deep assert XHR content
      // DEV: Verifies that updated current image is what was sent
      var updatedCurrentImgEl = updatedImageSetEl.querySelector('img[data-compare-type=current]');
      var expectedBase64 = applicationUtils.getBase64Content(updatedCurrentImgEl);
      expect(requests[0].requestBody).to.equal('ref=' + encodeURIComponent(expectedBase64));

      // Verify we cachebust our images
      var updatedDiffImgEl = updatedImageSetEl.querySelector('img[data-compare-type=diff]');
      var updatedRefImgEl = updatedImageSetEl.querySelector('img[data-compare-type=ref]');
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

    it.skip('removes results for similar images', function () {
      // Placeholder content
    });
  });

  describe('when accepting all similarly failing images', function () {
    // Create an overlay for one of our image sets
    applicationUtils.init(applicationUtils.IMAGE_SETS.MULTIPLE_NOT_EQUAL);
    domUtils.dragOverElement({
      selector: '[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]',
      startCoords: {x: 0, y: 0},
      endCoords: {x: 10, y: 10}
    });

    // Find similar images from overlay
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="find-similar-images"]');

    // Set up mocks
    sinonUtils.mockXHR([xhrResponses.UPDATE_IMAGE_SET_APPROVE]);

    // Trigger accept similar images button and wait for it to process
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="accept-similar-images"]');
    before(function waitForXHRToComplete (done) {
      setTimeout(done, 100);
    });
    applicationUtils.screenshot('accept-all-similar-images');

    it('updates all selected images', function () {
      // DEV: Majority of testing is done by "some similarly" test
      var requests = this.sinonServer.requests;
      expect(requests).to.have.length(2);
      expect(requests[0].url).to.equal('/update-image-set/mock-img-not-equal');
      expect(requests[1].url).to.equal('/update-image-set/mock-img-not-equal2');
    });

    it.skip('collapses current image set', function () {
      // Placeholder content
      // TODO: Should we also clear results, remove overlay, and disable button?
    });
  });
});
