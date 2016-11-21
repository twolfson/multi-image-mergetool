// Load in our dependencies
var expect = require('chai').expect;
var applicationUtils = require('./utils/application');
var domUtils = require('./utils/dom');

// Start our tests
describe('An application with similarly failing images', function () {
  // Create our application
  applicationUtils.init(applicationUtils.IMAGE_SETS.MULTIPLE_NOT_EQUAL);

  describe('when finding similarly failing images', function () {
    domUtils.dragOverElement({
      selector: '[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]',
      startCoords: {x: 0, y: 0},
      endCoords: {x: 10, y: 10}
    });
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="find-similar-images"]');
    applicationUtils.screenshot('find-similar-matching');

    it('lists similarly failing images in results', function () {
      var resultsEl = this.containerEl.querySelector('.results');
      expect(resultsEl.textContent).to.not.contain('No similar images found');
      var similarImageSetEls = resultsEl.querySelectorAll('[data-similar-image-set]');
      expect(similarImageSetEls).to.have.length(2);
      expect(similarImageSetEls[0].getAttribute('data-similar-image-set')).to.equal('mock-img-not-equal');
      expect(similarImageSetEls[1].getAttribute('data-similar-image-set')).to.equal('mock-img-not-equal2');
    });
  });
});

describe('An application with no similarly failing images', function () {
  // Create our application
  applicationUtils.init(applicationUtils.IMAGE_SETS.DEFAULT);

  describe('when finding similarly failing images', function () {
    domUtils.dragOverElement({
      selector: '[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]',
      startCoords: {x: 0, y: 0},
      endCoords: {x: 10, y: 10}
    });
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="find-similar-images"]');
    applicationUtils.screenshot('find-similar-no-matching');

    it('lists no similarly failing images in results', function () {
      var resultsEl = this.containerEl.querySelector('.results');
      expect(resultsEl.textContent).to.contain('No similar images found');
      var similarImageSetEls = resultsEl.querySelectorAll('[data-similar-image-set]');
      expect(similarImageSetEls).to.have.length(0);
    });
  });
});
