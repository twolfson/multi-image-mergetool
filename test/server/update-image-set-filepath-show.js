// Load in our dependencies
var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var ImageSet = require('../../server/image-set');
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');
var fsUtils = require('./utils/fs');

// Load in reused constants
var dotFilepath = __dirname + '/../test-files/dot.png';
var dotBase64 = fs.readFileSync(dotFilepath, 'base64');

// Start our tests
describe('A request to POST /update-image-set/:filepath', function () {
  describe('for an registered existent filepath', function () {
    // Create a temporary ref file to update
    // DEV: We could use mocking for updating the file but this removes one more contract to maintain
    var currentFilepath = dotFilepath;
    var currentBase64 = dotBase64;
    var originalRefFilepath = __dirname + '/../test-files/diagonal.png';
    var refFilepath = __dirname + '/../test-files/tmp/update-image-set-filepath/existent.png';
    fsUtils.resetDir(__dirname + '/../test-files/tmp/update-image-set-filepath');
    before(function copyRefFilepath () {
      fs.writeFileSync(refFilepath, fs.readFileSync(originalRefFilepath));
    });

    // Run a server
    serverUtils.run(ImageSet.generateSets([
      currentFilepath
    ], [
      refFilepath
    ], {
      diffImages: ['/dev/null']
    }));

    // Make our request
    httpUtils.save({
      method: 'POST', url: serverUtils.getUrl('/update-image-set/' + encodeURIComponent(refFilepath)),
      form: {
        ref: 'data:image/png;base64,' + currentBase64
      },
      expectedStatusCode: 200
    });

    it('updated reference image with new contents', function () {
      var actualContents = fs.readFileSync(refFilepath);
      var expectedContents = fs.readFileSync(currentFilepath);
      expect(actualContents).to.deep.equal(expectedContents);
    });

    it('replies with imagesEqual info', function () {
      // DEV: We use a contract to guarantee consistency between browser/server tests
      // Set via: echo -n '{"imagesEqual":true}' > test/test-files/http-responses/update-image-set-filepath-equal.json
      var expectedResponse = fs.readFileSync(
        __dirname + '/../test-files/http-responses/update-image-set-filepath-equal.json', 'utf8');
      expect(this.body).to.deep.equal(expectedResponse);
    });
  });

  describe('for a non-existent filepath', function () {
    // Create our server and make our request
    serverUtils.run([]);
    httpUtils.save({
      method: 'POST', url: serverUtils.getUrl('/update-image-set/does-not-exist.png'),
      expectedStatusCode: 404
    });

    it('receives a 404', function () {
      // Assert provided by `expectedStatusCode`
    });
  });

  describe('for an unregistered existent filepath', function () {
    // Create our server and make our request
    // DEV: This covers scenarios like `/etc/passwd` but in a less egregious manner
    var existentFilepath = path.resolve(__dirname, '../test-files/dot.png');
    serverUtils.run([]);
    httpUtils.save({
      method: 'POST', url: serverUtils.getUrl('/update-image-set/' + encodeURIComponent(existentFilepath)),
      expectedStatusCode: 404
    });

    before(function verifyFileExists () {
      // DEV: `fs.statSync` will throw an error if not found
      expect(fs.statSync(existentFilepath)).to.not.equal(null);
    });

    it('receives a 404', function () {
      // Assert provided by `expectedStatusCode`
    });
  });
});
