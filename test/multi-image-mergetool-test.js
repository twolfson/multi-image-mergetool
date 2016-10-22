// Load in dependencies
var assert = require('assert');
var multiImageMergetool = require('../');

// Start our tests
describe('multi-image-mergetool', function () {
  it('returns awesome', function () {
    assert.strictEqual(multiImageMergetool(), 'awesome');
  });
});
