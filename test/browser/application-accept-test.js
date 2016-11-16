// Load in our dependencies
var $ = require('jquery');
var assert = require('assert');
var expect = require('chai').expect;
var sinon = require('sinon');
var applicationUtils = require('./utils/application');

// Define test helper
// TODO: Use common fixture as response (so we can reuse it in server tests -- should do that first...)
function mockXHR(responses) {
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
}

// Start our tests
describe.only('A user accepting failing images is successful', function () {
  // Create our application, set up our XHR mocks, and click our button
  applicationUtils.init();
  mockXHR([{
    method: 'POST',
    url: /\/update-image-set\/[^\/]+/,
    statusCode: 200,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({imagesEqual: true})
  }]);
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
    var requests = this.sinonServer.requests;
    expect(requests).to.have.length(1);
    // DEV: We don't exclusively compare to the original mock data as they could both be null or similar
    expect(requests[0].requestBody).to.contain('ref=data');
    var currentImgEl = this.containerEl.querySelector(
      '[data-image-set="mock-img-not-equal"] img[data-compare-type=current]');
    var expectedBase64 = applicationUtils.getBase64Content(currentImgEl);
    console.log('1', requests[0].requestBody);
    console.log('2', expectedBase64);
    expect(requests[0].requestBody).to.equal('ref=' + encodeURIComponent(expectedBase64));
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
    // DEV: We don't exclusively compare to the original mock data as they could both be null or similar
    expect(diffImgEl.src).to.match(/\?1/);
    expect(refImgEl.src).to.match(/\?1/);
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
