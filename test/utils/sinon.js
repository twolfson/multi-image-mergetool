// Load in our dependencies
var sinon = require('sinon');

// Define common mocha utilities for Sinon
exports.stub = function (obj, method/*, func*/) {
  var args = [].slice.call(arguments);
  before(function setupStub () {
    sinon.stub.apply(sinon, args);
  });
  after(function cleanup () {
    obj[method].restore();
  });
};
