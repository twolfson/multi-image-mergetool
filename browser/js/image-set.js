// Load in our dependencies
var assert = require('assert');
var $ = window.$ = window.jQuery = require('jquery');
var h = require('hyperscript-helpers')(require('hyperscript'));
var classnames = require('classnames');
var GlobalState = require('./global-state');
var Overlay = require('./overlay');
var SimilarImageResults = require('./similar-image-results');
var utils = require('./utils');

// Define our constants
var RESULTS_NONE = 'results_none';
var RESULTS_VISIBLE = 'results_visible';

// Define our constructor
function ImageSet(_containerEl, imageSetInfo) {
  // Save parameters for later
  this._containerEl = _containerEl;
  this.imageSetInfo = imageSetInfo;

  // Create one-off quick-reference variables
  this.id = imageSetInfo.id;
  this.humanName = imageSetInfo.id;

  // Save our state
  this.state = {
    imagesEqual: imageSetInfo.imagesEqual,
    resultsState: RESULTS_NONE
  };

  // Run our render method
  // TODO: Add destroy method so we can unreference container element
  this.render();

  // Register our image set to the global state
  GlobalState.addImageSet(this);
}

// Define class level helpers
ImageSet.bindOnce = function () {
  // Set up image acceptance binding
  $('body').on('click', 'button[data-action="accept-changes"]', function handleClick (evt) {
    // Resolve our image set
    var imageSet = ImageSet.fetchByEvent(evt);

    // Extract and accept base64 content for image
    var base64Data = utils.getBase64Content(imageSet.currentImg);
    imageSet.acceptChanges(base64Data);
  });

  $('body').on('click', 'button[data-action="find-similar-images"]', function handleClick (evt) {
    // Find our image set's similar images
    var imageSet = ImageSet.fetchByEvent(evt);
    imageSet.findSimilarImages();
  });
};
ImageSet.cachebustImg = function (imgEl) {
  var originalSrc = imgEl.getAttribute('src');
  var newSrc = originalSrc.match(/\?1$/) ? originalSrc + '1' : originalSrc + '?1';
  imgEl.setAttribute('src', newSrc);
};
ImageSet.fetchByEvent = function (evt) {
  // Resolve our id
  var targetEl = evt.target;
  var $imageSet = $(targetEl).closest('[data-image-set]');
  var imageSetId = $imageSet.data('image-set');

  // Return our image set
  return GlobalState.fetchImageSetById(imageSetId);
};

// Define prototype methods
ImageSet.prototype = {
  render: function () {
    // If we don't have an image set element, create/append one
    if (!this.imageSetEl) {
      // Create local variables for our image set
      var imageSetId = this.id;
      var imageSetHumanName = this.humanName;
      var imageSetEl = this.imageSetEl = h.ul({'data-image-set': imageSetId}, [
        h.li([
          // Row title
          // TODO: Move from link to button styled as link so we can ditch `href`
          this.saveEl('titleEl', h.a({
            className: 'image-set__title',
            href: 'javascript:void 0;', 'data-toggle': 'collapse',
            'data-target': '[data-image-set="' + imageSetId + '"] .image-set__collapse',
            'data-images-equal': this.state.imagesEqual,
            'aria-controls': imageSetId
          }, imageSetHumanName)),

          // Collapsable container for row
          // DEV: We use `data-id` as `id` has restrictions on characters
          this.saveEl('contentsEl', h.div({
            // Make our first image set visible
            className: classnames('image-set__collapse', 'collapse', 'well', {in: !this.state.imagesEqual})
          }, [
            // Action buttons
            h.div([
              h.button({
                className: 'btn btn-default',
                'data-action': 'accept-changes'
              }, '✓ Accept changes'),
              ' ',
              h.button({
                className: 'btn btn-default',
                'data-action': 'find-similar-images'
                // TODO: Make our button disabled and only enable when an overlay is drawn
                // TODO: When changes are accepted, reset all affected overlays and buttons
                // disabled: 'disabled'
              }, 'Find similar images with selection')
            ]),

            // Image set
            h.table({className: 'table'}, [
              h.thead([
                h.tr([
                  h.th(null, 'Current:'),
                  h.th(null, 'Diff:'),
                  h.th(null, 'Ref:')
                ])
              ]),
              h.tbody([
                h.tr([
                  // DEV: We use `width: 33%` to guarantee no widths change when images are loading
                  h.td({style: 'width: 33%'}, [
                    this.saveEl('currentImg', h.img({
                      'data-compare-type': 'current',
                      src: this.imageSetInfo.currentImageUrl,
                      style: 'max-width: 100%'
                    }))
                  ]),
                  h.td({style: 'width: 33%'}, [
                    this.saveEl('diffImg', h.img({
                      'data-compare-type': 'diff',
                      src: this.imageSetInfo.diffImageUrl,
                      style: 'max-width: 100%'
                    }))
                  ]),
                  h.td({style: 'width: 33%'}, [
                    this.saveEl('refImg', h.img({
                      'data-compare-type': 'ref',
                      src: this.imageSetInfo.refImageUrl,
                      style: 'max-width: 100%'
                    }))
                  ])
                ])
              ])
            ])
          ]))
        ])
      ]);

      // Bind an overlay to diff image
      // TODO: Explore binding overlay to each of images (that jumps between them)
      // DEV: We use imageSetEl's collapse as a container so it hides on collapse
      var imgOverlay = new Overlay(imageSetEl.querySelector('img[data-compare-type=diff]'), {
        containerEl: imageSetEl.querySelector('.image-set__collapse')
      });

      // Save imgOverlay for layer
      this.imgOverlay = imgOverlay;

      // Append our element to the container element
      this._containerEl.appendChild(imageSetEl);
    }

    // If we are rendering results, show them
    if (this.state.resultsState !== RESULTS_NONE) {
      // Remove previously existing content
      // TODO: Relocate removal of results el outside of `this.state` check -- it should be always
      if (this._resultsEl) {
        this.contentsEl.removeChild(this._resultsEl);
      }

      // Generate our new results
      // DEV: We could generate similar image sets separately but this is to keep performance issues contained
      var resultsEl = this._resultsEl = h.div({className: 'results'});
      this.contentsEl.appendChild(resultsEl);
      void new SimilarImageResults(resultsEl, {
        targetArea: this.targetArea,
        expectedImageSet: this
      });
    }
  },
  acceptChanges: function (imgBase64) {
    this._updateReferenceImage(imgBase64, 'true');
  },
  findSimilarImages: function () {
    // Localize our expected diff img
    var expectedDiffImg = this.diffImg;

    // Find and adjust our target area based on scaling
    // TODO: Be sure to test target area scaling for both matching and updated diffs
    // TODO: Move `targetArea` to `getTargetArea` method
    var targetArea = this.imgOverlay.overlayInfo.relative;
    var scaleRatio = expectedDiffImg.naturalWidth / expectedDiffImg.width;
    targetArea = {
      width: Math.min(Math.ceil(scaleRatio * targetArea.width), expectedDiffImg.naturalWidth),
      height: Math.min(Math.ceil(scaleRatio * targetArea.height), expectedDiffImg.naturalHeight),
      left: Math.max(Math.floor(scaleRatio * targetArea.left), 0),
      top: Math.max(Math.floor(scaleRatio * targetArea.top), 0)
    };

    // Save our image set info and trigger results rendering
    // TODO: Unset `targetArea` values on destroy/results removal
    this.state.resultsState = RESULTS_VISIBLE;
    this.targetArea = targetArea;
    this.render();
  },
  _updateReferenceImage: function (imgBase64, eagerStatus) {
    // Fade out diff and reference images to "loading" state
    this.diffImg.classList.add('loading');
    this.refImg.classList.add('loading');

    // If we have an eager status, use it
    // DEV: For an acceptance, we will eagerly update to 'imagesEqual: true'
    eagerStatus = eagerStatus || 'loading';

    // Update our status while updating
    var oldStatus = this.state.imagesEqual;
    this.titleEl.setAttribute('data-images-equal', eagerStatus);

    // Make an AJAX call to accept our image
    // http://api.jquery.com/jQuery.ajax/#jqXHR
    var jqXHR = $.post('/update-image-set/' + encodeURIComponent(this.id), {
      ref: imgBase64
    });

    // If there is an error
    var that = this;
    jqXHR.fail(function handleFail (jqXHR, textStatus, errorThrown) {
      // TODO: Expose error to user so they can retry
      console.error('Error encountered "' + errorThrown + '" when updating image "' + that.id + '"');

      // Reset status to previous state
      that.titleEl.setAttribute('data-images-equal', oldStatus);
    });

    // When we complete updating
    jqXHR.done(function handleDone (data, textStatus, jqXHR) {
      // Save new state and update status
      // data = {imagesEqual: true}
      that.state.imagesEqual = data.imagesEqual;
      that.titleEl.setAttribute('data-images-equal', data.imagesEqual);
    });

    // When loading completes, remove loading state and update image references
    jqXHR.always(function handleAlways (dataOrJqXHR, textStatus, jqXHROrErrorThrown) {
      that.diffImg.classList.remove('loading');
      that.refImg.classList.remove('loading');
      ImageSet.cachebustImg(that.diffImg);
      ImageSet.cachebustImg(that.refImg);
    });
  },
  updateReferenceImage: function (imgBase64) {
    this._updateReferenceImage(imgBase64);
  },
  saveEl: function (key, el) {
    this[key] = el;
    return el;
  }
};

// Export our constructor
module.exports = ImageSet;
