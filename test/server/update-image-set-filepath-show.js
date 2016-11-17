// Load in our dependencies
var fs = require('fs');
var expect = require('chai').expect;
var ImageSet = require('../../server/image-set');
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');
var sinonUtils = require('../utils/sinon');

// Start our tests
describe('A request to POST /update-image-set/:filepath', function () {
  describe('for an existent filepath', function () {
    // Run a server, stub out updating files, and make our request
    var srcFilepath = __dirname + '/../test-files/checkerboard.png';
    serverUtils.run(ImageSet.generateSets([
      'mock-image-1/current.png'
    ], [
      'mock-image-1/ref.png'
    ], {
      diffImages: ['mock-image-1/diff.png']
    }));
    sinonUtils.stub(ImageSet.prototype, 'updateRef', function updateRefStub (refBuff, cb)  {
      // Call our callback in a second (prevent zalgo) with mocked result
      process.nextTick(function handleNextTick () {
        cb(null, 'mocked');
      });
    });
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
      var updateRefStub = ImageSet.prototype.updateRef;
      expect(updateRefStub.callCount).to.equal(1);
      var expectedContents = fs.readFileSync(srcFilepath);
      // expect(updateRefStub.args[0][0]).to.deep.equal(expectedContents);
      console.log(updateRefStub.args[0][0]);
      console.log(expectedContents);
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
