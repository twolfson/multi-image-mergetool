// Load in our dependencies
var $ = require('jquery');
var expect = require('chai').expect;
var Benchmark = window.Benchmark = require('benchmark');
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

    it('marks current image set with keyword', function () {
      var resultsEl = this.containerEl.querySelector('.results');
      var similarImageSetEls = resultsEl.querySelectorAll('[data-similar-image-set]');
      expect(similarImageSetEls[0].textContent).to.contain(' (current set)');
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

// Define a performance test
describe.only('An application with many similarly failing images', function () {
  // Create our application
  applicationUtils.init(applicationUtils.IMAGE_SETS.PERFORMANCE);

  describe('when finding similarly failing images', function () {
    // TODO: Use big images, our small base64 won't cut it for performance
    domUtils.dragOverElement({
      selector: '[data-image-set="mock-img-not-equal-1"] img[data-compare-type=diff]',
      startCoords: {x: 0, y: 0},
      endCoords: {x: 10, y: 10}
    });

    it('resolve them performantly', function (done) {
      this.timeout(10000);
      var buttonEl = domUtils._findElement.call(this,
        '[data-image-set="mock-img-not-equal-1"] button[data-action="find-similar-images"]');
      var $button = $(buttonEl);
      var suite = new Benchmark.Suite();
      suite.add('Find similar images', function () {
        $button.click();
      });
      suite.on('complete', function handleCompletion () {
        console.log(this);
        done();
      });
      suite.run();
    });
  });
});
