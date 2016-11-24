// Load in our dependencies
var expect = require('chai').expect;
var D = require('../../browser/js/domo');
var Overlay = require('../../browser/js/overlay');

// Start our tests
describe.only('An overlay over an element', function () {
  it('is visible', function () {
    // Create our element and overlay
    var containerEl = D.DIV([
      D.DIV({style: 'width: 300px; height: 200px; color: navy'})
    ]);
    var el = containerEl.childNodes[0];
    var overlay = new Overlay(el, {containerEl: containerEl});

    // TODO: Set up unbinding
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
