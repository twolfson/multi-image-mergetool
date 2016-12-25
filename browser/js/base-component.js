// Load in our dependencies
var assert = require('assert');
var Model = require('backbone').Model;
var View = require('backbone').View;

// Define our base component
var BaseComponent = View.extend({
  constructor: function (options) {
    // Override `render` so it only runs once
    assert(this.render, 'Expected `render()` to be defined but it wasn\'t');
    this._render = this.render;
    this.render = this._renderOnce;
    this.renderedOnce = false;

    // Define state for our component
    this.state = new Model();

    // Call our default constructor
    View.prototype.constructor.apply(this, arguments);
  },
  _renderOnce: function () {
    // Verify render hasn't been called before
    // TODO: Move to assert for multiple renders
    // assert.strictEqual(this.renderedOnce, false, '`this.render()` has already been called. ' +
    //   'Please manage all dynamic state via `.onStateChange` events');
    if (this.renderedOnce !== false) {
      console.warn('`this.render()` has already been called. ' +
        'Please manage all dynamic state via `.onStateChange` events');
    }
    this.renderedOnce = true;

    // Run our render function
    this._render.apply(this, arguments);
  },
  setState: function () {
    // Call normal `set` actions for state
    this.state.set.apply(this.state, arguments);
  },
  onStateChange: function (key, fn) {
    // If there is no key, bind to all state changes
    // TODO: Add tests for not persisting unchanged values after multiple sets
    var that = this;
    if (typeof key === 'function') {
      fn = key;
      this.state.on('change', function handleEntireChange (state) {
        var previousState = state.previousAttributes();
        var newState = state.toJSON();
        fn.call(that, previousState, newState);
      });
    // Otherwise, bind to a specific value
    } else {
      this.state.on('change:' + key, function handlePropertyChange (state) {
        var previousProperty = state.previous(key);
        var newProperty = state.get(key);
        fn.call(that, previousProperty, newProperty);
      });
    }
  }
});

// Export our component
module.exports = BaseComponent;
