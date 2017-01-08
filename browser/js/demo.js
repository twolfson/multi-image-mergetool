// Script for making our demo work
// Load in our dependencies
var $ = require('jquery');
var assert = require('assert');
var GlobalState = require('./global-state');
var ImageSet = require('./image-set');
var utils = require('./utils');
var SimilarImageResults = require('./similar-image-results');
var sinonUtils = require('../../test/utils/sinon');
var xhrResponses = require('../../test/test-files/http-responses/xhr');

// TODO: Move to simpler mock stubs (e.g. `getUpdateChangesArgs`)

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
      // Resolve our image set
      var imageSetMatch = request.url.match(/\/update-image-set\/([^\/]+)/);
      assert(imageSetMatch, 'Unable to extract ImageSet if from "' + request.url);
      var imageSet = GlobalState.getImageSetById(decodeURIComponent(imageSetMatch[1]));
      assert(imageSet, 'Unable to find image set by id "' + imageSetMatch[1] + '"');

      // Convert our image into its base64 equivalent and compare them
      // DEV: We are using a strict comparison which banks on canvas encoding consistently across different content
      // DEV: We cannot generate a new image/wait for it to load as Sinon requires synchronous responses
      //   https://github.com/sinonjs/sinon/blob/v1.17.6/lib/sinon/util/fake_server.js#L204-L206
      //   https://github.com/sinonjs/sinon/blob/v1.17.6/lib/sinon/util/fake_server.js#L57-L61
      var currentImg = imageSet.currentImg; assert(currentImg);
      var currentImgBase64 = utils.getBase64Content(currentImg);
      var newRefBase64Data = decodeURIComponent(request.requestBody.replace('ref=', ''));
      assert(newRefBase64Data.indexOf('data:image/png;base64,') === 0);
      var imagesMatch = currentImgBase64 === newRefBase64Data;

      // Reply to our request
      // http://sinonjs.org/docs/#respond
      var response = imagesMatch ? xhrResponses.UPDATE_IMAGE_SET_APPROVE : xhrResponses.UPDATE_IMAGE_SET_DISAPPROVE;
      request.respond.apply(request, sinonUtils.getMockXHRResponse(response));
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
  var _updateReferenceImage = ImageSet.prototype.updateReferenceImage;
  function updateImageSetURLs(imageSet, diffBase64Data, refBase64Data) {
    // Overwrite image URLs for new images
    assert(diffBase64Data && refBase64Data, 'Expected both diffBase64Data and refBase64Data but didn\'t receive both');
    imageSet.imageSetInfo.diffImageUrl = diffBase64Data;
    imageSet.imageSetInfo.refImageUrl = refBase64Data;

    // If we have images, then update their src
    if (imageSet.diffImg) { imageSet.diffImg.setAttribute('src', diffBase64Data); }
    if (imageSet.refImg) { imageSet.refImg.setAttribute('src', refBase64Data); }
  }
  sinonUtils.contextFreeStub(ImageSet.prototype, 'acceptChanges',
      function acceptChangesStub (diffBase64Data, refBase64Data) {
    // Call custom hook to update image URLs
    updateImageSetURLs(this, diffBase64Data, refBase64Data);

    // Run normal method
    return _acceptChanges.call(this, refBase64Data);
  });
  sinonUtils.contextFreeStub(ImageSet.prototype, 'updateReferenceImage',
      function updateReferenceImageStub (diffBase64Data, refBase64Data) {
    updateImageSetURLs(this, diffBase64Data, refBase64Data);
    return _updateReferenceImage.call(this, refBase64Data);
  });

  // Mock over SimilarImageResults hooks to send additional `diff` base64
  sinonUtils.contextFreeStub(SimilarImageResults, 'acceptSimilarImageSet',
      function acceptSimilarImageSetStub (similarImageSetEl) {
    // Move back to jQuery collection
    var $similarImageSet = $(similarImageSetEl);
    var similarImageSetId = $similarImageSet.data('similar-image-set');

    // Find our original current image
    var $originalCurrentImg = $similarImageSet.find('.original-current');
    assert.strictEqual($originalCurrentImg.length, 1);
    var originalCurrentImgBase64 = utils.getBase64Content($originalCurrentImg[0]);

    // Run update function
    var newRefBase64Data = originalCurrentImgBase64;
    var newDiffBase64Data = originalCurrentImgBase64;
    var imageSet = GlobalState.fetchImageSetById(similarImageSetId);
    imageSet.acceptChanges(newDiffBase64Data, newRefBase64Data);
  });
  sinonUtils.contextFreeStub(SimilarImageResults, 'updateSimilarImageSet',
      function updateSimilarImageSetStub (similarImageSetEl) {
    // Move back to jQuery collection
    var $similarImageSet = $(similarImageSetEl);
    var similarImageSetId = $similarImageSet.data('similar-image-set');

    // Extract updated base64 content
    var $updatedDiffCanvas = $similarImageSet.find('.updated-diff');
    assert.strictEqual($updatedDiffCanvas.length, 1);
    var updatedDiffBase64Data = $updatedDiffCanvas[0].toDataURL('image/png');
    var $updatedRefCanvas = $similarImageSet.find('.updated-ref');
    assert.strictEqual($updatedRefCanvas.length, 1);
    var updatedRefBase64Data = $updatedRefCanvas[0].toDataURL('image/png');

    // Run update function
    // TODO: Remove results when all loaded
    var imageSet = GlobalState.fetchImageSetById(similarImageSetId);
    imageSet.updateReferenceImage(updatedDiffBase64Data, updatedRefBase64Data);
  });

  // Mock over cachebustImg to always swap images to `current` variant
  // Silence cache busting in favor of directly swapping URLs in accept/update stubs
  sinonUtils.contextFreeStub(ImageSet, 'cachebustImg');
};

// Load in normal script
void require('./index.js');
