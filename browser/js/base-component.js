// Load in our dependencies
var assert = require('assert');
var View = require('backbone').View;

// Define our base component
var BaseComponent = View.extend({
  constructor: function (options) {
    // Override `render` so it only runs once
    assert(this.render, 'Expected `render()` to be defined but it wasn\'t');
    this._render = this.render;
    this.render = this._renderOnce;
    this.renderedOnce = false;

    // Call our default constructor
    View.prototype.constructor.apply(this, arguments);
  },
  _renderOnce: function () {
    // Verify render hasn't been called before
    // TODO: Move to assert for multiple renders
    // assert.strictEqual(this.renderedOnce, false, '`this.render()` has already been called. ' +
    //   'Please manage all dynamic state via `.onChange` events');
    if (this.renderedOnce !== false) {
      console.warn('`this.render()` has already been called. ' +
        'Please manage all dynamic state via `.onChange` events');
    }
    this.renderedOnce = true;

    // Run our render function
    this._render.apply(this, arguments);
  }
});

// Export our component
module.exports = BaseComponent;
