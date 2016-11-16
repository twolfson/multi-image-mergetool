// Load in our dependencies
var $ = require('jquery');
var assert = require('assert');
var expect = require('chai').expect;
var sinon = require('sinon');
var applicationUtils = require('./utils/application');

// Start our tests
describe.only('A user accepting failing images is successful', function () {
  // Create our application, set up our XHR mocks, and click our button
  applicationUtils.init();
  before(function enableSinonXHR () {
    // http://sinonjs.org/docs/#fakeServer
    this.sinonXHR = sinon.useFakeXMLHttpRequest();
    var requests = this.requests = [];
    this.sinonXHR.autoRespondAfter = 100;
    this.sinonXHR.onCreate = function (request) {
      requests.push(request);
    };
  });
  after(function cleanup () {
    this.sinonXHR.restore();
    delete this.sinonXHR;
    delete this.requests;
  });
  before(function assertBadStatus () {
    var imageSetTitleEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"] .image-set__title');
    expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('false');
  });
  before(function clickAcceptButton (done) {
    // Click our acceptance button
    var buttonEl = this.containerEl.querySelector(
      '[data-image-set="mock-img-not-equal"] button[data-action=accept-changes]');
    assert(buttonEl);
    $(buttonEl).click();

    // Wait for XHR to complete
    setTimeout(done, 100);
  });

  it('updates image set status', function () {
    var imageSetTitleEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"] .image-set__title');
    expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('true');
  });

  it('sends XHR to update image to server', function () {

  });

  it('cachebusts diff and reference images', function () {
    // Sanity check we don't have loading class
    var diffImgEl = this.containerEl.querySelector(
      '[data-image-set="mock-img-not-equal"] img[data-compare-type=diff]');
    var refImgEl = this.containerEl.querySelector(
      '[data-image-set="mock-img-not-equal"] img[data-compare-type=ref]');
    expect([].slice.call(diffImgEl.classList)).to.not.contain('loading');
    expect([].slice.call(refImgEl.classList)).to.not.contain('loading');

    // Assert new URLs
    expect(diffImgEl.href).to.equal('wat');
    expect(refImgEl.href).to.equal('wat');
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
