// Load in our dependencies
var $ = require('jquery');
var assert = require('assert');
var expect = require('chai').expect;
var applicationUtils = require('./utils/application');

// Start our tests
describe('A user accepting failing images is successful', function () {
  // Create our application
  applicationUtils.init();

  it('updates image set status', function () {
  });

  it('cachebusts diff and reference images', function () {

  });
});

describe('A user accepting failing images has an error', function () {
  // Create our application
  applicationUtils.init();

  it('maintains image set status', function () {
  });

  it('cachebusts diff and reference images', function () {
    // TODO: Do we want to cache bust on error?
  });
});
