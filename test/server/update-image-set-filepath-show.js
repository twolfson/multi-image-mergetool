// Load in our dependencies
var fs = require('fs');
var tmp = require('tmp');
var expect = require('chai').expect;
var ImageSet = require('../../server/image-set');
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

// Start our tests
describe('A request to POST /update-image-set/:filepath', function () {
  describe('for an existent filepath', function () {
    // Create a temporary file, start our server, and make our request
    var srcFile = __dirname + '/../test-files/dot.png';
    before(function createTmpFile () {
      // Copy image to a temporary location
      // https://github.com/raszi/node-tmp/tree/v0.0.30#synchronous-file-creation
      this.tmpFile = tmp.fileSync();
      this.tmpFilepath = this.tmpFile.name;
      fs.writeFileSync(this.tmpFile, fs.readFileSync(srcFile));
    });
    after(function cleanupTmpFile () {
      this.tmpFile.removeCallback();
      delete this.tmpFile;
      delete this.tmpFilepath;
    });
    before(function runServer () {
      // Run a server with our temporary file
      serverUtils.run(ImageSet.generateSets([
        this.tmpFilepath
      ], [
        this.tmpFilepath
      ], {
        diffImages: ['mock-image-1/diff.png']
      }));
    });
    after(serverUtils._runAfter());
    before(function makeRequest (done) {
      httpUtils._save({
        method: 'POST', url: serverUtils.getUrl('/update-image-set/' + encodeURIComponent(this.tmpFilepath)),
        form: {
          ref: fs.readFileSync(updatedFile)
        },
        expectedStatusCode: 200
      }).call(this, done);
    });

    it('receives our image', function () {
      var expectedContents = fs.readFileSync(existentFilepath);
      expect(this.body).to.deep.equal(expectedContents);
    });
  });

  describe.skip('for a non-existent filepath', function () {
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
