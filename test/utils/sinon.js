// Load in our dependencies
// DEV: Please avoid any non-sinon dependencies as this is shared by browser/server
var _ = require('underscore');
var sinon = require('sinon');

// Define our utilities
exports.getMockXHRResponse = function (response) {
  return [
    response.statusCode, response.headers || {}, response.body
  ];
};
exports.mockXHR = function (responses, options) {
  before(function callMockXHR () {
    // Create our server
    // http://sinonjs.org/docs/#fakeServer
    var sinonServer = this.sinonServer = sinon.fakeServer.create();

    // Set up auto-responses
    if (options && options.autoRespond !== false) {
      this.sinonServer.autoRespond = true;
      this.sinonServer.autoRespondAfter = 100;
    }

    // Bind our responses
    responses.forEach(function bindResponse (response) {
      sinonServer.respondWith(response.method, response.url,
        response.fn || exports.getMockXHRResponse(response));
    });
  });
  after(function cleanup () {
    this.sinonServer.restore();
    delete this.sinonServer;
  });
};

// http://sinonjs.org/docs/#sinonspy
function bindFunc(func) {
  if (func) {
    if (typeof func === 'function') {
      return func.bind(this);
    } else if (typeof func === 'object') {
      var obj = _.clone(func);
      if (obj.get) { obj.get = obj.get.bind(this); }
      if (obj.set) { obj.set = obj.set.bind(this); }
      return obj;
    }
  }
}
exports.contextFreeSpy = function (obj, method, func) {
  var spy;
  before(function setupSpy () {
    spy = sinon.spy(obj, method, func);
  });
  after(function cleanup () {
    spy.restore();
  });
};
exports.spy = function (obj, method, func) {
  var boundFunc = bindFunc.call(this, func);
  exports.contextFreeSpy(obj, method, boundFunc);
};

// http://sinonjs.org/docs/#stubs-api
exports.contextFreeStub = function (obj, method, func) {
  var stub;
  before(function setupStub () {
    stub = sinon.stub(obj, method, func);
  });
  after(function cleanup () {
    stub.restore();
  });
};
exports.stub = function (obj, method, func) {
  var boundFunc = bindFunc.call(this, func);
  exports.contextFreeStub(obj, method, boundFunc);
};
