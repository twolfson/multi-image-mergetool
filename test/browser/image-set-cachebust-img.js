// Load in our dependencies
var expect = require('chai').expect;
var ImageSet = require('../../browser/js/image-set');

// Start our tests
describe('An image being cachebusted for the first time', function () {
  it('is updated with a cachebusted url', function () {
    // Set up our image
    var imgEl = new Image();
    imgEl.src = 'data:image/png;base64,image-url';

    // Cache bust our image
    ImageSet.cachebustImg(imgEl);

    // Assert our image was updated
    expect(imgEl.src).to.equal('data:image/png;base64,image-url?1');
  });
});

describe('An image being cachebusted for a second time', function () {
  it('is updated with another cachebusted url', function () {
    // Set up our image
    var imgEl = new Image();
    imgEl.src = 'data:image/png;base64,image-url?1';

    // Cache bust our image
    ImageSet.cachebustImg(imgEl);

    // Assert our image was updated
    expect(imgEl.src).to.equal('data:image/png;base64,image-url?11');

  });
});
