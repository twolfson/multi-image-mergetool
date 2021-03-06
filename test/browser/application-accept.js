// Load in our dependencies
var expect = require('chai').expect;
var applicationUtils = require('./utils/application');
var domUtils = require('./utils/dom');
var sinonUtils = require('../utils/sinon');
var xhrResponses = require('../test-files/http-responses/xhr');

// Start our tests
describe('A user accepting failing images is successful', function () {
  // Create our application, set up our XHR mocks, and click our button
  applicationUtils.init();
  sinonUtils.mockXHR([xhrResponses.UPDATE_IMAGE_SET_APPROVE]);
  before(function assertBadStatus () {
    var imageSetTitleEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"] .image-set__title');
    expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('false');
  });
  domUtils.click('[data-image-set="mock-img-not-equal"] ' +
    'button[data-action=accept-changes]');
  before(function waitForXHRToComplete (done) {
    setTimeout(done, 100);
  });
  applicationUtils.screenshot('accept');

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

describe('A user accepting new images is successful', function () {
  // Create our application, set up our XHR mocks, and click our button
  applicationUtils.init(applicationUtils.IMAGE_SETS.MULTIPLE_WITH_NEW);
  sinonUtils.mockXHR([xhrResponses.UPDATE_IMAGE_SET_APPROVE]);
  before(function assertBadStatus () {
    var imageSetTitleEl = this.containerEl.querySelector('[data-image-set="mock-img-new"] .image-set__title');
    expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('false');
  });
  domUtils.click('[data-image-set="mock-img-new"] ' +
    'button[data-action=accept-changes]');
  before(function waitForXHRToComplete (done) {
    setTimeout(done, 100);
  });
  applicationUtils.screenshot('accept-new');

  it('updates image set status', function () {
    var imageSetTitleEl = this.containerEl.querySelector('[data-image-set="mock-img-new"] .image-set__title');
    expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('true');
  });

  it('sends XHR to update image to server', function () {
    var requests = this.sinonServer.requests;
    expect(requests).to.have.length(1);
  });

  it('adds diff and reference images', function () {
    var diffImgEl = this.containerEl.querySelector(
      '[data-image-set="mock-img-new"] img[data-compare-type=diff]');
    var refImgEl = this.containerEl.querySelector(
      '[data-image-set="mock-img-new"] img[data-compare-type=ref]');
    expect(diffImgEl).to.not.equal(null);
    expect(refImgEl).to.not.equal(null);
  });
});

describe('A user accepting failing images has an error', function () {
  // Create our application, silence errors, set up our XHR mocks, and click our button
  applicationUtils.init();
  sinonUtils.stub(console, 'error');
  sinonUtils.mockXHR([xhrResponses.UPDATE_IMAGE_SET_ERROR]);
  before(function assertBadStatus () {
    var imageSetTitleEl = this.containerEl.querySelector('[data-image-set="mock-img-not-equal"] .image-set__title');
    expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('false');
  });
  domUtils.click('[data-image-set="mock-img-not-equal"] ' +
    'button[data-action=accept-changes]');
  before(function waitForXHRToComplete (done) {
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

// Demo tests
describe('On a demo page', function () {
  describe('a user accepting failing images', function () {
    // Create our application, set up our demo, and click our button
    applicationUtils.init();
    applicationUtils.runDemo();
    domUtils.click('[data-image-set="mock-img-not-equal"] ' +
      'button[data-action=accept-changes]');
    // DEV: We test exclusively via screenshots to avoid double maintenance for implementation details
    before(function waitForXHRToComplete (done) {
      setTimeout(done, 100);
    });
    applicationUtils.screenshot('demo-accept');

    it('has no errors', function () {
      // Verified by utilities
    });
  });

  describe('a user accepting new images', function () {
    // Create our application, set up our demo, and click our button
    applicationUtils.init(applicationUtils.IMAGE_SETS.MULTIPLE_WITH_NEW);
    applicationUtils.runDemo();
    before(function assertBadStatus () {
      var imageSetTitleEl = this.containerEl.querySelector('[data-image-set="mock-img-new"] .image-set__title');
      expect(imageSetTitleEl.getAttribute('data-images-equal')).to.equal('false');
    });
    domUtils.click('[data-image-set="mock-img-new"] ' +
      'button[data-action=accept-changes]');
    before(function waitForXHRToComplete (done) {
      setTimeout(done, 100);
    });
    applicationUtils.screenshot('demo-accept-new');

    it('has no errors', function () {
      // Verified by utilities
    });
  });
});
