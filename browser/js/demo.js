// Script for making our demo work
// Load in our dependencies
var sinonUtils = require('../../test/utils/sinon');
var xhrResponses = require('../../test/test-files/http-responses/xhr');

// Start a Sinon server that approves all images
var sinonContext = {};
sinonUtils._mockXHR.call(sinonContext, [xhrResponses.UPDATE_IMAGE_SET_APPROVE]);
