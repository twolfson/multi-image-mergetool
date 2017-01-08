// Script for making our demo work
// Load in our dependencies
var ImageSet = require('./image-set');
var sinonUtils = require('../../test/utils/sinon');
var xhrResponses = require('../../test/test-files/http-responses/xhr');

// Define Mocha hook mocks
global.before = function (fn) { fn(); };
global.after = function (fn) { /* Don't run after functions */ };

// Start a Sinon server that approves all images
sinonUtils.mockXHR([xhrResponses.UPDATE_IMAGE_SET_APPROVE]);

// Mock over cachebustImg to always swap images to `current` variant
sinonUtils.stub(ImageSet, 'cachebustImg', function cachebustImgstub (imgEl) {
  // images/ref%2Froot.large.png -> images/current%2Froot.large.png
  var originalSrc = imgEl.getAttribute('src');
  var newSrc = originalSrc.replace(/images\/(ref|diff)/, 'images/current');
  imgEl.setAttribute('src', newSrc);
});

// Load in normal script
void require('./index.js');
