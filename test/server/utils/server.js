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

exports.run = function (imageSets) {
  var _server = null;
  before(function createServer () {
    assert.strictEqual(_server, null, 'A server is already running, ' +
      'please only use `serverUtils.run` once per test suite');
    var server = generateServer(imageSets);
    // https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback
    var urlConfig = exports.config.url.internal;
    _server = server.listen(urlConfig.port, urlConfig.hostname);
  });
  after(function cleanup (done) {
    // https://nodejs.org/api/http.html#http_server_close_callback
    _server.close(done);
    _server = null;
  });
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
