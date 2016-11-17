// Load in our dependencies
var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var ImageSet = require('../../server/image-set');
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

// Start our tests
describe('A request to POST /update-image-set/:filepath', function () {
  describe('for an existent filepath', function () {
    // Create a temporary file, start our server, and make our request
    before(function createTmpFile () {
      // Copy image to a temporary location
      this.tmpFilepath = '/tmp/multi-image-mergetool.png';
    });
    before(function runServer () {
      // Run a server with our temporary file
      serverUtils.run(ImageSet.generateSets([
        this.tmpFilepath
      ], [
        'mock-image-1/ref.png'
      ], {
        diffImages: ['mock-image-1/diff.png']
      }));
    });
    after(serverUtils._runAfter());
    before(function makeRequest (done) {
      httpUtils._save({
        method: 'GET', url: serverUtils.getUrl('/images/' + encodeURIComponent(existentFilepath)),
        encoding: null, // Load response as a buffer
        expectedStatusCode: 200
      }).call(this, done);
    });

    // it('receives our image', function () {
    //   var expectedContents = fs.readFileSync(existentFilepath);
    //   expect(this.body).to.deep.equal(expectedContents);
    // });
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
});
