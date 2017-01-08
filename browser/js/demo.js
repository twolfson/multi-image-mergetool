// Script for making our demo work
// Load in our dependencies
var sinonUtils = require('../../test/utils/sinon');
var xhrResponses = require('../../test/test-files/http-responses/xhr');

// Define Mocha hook mocks
global.before = function (fn) { fn(); };
global.after = function (fn) { /* Don't run after functions */ };

// Start a Sinon server that approves all images
sinonUtils.mockXHR([xhrResponses.UPDATE_IMAGE_SET_APPROVE]);

// Load in normal script
void require('./index.js');
