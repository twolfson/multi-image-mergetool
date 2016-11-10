// Load in our dependencies
var expect = require('chai').expect;
var Application = require('../../browser/js/overlay');

// Start our tests
describe('An application with images', function () {
  it('lists images by reference images', function () {

  });

  it('indicates matching/non-matching image sets', function () {

  });

  it('collapses matching image sets', function () {

  });

  it('collapses non-matching image sets', function () {

  });
});

// TODO: These are probably ImageSet tests directly
//   Test out acceptance behavior (hits endpoint, approval/error)
//   Test out select overlay area (either via events or mocking) and finding similar images
//      - No matches found
//      - Matches found
//   Test out overlay selection with different values, verify it's cleared out and not appended to
//   Test out accepting all images (hits endpoint, approval/error)
//      Verify each image set is listed
//      Add TODOs about cleaning results and collapsing section
//   Test out accepting some images (doesn't hit endpoint for all images)
//   Test out approving selection for all images (hits endpoint, approval/failure/error)
//   Test out approving selection for some images (doesn't hit endpoint for all images)
