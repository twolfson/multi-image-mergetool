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
exports.mockXHR = function (responses) {
  before(function callMockXHR () {
    // Create our server
    // http://sinonjs.org/docs/#fakeServer
    var sinonServer = this.sinonServer = sinon.fakeServer.create();

    // Set up auto-responses
    this.sinonServer.respondImmediately = true;

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
exports._spy = function (bindFunction) {
  return function _spyFn (obj, method, func) {
    var spy;
    before(function setupSpy () {
      if (bindFunction) { func = bindFunc.call(this, func); }
      spy = sinon.spy(obj, method, func);
    });
    after(function cleanup () {
      spy.restore();
    });
  };
};
exports.contextFreeSpy = exports._spy(false);
exports.spy = exports._spy(true);

// http://sinonjs.org/docs/#stubs-api
exports._stub = function (bindFunction) {
  return function _stubFn (obj, method, func) {
    var stub;
    before(function setupStub () {
      if (bindFunction) { func = bindFunc.call(this, func); }
      stub = sinon.stub(obj, method, func);
    });
    after(function cleanup () {
      stub.restore();
    });
  };
};
exports.contextFreeStub = exports._stub(false);
exports.stub = exports._stub(true);
