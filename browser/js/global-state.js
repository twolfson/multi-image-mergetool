// Load in our dependencies
var assert = require('assert');

// Define our catch-all global state
module.exports = {
  // DEV: `_state` will be reset via `reset` below
  _state: undefined,
  reset: function () {
    this._state = {
      imageSetsById: []
    };
  },
  addImageSet: function (imageSet) {
    assert(imageSet.id);
    var imageSetsById = this._state.imageSetsById;
    assert.strictEqual(imageSetsById[imageSet.id], undefined);
    imageSetsById[imageSet.id] = imageSet;
  },
  getImageSetById: function (id) {
    return this._state.imageSetsById[id];
  },
  fetchImageSetById: function (id) {
    var imageSet = this.getImageSetById(id);
    assert(imageSet, 'Unable to find image set by id "' + id + '"');
    return imageSet;
  }
};

// Reset our state
module.exports.reset();
