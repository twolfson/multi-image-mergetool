// Load in our dependencies
var $ = require('jquery');
var expect = require('chai').expect;
var applicationUtils = require('./utils/application');
var mouseUtils = require('./utils/mouse');

// Start our tests
describe('An application with similarly failing images', function () {
  // Create our application
  applicationUtils.init(applicationUtils.IMAGE_SETS.MULTIPLE_NOT_EQUAL);

  describe('when finding similarly failing images', function () {
    it('lists similarly failing images in results', function () {

    });
  });
});

describe('An application with no similarly failing images', function () {
  // Create our application
  applicationUtils.init(applicationUtils.IMAGE_SETS.DEFAULT);

  describe('when finding similarly failing images', function () {
    it('lists no similarly failing images in results', function () {

    });
  });
});
