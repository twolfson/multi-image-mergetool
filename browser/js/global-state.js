// Load in our dependencies
var assert = require('assert');

// Define our catch-all global state
module.exports = {
  // DEV: `_state` will be reset via `reset` below
  _state: undefined,
  reset: function () {
    this._state = {
      imageSets: [],
      imageSetsById: {}
    };
  },
  addImageSet: function (imageSet) {
    assert(imageSet.id, 'Unable to find `id` property of `imageSet`. ' +
      'Please verify an `ImageSet` is being passed to `GlobalState.addImageSet`');
    var imageSetsById = this._state.imageSetsById;
    assert.strictEqual(imageSetsById[imageSet.id], undefined,
      'An image set with id "' + imageSet.id + '" is already registered');
    this._state.imageSets.push(imageSet);
    imageSetsById[imageSet.id] = imageSet;
  },
  getImageSets: function () {
    return this._state.imageSets;
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
