// Load in our dependencies
var assert = require('assert');

// Verify we have an ENV environment variable set
var env = process.env.ENV;
assert(env, '`ENV` environment variable wasn\'t set. Please set it to `normal` or `alt`');

// Define our resize helpers
// DEV: These originally come from a `utils/gemini.js` file
// DEV: When using Firefox, we can set window size to a high value (e.g. 1600) and it auto-truncates
var geminiUtils = {
  resizeLarge: function (actions, find) {
    actions.setWindowSize(1024, 600);
  },
  resizeMedium: function (actions, find) {
    actions.setWindowSize(640, 600);
  },
  resizeSmall: function (actions, find) {
    actions.setWindowSize(340, 600);
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
