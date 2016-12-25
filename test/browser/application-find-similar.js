// Load in our dependencies
var $ = require('jquery');
var async = require('async');
var expect = require('chai').expect;
var UAParser = require('ua-parser-js');
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

describe('An application with new images', function () {
  // Create our application
  applicationUtils.init(applicationUtils.IMAGE_SETS.MULTIPLE_WITH_NEW);

  describe('when finding similarly failing images', function () {
    domUtils.dragOverElement({
      selector: '[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]',
      startCoords: {x: 0, y: 0},
      endCoords: {x: 10, y: 10}
    });
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action="find-similar-images"]');

    it('has no errors', function () {
      // An error would be thrown in `domUtils.click`
    });
  });
});

// Define a performance test
// DEV: We skip PhantomJS as its performance results are inaccurate
var browser = new UAParser().getBrowser();
if (browser.name !== 'PhantomJS' && window.location.href.indexOf('/debug.html') === -1) {
  describe('An application with many similarly failing images', function () {
    // Create our application
    applicationUtils.init(applicationUtils.IMAGE_SETS.PERFORMANCE);

    describe('when finding similarly failing images', function () {
      domUtils.dragOverElement({
        selector: '[data-image-set="mock-img-not-equal1"] img[data-compare-type=diff]',
        startCoords: {x: 0, y: 0},
        endCoords: {x: 10, y: 10}
      });

      it('resolve them performantly', function (done) {
        // Find and prepare our button
        var that = this;
        var buttonEl = domUtils._findElement.call(this,
          '[data-image-set="mock-img-not-equal1"] button[data-action="find-similar-images"]');
        var $button = $(buttonEl);

        // Collect our samples
        // DEV: We were using `benchmark` but it caused our host system to lag
        //   Reference code: https://github.com/twolfson/multi-image-mergetool/blob/b36760d6054fc6a47e67b7d87fefeaf24152a6d7/test/browser/application-find-similar.js#L76-L98
        var samples = [];
        async.timesSeries(10, function collectSample (i, cb) {
          // Click our button and record sample
          var start = Date.now();
          $button.click();
          var end = Date.now();
          samples.push(end - start);

          // Continue to next action
          // DEV: We use `nextTick` to prevent sync/async zalgo
          process.nextTick(cb);
        }, function handleResult (err) {
          // If there was an error, callback with it
          if (err) {
            return done(err);
          }

          // Verify we have 50 matching images
          // DEV: This is a sanity check
          var similarImageSetEls = that.containerEl.querySelectorAll('.results [data-similar-image-set]');
          expect(similarImageSetEls).to.have.length(50);
          expect(similarImageSetEls[0].getAttribute('data-similar-image-set')).to.equal('mock-img-not-equal1');
          expect(similarImageSetEls[1].getAttribute('data-similar-image-set')).to.equal('mock-img-not-equal3');

          // Assert average/mean is good
          var total = samples.reduce(function sumSamples (a, b) {
            return a + b;
          }, 0);
          var mean = total / samples.length;
          expect(mean).to.be.at.least(100); // ms
          expect(mean).to.be.at.most(600); // ms

          // Complete our result
          done();
        });
      });
    });
  });
}
