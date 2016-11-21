// Load in our dependencies
var fs = require('fs');
var updateImageSetFilepathEqualResponse = fs.readFileSync(
  __dirname + '/../../test-files/http-responses/update-image-set-filepath-equal.json', 'utf8');
var updateImageSetFilepathNotEqualResponse = fs.readFileSync(
  __dirname + '/../test-files/http-responses/update-image-set-filepath-not-equal.json', 'utf8');

// Define our helpers
exports.UPDATE_IMAGE_SET_APPROVE = {
  method: 'POST',
  url: /\/update-image-set\/[^\/]+/,
  statusCode: 200,
  headers: {'Content-Type': 'application/json'},
  body: updateImageSetFilepathEqualResponse // {imagesEqual: true}
};

exports.UPDATE_IMAGE_SET_DISAPPROVE = {
  method: 'POST',
  url: /\/update-image-set\/[^\/]+/,
  statusCode: 200,
  headers: {'Content-Type': 'application/json'},
  // jscs:disable maximumLineLength
  // Set via: echo -n '{"imagesEqual":false}' > test/test-files/http-responses/update-image-set-filepath-not-equal.json
  // jscs:enable maximumLineLength
  body: updateImageSetFilepathNotEqualResponse // {imagesEqual: false}
};

exports.UPDATE_IMAGE_SET_ERROR = {
  method: 'POST',
  url: /\/update-image-set\/[^\/]+/,
  statusCode: 500,
  body: 'Internal server error'
};
