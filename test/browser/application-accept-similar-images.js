// Load in our dependencies
var expect = require('chai').expect;
var applicationUtils = require('./utils/application');
var domUtils = require('./utils/dom');
var sinonUtils = require('./utils/sinon');
var xhrResponses = require('./utils/xhr');

// Start our tests
describe('An application with similarly failing images', function () {
  describe('when accepting some similarly failing images', function () {
    applicationUtils.init(applicationUtils.IMAGE_SETS.MULTIPLE_NOT_EQUAL);
    domUtils.dragOverElement({
      selector: '[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]',
      startCoords: {x: 0, y: 0},
      endCoords: {x: 10, y: 10}
    });
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="find-similar-images"]');
    sinonUtils.mockXHR([xhrResponses.UPDATE_IMAGE_SET_APPROVE]);
    before(function deselectSimilarImageSets () {
      var currentSimilarImageSetEl = this.containerEl.querySelector('[data-similar-image-set="mock-img-not-equal"]');
      var saveUpdateEl = currentSimilarImageSetEl.querySelector('[name=save_update]');
      saveUpdateEl.checked = false;
    });
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="accept-similar-images"]');
    applicationUtils.screenshot('accept-some-similar-images');

    it('updates selected images in full in its image set', function () {
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
      var imgEl = this.containerEl.querySelector(
        '[data-image-set="mock-img-not-equal2"] img[data-compare-type=current]');
      var expectedBase64 = applicationUtils.getBase64Content(imgEl);
      expect(requests[0].requestBody).to.equal('ref=' + encodeURIComponent(expectedBase64));

      // DEV: We could assert cachebusted URLs but that is redundant at the moment
    });

    it('doesn\'t update unselected images', function () {
      // Verify image set status not updated
      var imageSetTitleEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"] .image-set__title');
      expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('false');

      // DEV: XHR assertions are done in previous `it`
      //   Mostly via length check + url check
    });

    it.skip('removes results for similar images', function () {
      // Placeholder content
    });
  });

  describe('when accepting all similarly failing images', function () {
    applicationUtils.init(applicationUtils.IMAGE_SETS.MULTIPLE_NOT_EQUAL);
    domUtils.dragOverElement({
      selector: '[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]',
      startCoords: {x: 0, y: 0},
      endCoords: {x: 10, y: 10}
    });
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="find-similar-images"]');
    sinonUtils.mockXHR([xhrResponses.UPDATE_IMAGE_SET_APPROVE]);
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="accept-similar-images"]');
    applicationUtils.screenshot('accept-all-similar-images');

    it.skip('collapses current image set', function () {
      // Placeholder content
    });
  });
});
