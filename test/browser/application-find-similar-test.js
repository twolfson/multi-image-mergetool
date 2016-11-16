// Load in our dependencies
var $ = require('jquery');
var assert = require('assert');
var expect = require('chai').expect;
var applicationUtils = require('./utils/application');
var mouseUtils = require('./utils/mouse');

// Define reused actions in tests
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

// Start our tests
describe.only('An application with similarly failing images', function () {
  // Create our application
  applicationUtils.init(applicationUtils.IMAGE_SETS.MULTIPLE_NOT_EQUAL);

  describe('when finding similarly failing images', function () {
    before(overlayDiffImg);
    before(clickFindSimilarImages);
    applicationUtils.screenshot('find-similar-matching');

    it('lists similarly failing images in results', function () {

    });
  });
});

describe('An application with no similarly failing images', function () {
  // Create our application
  applicationUtils.init(applicationUtils.IMAGE_SETS.DEFAULT);

  describe('when finding similarly failing images', function () {
    before(overlayDiffImg);
    before(clickFindSimilarImages);
    applicationUtils.screenshot('find-similar-no-matching');

    it('lists no similarly failing images in results', function () {

    });
  });
});
