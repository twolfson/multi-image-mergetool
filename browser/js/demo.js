// Script for making our demo work
// Load in our dependencies
var ImageSet = require('./image-set');
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

  // Mock over cachebustImg to always swap images to `current` variant
  // TODO: Update `ImageSet.accept`/`update` callers to send both `diff`/`ref`
  // TODO: Update `ImageSet.accept/update` to update images promptly
  // TODO: Silence `ImageSet.cachebustImg`
  // TODO: Update Sinon mock to perform `pixelmatch` on `ImageSet` content for accuracy
  // TODO: Test demo exclusively via screenshots to reduce maintenane weight
  //   (e.g. we could be using base64, canvas, or images but why worry about details)
  sinonUtils.stub(ImageSet, 'cachebustImg', function cachebustImgstub (imgEl) {
    // images/ref%2Froot.large.png -> images/current%2Froot.large.png
    var originalSrc = imgEl.getAttribute('src');
    var newSrc = originalSrc.replace(/images\/(ref|diff)/, 'images/current');
    imgEl.setAttribute('src', newSrc);
  });
};

// Load in normal script
void require('./index.js');
