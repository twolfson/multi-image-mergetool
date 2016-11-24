// Load in our dependencies
var expect = require('chai').expect;
var D = require('../../browser/js/domo');
var Overlay = require('../../browser/js/overlay');
var domUtils = require('./utils/dom');

// Define our test helpers
var overlayUtils = {
  init: function () {
    // Set up our elements
    before(function createElement () {
      // Create our container element
      this.containerEl = D.DIV();
      document.body.appendChild(this.containerEl);
    });
    after(function cleanup () {
      document.body.removeChild(this.containerEl);
      delete this.containerEl;
    });
    before(function bindOverlay () {
      var el = D.DIV({
        id: 'overlay-container',
        style: 'width: 300px; height: 200px; color: navy'
      });
      this.containerEl.appendChild(el);
      this.overlay = new Overlay(el, {containerEl: this.containerEl});
    });
    after(function cleanup () {
      // TODO: Set up unbinding of overlay
      delete this.overlay;
    });
  }
};

// Start our tests
describe('An overlay over an element', function () {
  // Set up our elements
  overlayUtils.init();

  // Perform our assertions
  it('is not initially visible', function () {
    var overlayEl = this.containerEl.querySelector('.overlay');
    expect(overlayEl).to.equal(null);
  });

  describe('after dragging over our element', function () {
    // Perform overlay drag
    domUtils.dragOverElement({
      selector: '#overlay-container',
      startCoords: {x: 50, y: 60},
      endCoords: {x: 150, y: 170}
    });

    // Perform our assertions
    it('is visible', function () {
      var overlayEl = this.containerEl.querySelector('.overlay');
      expect(overlayEl).to.not.equal(null);
    });

    it('starts/stops where we expect', function () {
      var overlayEl = this.containerEl.querySelector('.overlay');
      var overlayBounds = overlayEl.getBoundingClientRect();
      expect(overlayBounds.left).to.equal(50);
      expect(overlayBounds.top).to.equal(60);
      expect(overlayBounds.width).to.equal(100);
      expect(overlayBounds.height).to.equal(110);
    });
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
