// Load in our dependencies
var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var ImageSet = require('../../server/image-set');
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

// Start our tests
describe('A request to GET /images/:filepath', function () {
  describe('for an existent absolute filepath', function () {
    // Create our server and make our request
    var existentFilepath = path.resolve(__dirname, '../test-files/dot.png');
    serverUtils.run(ImageSet.generateSets([
      existentFilepath
    ], [
      'mock-image-1/ref.png'
    ], {
      diffImages: ['mock-image-1/diff.png']
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

  describe('for an existent relative filepath', function () {
    // Create our server and make our request
    // DEV: Filepath is relative from root folder so be sure to run from there
    var existentFilepath = 'test/test-files/dot.png';
    serverUtils.run(ImageSet.generateSets([
      existentFilepath
    ], [
      'mock-image-1/ref.png'
    ], {
      diffImages: ['mock-image-1/diff.png']
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

  describe('for a non-existent filepath', function () {
    // Create our server and make our request
    serverUtils.run([]);
    httpUtils.save({
      method: 'GET', url: serverUtils.getUrl('/images/does-not-exist.png'),
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
      method: 'GET', url: serverUtils.getUrl('/images/' + encodeURIComponent(existentFilepath)),
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
