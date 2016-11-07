// Load in our dependencies
var assert = require('assert');
var Overlay = require('../lib/js/overlay');

// Start our tests
describe.skip('An overlay over an image', function () {
  it('is visible', function () {
    // Test visibility, maybe with a screenshot
  });
});

describe.skip('An overlay that attempts to extend past top boundary', function () {
  it('is stopped at top boundary', function () {
    // Test bounds
  });
});

describe.skip('An overlay that attempts to extend past left boundary', function () {
  it('is stopped at left boundary', function () {
    // Test bounds
  });
});
describe.skip('An overlay that attempts to extend past right boundary', function () {
  it('is stopped at right boundary', function () {
    // Test bounds
  });
});

describe.skip('An overlay that attempts to extend past bottom boundary', function () {
  it('is stopped at bottom boundary', function () {
    // Test bounds
  });
});

describe.skip('An overlay on a scrolled page', function () {
  it('keeps boundaries relative to element', function () {
    // Test bounds (e.g. we can go to edge in scrolled direction)
  });
});