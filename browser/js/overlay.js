// Load in our dependencies
var Unidragger = require('unidragger');

// Define our overlay class
function Overlay(targetEl, options) {
  // Bind our overlay to the element
  this.targetEl = targetEl;
  this.handles = [targetEl];
  this.bindHandles();

  // Resolve our container
  this.containerEl = options.containerEl || document.body;

  // Add an overlay binding class to our element
  targetEl.className += ' overlay-bound';
}
// Inherit prototype from Unidragger
Overlay.prototype = Object.create(Unidragger.prototype);
Overlay.prototype.dragStart = function (evt, pointer) {
  // If we don't have an overlay element, create one now
  if (!this.overlayEl) {
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'overlay';
    this.containerEl.appendChild(this.overlayEl);
  }

  // Calculate target dimensions
  // TODO: For wider browser support, see what `draggabilly` does (prob uses `get-size`)
  // bounds = {x, y, width, height, top, right, bottom, left}
  // http://youmightnotneedjquery.com/#offset
  // DEV: This is our poor man's `_.extend`
  // DEV: We resolve target dimensions on drag start to prevent boundary issues
  //   (e.g. element was initially hidden/collapsed)
  var _bounds = this.targetEl.getBoundingClientRect();
  var bounds = this.bounds = {};
  ['x', 'y', 'width', 'height', 'top', 'right', 'bottom', 'left'].forEach(function copyKey (key) {
    bounds[key] = _bounds[key];
  });
  this.bounds.top += document.documentElement.scrollTop + document.body.scrollTop;
  this.bounds.left += document.documentElement.scrollLeft + document.body.scrollLeft;

  // Update our box position
  this.update(evt, pointer, {x: 0, y: 0});
};
Overlay.prototype.update = function (evt, pointer, moveVector) {
  // If the move vector's X dimension is normal
  // DEV: We use `pointerDownPoint` instead of `dragStartPoint` for better cursor positioning
  var left, top, width, height;
  if (moveVector.x >= 0) {
    left = this.pointerDownPoint.x;
    width = moveVector.x;
  // Otherwise (inverted), use opposite parameters)
  } else {
    // DEV: Technically we are subtracting moveVector as it's a negative value
    left = this.pointerDownPoint.x + moveVector.x;
    width = (-1 * moveVector.x);
  }

  // Similar behavior for Y dimension
  if (moveVector.y >= 0) {
    top = this.pointerDownPoint.y;
    height = moveVector.y;
  } else {
    top = this.pointerDownPoint.y + moveVector.y;
    height = (-1 * moveVector.y);
  }

  // Restrict our dimensions so we don't go out of bounds
  // DEV: We limit top/left first as height/width offsets are dependent
  if (top < this.bounds.top) {
    // Remove excess distance from height to account for overflow
    // height += 100 - 200 /* higher on page - lower on page */;
    height += top - this.bounds.top;
    top = this.bounds.top;
  }
  if (left < this.bounds.left) {
    width += left - this.bounds.left;
    left = this.bounds.left;
  }
  // bottomEdgeFromTop = 100 + 800 /* 900 */
  var bottomEdgeFromTop = this.bounds.top + this.bounds.height;
  if (top + height > bottomEdgeFromTop) {
    // height = 900 - 300 /* 600 */
    height = bottomEdgeFromTop - top;
  }
  var rightEdgeFromLeft = this.bounds.left + this.bounds.width;
  if (left + width > rightEdgeFromLeft) {
    width = rightEdgeFromLeft - left;
  }

  // Update our element position
  this.overlayEl.style.left = left + 'px';
  this.overlayEl.style.width = width + 'px';
  this.overlayEl.style.top = top + 'px';
  this.overlayEl.style.height = height + 'px';

  // Emit an update event
  // TODO: Make sure we erase overlayInfo on unbind
  this.overlayInfo = {
    absolute: {
      left: left,
      width: width,
      top: top,
      height: height
    },
    relative: {
      left: left - this.bounds.left,
      width: width,
      top: top - this.bounds.top,
      height: height
    }
  };
  this.emitEvent('change:overlay', [evt, pointer, this.overlayInfo]);
};
Overlay.prototype.dragMove = function (evt, pointer, moveVector) {
  this.update(evt, pointer, moveVector);
};

// Export our overlay
module.exports = Overlay;
