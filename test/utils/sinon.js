// Load in our dependencies
// DEV: Please avoid any non-sinon dependencies as this is shared by browser/server
var sinon = require('sinon');

// Define our utilities
exports.mockXHR = function (responses) {
  before(function enableSinonXHR () {
    // Create our server
    // http://sinonjs.org/docs/#fakeServer
    var sinonServer = this.sinonServer = sinon.fakeServer.create();

    // Set up auto-responses
    this.sinonServer.autoRespond = true;
    this.sinonServer.autoRespondAfter = 100;

    // Bind our responses
    responses.forEach(function bindResponse (response) {
      sinonServer.respondWith(response.method, response.url, [
        response.statusCode, response.headers || {}, response.body
      ]);
    });
  });
  after(function cleanup () {
    this.sinonServer.restore();
    delete this.sinonServer;
  });
};

// http://sinonjs.org/docs/#stubs-api
exports.stub = function (obj, method, func) {
  before(function setupStub () {
    if (func) {
      func = func.bind(this);
    }
    sinon.stub.call(sinon, obj, method, func);
  });
  after(function cleanup () {
    obj[method].restore();
  });
};
