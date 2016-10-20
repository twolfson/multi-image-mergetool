// Load in our dependencies
var assert = require('assert');

// Verify we have an ENV environment variable set
var env = process.env.ENV;
assert(env, '`ENV` environment variable wasn\'t set. Please set it to `normal` or `alt`');

// Define our resize helpers
// DEV: Despite using a very tall height, we only capture until the body stops
// DEV: These originally come from a `utils/gemini.js` file
var geminiUtils = {
  resizeLarge: function (actions, find) {
    actions.setWindowSize(1024, 1600);
  },
  resizeMedium: function (actions, find) {
    actions.setWindowSize(640, 1600);
  },
  resizeSmall: function (actions, find) {
    actions.setWindowSize(340, 1600);
  }
};

// Define our visual tests
gemini.suite('root', function (suite) {
  suite.setUrl('/?env=' + encodeURIComponent(env))
    .setCaptureElements('body')
    .capture('default-large', geminiUtils.resizeLarge)
    .capture('default-medium', geminiUtils.resizeMedium)
    .capture('default-small', geminiUtils.resizeSmall);
});
