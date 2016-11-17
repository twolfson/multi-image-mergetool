// Load in our dependencies
var fs = require('fs');
var expect = require('chai').expect;
var ImageSet = require('../../server/image-set');
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

// Start our tests
describe('A request to POST /update-image-set/:filepath', function () {
  describe('for an existent filepath', function () {
    // Run a server with our temporary file
    var srcFilepath = __dirname + '/../test-files/checkerboard.png';
    serverUtils.run(ImageSet.generateSets([
      'mock-image-1/current.png'
    ], [
      'mock-image-1/ref.png'
    ], {
      diffImages: ['mock-image-1/diff.png']
    }));
    before(function makeRequest (done) {
      var base64Contents = 'data:image/png,base64;' + fs.readFileSync(srcFilepath).toString('base64');
      httpUtils._save({
        method: 'POST', url: serverUtils.getUrl('/update-image-set/' + encodeURIComponent('mock-image-1/ref.png')),
        form: {
          ref: base64Contents
        },
        expectedStatusCode: 200
      }).call(this, done);
    });

    it('updated reference image with new contents', function () {
      expect(JSON.parse(this.body)).to.deep.equal({imagesEqual: 'mocked'});
    });

    it('replies with imagesEqual info', function () {
      expect(JSON.parse(this.body)).to.deep.equal({imagesEqual: 'mocked'});
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
