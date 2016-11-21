// Load in our dependencies
var fs = require('fs');
var sinonUtils = require('../../utils/sinon');
var updateImageSetFilepathEqualResponse = fs.readFileSync(
  __dirname + '/../../test-files/http-responses/update-image-set-filepath-equal.json', 'utf8');
var updateImageSetFilepathNotEqualResponse = fs.readFileSync(
  __dirname + '/../test-files/http-responses/update-image-set-filepath-not-equal.json', 'utf8');

// Define our helpers
exports.approveAllUpdates = function () {
  sinonUtils.mockXHR([{
    method: 'POST',
    url: /\/update-image-set\/[^\/]+/,
    statusCode: 200,
    headers: {'Content-Type': 'application/json'},
    body: updateImageSetFilepathEqualResponse // {imagesEqual: true}
  }]);
};

exports.disapproveAllUpdates = function () {
  sinonUtils.mockXHR([{
    method: 'POST',
    url: /\/update-image-set\/[^\/]+/,
    statusCode: 200,
    headers: {'Content-Type': 'application/json'},
    // jscs:disable maximumLineLength
    // Set via: echo -n '{"imagesEqual":false}' > test/test-files/http-responses/update-image-set-filepath-not-equal.json
    // jscs:enable maximumLineLength
    body: updateImageSetFilepathNotEqualResponse // {imagesEqual: false}
  }]);
};

exports.replyWithError = function () {
  sinonUtils.mockXHR([{
    method: 'POST',
    url: /\/update-image-set\/[^\/]+/,
    statusCode: 500,
    body: 'Internal server error'
  }]);
};
