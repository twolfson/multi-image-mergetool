// Load in our dependencies
var assert = require('assert');
var url = require('url');
var _ = require('underscore');
var generateServer = require('../../../server/index.js');

// Define our exports
exports.config = {
  url: {
    internal: {
      protocol: 'http',
      hostname: '127.0.0.1',
      port: 2021
    }
  }
};

exports._runBefore = function (imageSets) {
  return function _runBeforeFn () {
    // Start a server with the image sets
    assert.strictEqual(this._server, undefined, 'A server is already running, ' +
      'please only use `serverUtils.run` once per test suite');
    var server = generateServer(imageSets);
    // https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback
    var urlConfig = exports.config.url.internal;
    this._server = server.listen(urlConfig.port, urlConfig.hostname);
  };
};
exports._runAfter = function () {
  return function _runAfterFn (done) {
    // Clean up the server
    // https://nodejs.org/api/http.html#http_server_close_callback
    this._server.close(done);
    delete this._server;
  };
};
exports.run = function (imageSets) {
  before(exports._runBefore(imageSets));
  after(exports._runAfter());
};

/**
 * Retrieve a URL for our running server
 * @param params {Object|String} Information for URL
 *   If this is a string, we will assume it's the URL path
 *   Otherwise (object), we will treat it as `url.format` parameters
 * @returns URL string (e.g. `http://localhost:9000/hello`)
 */
exports.getUrl = function (params) {
  // If the parameter is a string, upcast it to an object
  if (typeof params === 'string') {
    params = {pathname: params};
  }

  // Return our formatted URL
  return url.format(_.defaults(params, exports.config.url.internal));
};
