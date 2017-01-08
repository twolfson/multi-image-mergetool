// Script for making our demo work
// Load in our dependencies
var $ = require('jquery');
var assert = require('assert');
var ImageSet = require('./image-set');
var utils = require('./utils');
var SimilarImageResults = require('./similar-image-results');
var sinonUtils = require('../../test/utils/sinon');
var xhrResponses = require('../../test/test-files/http-responses/xhr');

// Define our demo bindings
window.runDemo = exports.runDemo = function (options) {
  // If we are running live, overwrite Mocha's contents
  if (options && options.overwriteMocha) {
    global.before = function (fn) { fn(); };
    global.after = function (fn) { /* Don't run after functions */ };
  }

  // Start a Sinon server that approves all images
  sinonUtils.mockXHR([{
    method: xhrResponses.UPDATE_IMAGE_SET_APPROVE.method,
    url: xhrResponses.UPDATE_IMAGE_SET_APPROVE.url,
    fn: function (request) {
      // http://sinonjs.org/docs/#respond
      request.respond.apply(request, sinonUtils.getMockXHRResponse(xhrResponses.UPDATE_IMAGE_SET_APPROVE));
    }
  }]);

  // Mock over ImageSet hooks to send additional `diff` base64
  // DEV: We don't send both data sets normally as it's computationally expensive
  sinonUtils.contextFreeStub(ImageSet, 'acceptImageSet', function acceptImageSetStub (imageSet) {
    // Extract and accept base64 content for image
    var refBase64Data = utils.getBase64Content(imageSet.currentImg);
    var diffBase64Data = refBase64Data;
    imageSet.acceptChanges(diffBase64Data, refBase64Data);
  });
  var _acceptChanges = ImageSet.prototype.acceptChanges;
  function updateImageSetURLs(imageSet, diffBase64Data, refBase64Data) {
    // Overwrite image URLs for new images
    imageSet.imageSetInfo.diffImageURL = diffBase64Data;
    imageSet.imageSetInfo.refBase64Data = refBase64Data;

    // If we have images, then update their src
    if (imageSet.diffImg) { imageSet.diffImg.setAttribute('src', diffBase64Data); }
    if (imageSet.refImg) { imageSet.refImg.setAttribute('src', refBase64Data); }
  }
  sinonUtils.contextFreeStub(ImageSet.prototype, 'acceptChanges',
      function acceptChangesStub (diffBase64Data, refBase64Data) {
    // Call custom hook to update image URLs
    assert(diffBase64Data && refBase64Data, 'Expected both diffBase64Data and refBase64Data but didn\'t receive both');
    updateImageSetURLs(this, diffBase64Data, refBase64Data);

    // Run normal method
    return _acceptChanges.call(this, refBase64Data);
  });
  sinonUtils.contextFreeStub(SimilarImageResults, 'acceptSimilarImageSet',
      function acceptSimilarImageSetStub (similarImageSetEl) {
    // Move back to jQuery collection
    var $similarImageSet = $(similarImageSetEl);
    var similarImageSetId = $similarImageSet.data('similar-image-set');

    // Find our original current image
    var $originalCurrentImg = $similarImageSet.find('.original-current');
    assert.strictEqual($originalCurrentImg.length, 1);
    var originalCurrentImgBase64 = utils.getBase64Content($originalCurrentImg[0]);
    console.log('original', originalCurrentImgBase64);
  });

  // Mock over cachebustImg to always swap images to `current` variant
  // TODO: Update `ImageSet.accept`/`update` callers to send both `diff`/`ref`
  // TODO: Update `ImageSet.accept/update` to update images promptly
  // TODO: Silence `ImageSet.cachebustImg`
  // TODO: Update Sinon mock to perform `pixelmatch` on `ImageSet` content for accuracy
  // TODO: Test demo exclusively via screenshots to reduce maintenane weight
  //   (e.g. we could be using base64, canvas, or images but why worry about details)
  // Silence cache busting in favor of
  sinonUtils.contextFreeStub(ImageSet, 'cachebustImg');
};

// Load in normal script
void require('./index.js');
