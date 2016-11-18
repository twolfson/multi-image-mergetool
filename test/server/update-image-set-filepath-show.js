// Load in our dependencies
var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var tmp = require('tmp');
var ImageSet = require('../../server/image-set');
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

// Start our tests
describe('A request to POST /update-image-set/:filepath', function () {
  describe('for an existent filepath', function () {
    // Create a temporary ref file to update
    // DEV: We could use mocking for updating the file but this removes one more contract to maintain
    var currentFilepath = __dirname + '/../test-files/dot.png';
    var originalRefFilepath = __dirname + '/../test-files/checkerboard.png';
    before(function createTmpFile () {
      // Copy image to a temporary location
      // https://github.com/raszi/node-tmp/tree/v0.0.30#synchronous-file-creation
      this.tmpFile = tmp.fileSync();
      this.refFilepath = this.tmpFile.name;
      fs.writeFileSync(this.refFilepath, fs.readFileSync(originalRefFilepath));
    });
    after(function cleanupTmpFile () {
      this.tmpFile.removeCallback();
      delete this.tmpFile;
      delete this.refFilepath;
    });

    // Run a server
    before(function runServer () {
      // Run a server with our temporary file
      serverUtils._runBefore(ImageSet.generateSets([
        currentFilepath
      ], [
        this.refFilepath
      ], {
        diffImages: ['/dev/null']
      })).call(this);
    });
    after(serverUtils._runAfter());

    // Make our request
    before(function makeRequest (done) {
      var currentBase64Contents = 'data:image/png;base64,' + fs.readFileSync(currentFilepath).toString('base64');
      httpUtils._save({
        method: 'POST', url: serverUtils.getUrl('/update-image-set/' + encodeURIComponent(this.refFilepath)),
        form: {
          ref: currentBase64Contents
        },
        expectedStatusCode: 200
      }).call(this, done);
    });

    it('updated reference image with new contents', function () {
      var actualContents = fs.readFileSync(this.refFilepath);
      var expectedContents = fs.readFileSync(currentFilepath);
      expect(actualContents).to.deep.equal(expectedContents);
    });

    it('replies with imagesEqual info', function () {
      // DEV: We use a contract to guarantee consistency between browser/server tests
      // Set via: echo -n '{"imagesEqual":true}' > test/test-files/http-responses/update-image-set-filepath.json
      var expectedResponse = fs.readFileSync(
        __dirname + '/../test-files/http-responses/update-image-set-filepath.json', 'utf8');
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

  describe('for an existent yet unregistered filepath', function () {
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
