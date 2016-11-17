// Load in our dependencies
var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var ImageSet = require('../../server/image-set');
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

// Start our tests
describe('An request to GET /images/:filepath', function () {
  describe('for an existent absolute filepath', function () {
    // Create our server and make our request
    var existentFilepath = path.resolve(__dirname, '../test-files/dot.png');
    serverUtils.run(ImageSet.generateSets([
      existentFilepath
    ], [
      existentFilepath
    ], {
      diffImages: [existentFilepath]
    }));
    httpUtils.save({
      method: 'GET', url: serverUtils.getUrl('/images/' + encodeURIComponent(existentFilepath)),
      encoding: null, // Load response as a buffer
      expectedStatusCode: 200
    });

    it('receives our image', function () {
      var expectedContents = fs.readFileSync(existentFilepath);
      expect(this.body).to.deep.equal(expectedContents);
    });
  });

  describe.skip('for an existent relative filepath', function () {

  });

  describe.skip('for a non-existent filepath', function () {

  });
});
