// Load in our dependencies
var assert = require('assert');
var $ = require('jquery');
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
    this._sections = {};

    // Call our default constructor (invokes initialize)
    View.prototype.constructor.apply(this, arguments);
  },

  // Rendering
  _renderOnce: function () {
    // Verify render hasn't been called before
    assert.strictEqual(this.renderedOnce, false, '`this.render()` has already been called. ' +
      'Please manage all dynamic state via `.onStateChange` events');
    this.renderedOnce = true;

    // Run our render function
    this._render.apply(this, arguments);
  },
  saveEl: function (key, el) {
    this[key] = el;
    return el;
  },
  saveSection: function (key, fn) {
    // Verify we aren't double saving
    assert.strictEqual(this._sections[key], undefined,
      '`saveSection` was called by the same key "' + key + '" multiple times. ' +
      'It can only be generated once, please use `replaceSection` instead');

    // Save our section function and call an update on it
    this._sections[key] = {
      fn: fn,
      results: null
    };
    return this.replaceSection(key);
  },
  replaceSection: function (key) {
    // Verify we have our section
    var section = this._sections[key];
    assert(section, '`replaceSection` has no key "' + key + '". Please verify `saveSection` was called first');

    // Replace our results
    var results = section.fn.call(this);
    $(section.results).empty().append(results);
    section.results = results;

    // Return our results
    return results;
  },

  // State managment
  setState: function () {
    // Call normal `set` actions for state
    return this.state.set.apply(this.state, arguments);
  },
  getState: function () {
    // Call normal `get` actions for state
    return this.state.get.apply(this.state, arguments);
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
