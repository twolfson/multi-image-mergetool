// Load in our dependencies
var fs = require('fs');
var $ = require('jquery');
var assert = require('assert');
var expect = require('chai').expect;
var applicationUtils = require('./utils/application');
var sinonUtils = require('../utils/sinon');
var updateImageSetFilepathEqualResponse = fs.readFileSync(
  __dirname + '/../test-files/http-responses/update-image-set-filepath-equal.json', 'utf8');

// Start our tests
describe('A user accepting failing images is successful', function () {
  // Create our application, set up our XHR mocks, and click our button
  applicationUtils.init();
  sinonUtils.mockXHR([{
    method: 'POST',
    url: /\/update-image-set\/[^\/]+/,
    statusCode: 200,
    headers: {'Content-Type': 'application/json'},
    body: updateImageSetFilepathEqualResponse // {imagesEqual: true}
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
    // Complete initial XHR assertion
    var requests = this.sinonServer.requests;
    expect(requests).to.have.length(1);
    expect(requests[0].url).to.equal('/update-image-set/mock-img-not-equal');
    // DEV: We don't exclusively compare to the original mock data as they could both be null or similar
    expect(requests[0].requestBody).to.contain('ref=data');

    // Continue deep assertions
    var currentImgEl = this.containerEl.querySelector(
      '[data-image-set="mock-img-not-equal"] img[data-compare-type=current]');
    var expectedBase64 = applicationUtils.getBase64Content(currentImgEl);
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
  // Create our application, silence errors, set up our XHR mocks, and click our button
  applicationUtils.init();
  sinonUtils.stub(console, 'error');
  sinonUtils.mockXHR([{
    method: 'POST',
    url: /\/update-image-set\/[^\/]+/,
    statusCode: 500,
    body: 'Internal server error'
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

  it('maintains image set status', function () {
    var imageSetTitleEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"] .image-set__title');
    expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('false');
  });

  it('sends XHR to update image to server', function () {
    // DEV: Other tests asserts XHR thoroughly, this is more of a sanity check
    var requests = this.sinonServer.requests;
    expect(requests).to.have.length(1);
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
