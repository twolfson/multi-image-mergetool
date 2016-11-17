// Load in our dependencies
var expect = require('chai').expect;
var ImageSet = require('../../server/image-set');
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

// Start our tests
describe('An request to GET /', function () {
  // Create our server and make our request
  serverUtils.run(ImageSet.generateSets([
    'mock-image-1/current.png',
    'mock-image-2/current.png'
  ], [
    'mock-image-1/ref.png',
    'mock-image-2/ref.png'
  ], {
    diffImages: [
      'mock-image-1/diff.png',
      'mock-image-2/diff.png'
    ]
  }));
  httpUtils.save({
    method: 'GET', url: serverUtils.getUrl('/'),
    expectedStatusCode: 200
  });

  it('receives our image sets', function () {
    expect(this.body).to.contain(encodeURIComponent('mock-image-1/current.png'));
    expect(this.body).to.contain(encodeURIComponent('mock-image-1/ref.png'));
    expect(this.body).to.contain(encodeURIComponent('mock-image-1/diff.png'));
  });

  it('initializes our application', function () {
    expect(this.body).to.contain('new Application(');
  });
});
