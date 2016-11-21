// Load in our dependencies
var assert = require('assert');
var $ = require('jquery');
var simulant = require('simulant');
var TWEEN = require('tween.js');

// Define our helpers
exports._findElement = function (selector) {
  assert(this.containerEl, 'Expected `this.containerEl` to be defined but it wasn\'t. ' +
    'Please use `applicationUtils.init()` before running `domUtils` actions');
  var el = this.containerEl.querySelector(selector);
  assert(el, 'Unable to find element by selector "' + selector + '" within `this.containerEl`. ' +
    'Please verify the selector is correct and the element is bound to `this.containerEl`');
  return el;
};

exports.click = function (selector) {
  before(function clickFn () {
    var buttonEl = exports._findElement.call(this, selector);
    $(buttonEl).click();
  });
};

// Based on https://raw.githubusercontent.com/twolfson/mockdesk/0.14.2/lib/js/scripts/drag-rectangle.js
exports._dragMouse = function (options, cb) {
  // Assert all our options
  var startCoords = options.startCoords;
  var targetEl = options.targetEl;
  assert(startCoords, '`domUtils._dragMouse` expected `options.startCoords` to be defined but it wasn\'t');
  assert(options.endCoords, '`domUtils._dragMouse` expected `options.endCoords` to be defined but it wasn\'t');
  assert(options.duration, '`domUtils._dragMouse` expected `options.duration` to be defined but it wasn\'t');
  assert(targetEl, '`domUtils._dragMouse` expected `options.targetEl` to be defined but it wasn\'t');
  assert(cb, '`domUtils._dragMouse` expected a callback function but there was none');

  // Immediately click our mouse down
  // https://developer.mozilla.org/en-US/docs/Web/API/Document/elementFromPoint
  // https://github.com/metafizzy/unipointer/blob/v2.1.0/unipointer.js#L94-L101
  simulant.fire(targetEl, 'mousedown', {button: 0, clientX: startCoords.x, clientY: startCoords.y});

  // Over the course of the next 2 seconds, drag it across to the workspace
  // https://github.com/metafizzy/unipointer/blob/v2.1.0/unipointer.js#L173-L175
  var tween = new TWEEN.Tween(startCoords)
    .to(options.endCoords, options.duration)
    .easing(TWEEN.Easing.Exponential.Out)
    .onUpdate(function handleUpdate () {
      simulant.fire(targetEl, 'mousemove', {clientX: this.x, clientY: this.y});
    });

  // When our drag completes, release our mouse
  tween.onComplete(function handleComplete () {
    simulant.fire(targetEl, 'mouseup', {clientX: this.x, clientY: this.y});
  });

  // Set up our animation bindings
  tween.start();
  function animate(time) {
    // Run our update
    var havePendingAnimations = TWEEN.update(time);

    // If we are still tweening, then continue
    if (havePendingAnimations) {
      requestAnimationFrame(animate);
    // Otherwise, callback
    } else {
      cb();
    }
  }
  requestAnimationFrame(animate);
};
exports.dragOverElement = function (options) {
  // Assert all our options
  var selector = options.selector;
  assert(options.startCoords, '`domUtils.dragOverElement` expected `options.startCoords` to be defined but it wasn\'t');
  assert(options.endCoords, '`domUtils.dragOverElement` expected `options.endCoords` to be defined but it wasn\'t');
  assert(selector, '`domUtils.dragOverElement` expected `options.selector` to be defined but it wasn\'t');

  before(function dragOverElement (done) {
    // Resolve our element
    var targetEl = exports._findElement.call(this, selector);

    // Call our drag action
    var targetElBounds = targetEl.getBoundingClientRect();
    exports._dragMouse({
      targetEl: targetEl,
      startCoords: {x: targetElBounds.left + options.startCoords.x, y: targetElBounds.top + options.startCoords.y},
      endCoords: {x: targetElBounds.left + options.endCoords.x, y: targetElBounds.top + options.endCoords.y},
      duration: options.duration || 100 // ms
    }, done);
  });
};
