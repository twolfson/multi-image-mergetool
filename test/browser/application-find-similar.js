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
// TODO: Consider putting test behind an environment flag (found via `--grep`?)
describe.only('An application with many similarly failing images', function () {
  // Create our application
  applicationUtils.init(applicationUtils.IMAGE_SETS.PERFORMANCE);

  describe('when finding similarly failing images', function () {
    domUtils.dragOverElement({
      selector: '[data-image-set="mock-img-not-equal-1"] img[data-compare-type=diff]',
      startCoords: {x: 0, y: 0},
      endCoords: {x: 10, y: 10}
    });

    it('resolve them performantly', function (done) {
      var buttonEl = domUtils._findElement.call(this,
        '[data-image-set="mock-img-not-equal-1"] button[data-action="find-similar-images"]');
      var $button = $(buttonEl);
      var suite = new Benchmark.Suite();
      suite.add('Find similar images', {
        // https://github.com/bestiejs/benchmark.js/issues/172
        maxTime: 1,
        fn: function () {
          $button.click();
        }
      });
      suite.on('complete', function handleCompletion () {
        // https://benchmarkjs.com/docs
        var benchmark = this[0];
        expect(benchmark.stats.sample.length).to.be.at.least(2);
        expect(benchmark.stats.mean).to.be.at.least(0.100); // 100 ms
        expect(benchmark.stats.mean).to.be.at.most(0.600); // 600 ms
        done();
      });
      expect('Need to move performance test back to 200 items or so. Maybe use Firefox and Chrome as they should be better performance than PhantomJS').to.equal(false);
      suite.run();
    });
  });
});
