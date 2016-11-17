// Taken from https://gist.github.com/twolfson/3af2ed0a016f877d676d
// Even more options available here:
//   https://github.com/twolfson/multi-image-mergetool/blob/180343e7d595b295c4138fbb763a38d990833600/test/server/utils/http.js
// Load in our dependencies
var assert = require('assert');
var request = require('request');

// Copy over utilities from request-mocha
// https://github.com/uber-archive/request-mocha/blob/0.2.0/lib/request-mocha.js
// DEV: We use copy/paste as it's easier to integrate Cheerio parsing
exports._save = function (options) {
  return function _saveFn (done) {
    var that = this;
    request(options, function handleRequest (err, res, body) {
      // Save our results to `this` context
      that.err = err;
      that.res = res;
      that.body = body;

      // Verify status code is as expected (default of 200)
      // DEV: `expectedStatusCode` can be opted out via `null`
      var expectedStatusCode = options.expectedStatusCode !== undefined ? options.expectedStatusCode : 200;
      if (expectedStatusCode) {
        assert.strictEqual(err, null);
        if (res.statusCode !== expectedStatusCode) {
          var assertionMsg = 'Expected status code "' + expectedStatusCode + '" ' +
            'but received "' + res.statusCode + '" and body "' + body + '"';
          assert.strictEqual(res.statusCode, expectedStatusCode, assertionMsg);
        }
      }

      // Callback
      done();
    });
  };
};
exports._saveCleanup = function () {
  return function _saveCleanupFn () {
    delete this.err;
    delete this.res;
    delete this.body;
  };
};
exports.save = function (options) {
  before(exports._save(options));
  after(exports._saveCleanup(options));
};
