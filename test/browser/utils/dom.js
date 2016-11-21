// Load in our dependencies
// Based on https://raw.githubusercontent.com/twolfson/mockdesk/0.14.2/lib/js/scripts/drag-rectangle.js
var assert = require('assert');
var simulant = require('simulant');
var TWEEN = require('tween.js');

// Define our mouse move helper
exports.dragMouse = function (options, cb) {
  // Assert all our options
  var startCoords = options.startCoords;
  var targetEl = options.targetEl;
  assert(startCoords, '`mouseUtils.mousemove` expected `options.startCoords` to be defined but it wasn\'t');
  assert(options.endCoords, '`mouseUtils.mousemove` expected `options.endCoords` to be defined but it wasn\'t');
  assert(options.duration, '`mouseUtils.mousemove` expected `options.duration` to be defined but it wasn\'t');
  assert(targetEl, '`mouseUtils.mousemove` expected `options.targetEl` to be defined but it wasn\'t');
  assert(cb, '`mouseUtils.mousemove` expected a callback function but there was none');

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
