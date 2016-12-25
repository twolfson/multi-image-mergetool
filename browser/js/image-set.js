// Load in our dependencies
var $ = window.$ = window.jQuery = require('jquery');
var assert = require('assert');
var _ = require('underscore');
var h = require('hyperscript-helpers')(require('hyperscript'));
var classnames = require('classnames');
var BaseComponent = require('./base-component');
var GlobalState = require('./global-state');
var Overlay = require('./overlay');
var SimilarImageResults = require('./similar-image-results');
var utils = require('./utils');

// Define our constants
var IN_PROGRESS = 'IN_PROGRESS';
var NONE = 'NONE';

// Define our constructor
var ImageSet = BaseComponent.extend({
  initialize: function (options) {
    // Save parameters for later
    var imageSetInfo = this.imageSetInfo = options.imageSetInfo; assert(imageSetInfo);

    // Create one-off quick-reference variables
    this.id = imageSetInfo.id;
    this.humanName = imageSetInfo.id;

    // Save our state
    this.setState({
      eagerStatus: null,
      findSimilarImages: false,
      imagesEqual: imageSetInfo.imagesEqual,
      isNew: imageSetInfo.isNew,
      xhrState: NONE,
      targetArea: null
    });

    // Run our render method
    // TODO: Add destroy method so we can unreference element
    this.render();

    // Register our image set to the global state
    GlobalState.addImageSet(this);
  }
});

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
ImageSet.prototype = _.extend(ImageSet.prototype, {
  render: function () {
    // Create local variables for our image set
    var imageSetId = this.id;
    var imageSetHumanName = this.humanName;
    this.renderedAlready = true;
    this.el.setAttribute('data-image-set', imageSetId);

    // Row title
    // TODO: Move from link to button styled as link so we can ditch `href`
    this.el.appendChild(this.saveEl('titleEl', h.a({
      className: 'image-set__title',
      href: 'javascript:void 0;', 'data-toggle': 'collapse',
      'data-target': '[data-image-set="' + imageSetId + '"] .image-set__collapse',
      'data-images-equal': this.getState('imagesEqual'),
      attrs: {'aria-controls': imageSetId}
    }, imageSetHumanName)));

    // Collapsable container for row
    // DEV: We use `data-id` as `id` has restrictions on characters
    this.el.appendChild(this.saveEl('contentsEl', h.div({
      // Make our first image set visible
      className: classnames('image-set__collapse', 'collapse', 'well', {in: !this.getState('imagesEqual')})
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
              !this.getState('isNew') ? this.saveEl('diffImg', h.img({
                'data-compare-type': 'diff',
                src: this.imageSetInfo.diffImageUrl,
                style: 'max-width: 100%'
              })) : h.em('No diff image yet, image set is new. Please accept changes first')
            ]),
            h.td({style: 'width: 33%'}, [
              !this.getState('isNew') ? this.saveEl('refImg', h.img({
                'data-compare-type': 'ref',
                src: this.imageSetInfo.refImageUrl,
                style: 'max-width: 100%'
              })) : h.em('No ref image yet, image set is new. Please accept changes first')
            ])
          ])
        ])
      ])
    ])));

    // Bind an overlay to diff image
    // TODO: Explore binding overlay to each of images (that jumps between them)
    // DEV: We use our collapse as a container so it hides on collapse
    var imgOverlay = new Overlay(this.diffImg, {
      containerEl: this.contentsEl
    });
    this.imgOverlay = imgOverlay;

    // When our XHR state changes (e.g. updating, completed updating)
    this.onStateChange('xhrState', function handleXHRChange (prevXhrState, xhrState) {
      // If our image set is updating
      if (xhrState === IN_PROGRESS) {
        // Fade out diff and reference images to "loading" state
        this.diffImg.classList.add('loading');
        this.refImg.classList.add('loading');

        // Update our status to eager status
        this.titleEl.setAttribute('data-images-equal', this.getState('eagerStatus'));
      // Otherwise (update completed)
      } else {
        // Remove loading classes
        this.diffImg.classList.remove('loading');
        this.refImg.classList.remove('loading');

        // Use actual status as status
        this.titleEl.setAttribute('data-images-equal', this.getState('imagesEqual'));

        // Cachebust our images
        ImageSet.cachebustImg(this.diffImg);
        ImageSet.cachebustImg(this.refImg);
      }
    });

    // When we toggle finding similar images/not
    this.onStateChange('findSimilarImages', function handleStateChange (prevVal, newVal) {
      // Remove previously existing content
      // TODO: Relocate removal of results el outside of `this.state` check -- it should be always
      if (this._resultsEl) {
        this.contentsEl.removeChild(this._resultsEl);
        delete this._resultsEl;
      }

      // If we are generating results, then populate them
      // DEV: We could generate similar image sets separately but this is to keep performance issues contained
      if (newVal !== false) {
        var resultsEl = this._resultsEl = h.div({className: 'results'});
        this.contentsEl.appendChild(resultsEl);
        void new SimilarImageResults({
          el: resultsEl,
          targetArea: this.getState('targetArea'),
          expectedImageSet: this
        });
      }
    });
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
    // DEV: We use `Date.now()` to guarantee a different value on multiple presses
    this.setState({
      targetArea: targetArea,
      findSimilarImages: Date.now()
    });
  },
  _updateReferenceImage: function (imgBase64, eagerStatus) {
    // Set our state as loading and an eager status
    // DEV: For an acceptance request, we will eagerly update to 'imagesEqual: true'
    this.setState({
      eagerStatus: eagerStatus || 'loading',
      xhrState: IN_PROGRESS
    });

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

      // Remove loading state (triggers re-render)
      that.setState({
        eagerStatus: null,
        xhrState: NONE
      });
    });

    // When we complete updating
    jqXHR.done(function handleDone (data, textStatus, jqXHR) {
      // Save our new state (triggers re-render)
      // data = {imagesEqual: true}
      that.setState({
        eagerStatus: null,
        imagesEqual: data.imagesEqual,
        isNew: false,
        xhrState: NONE
      });
    });
  },
  updateReferenceImage: function (imgBase64) {
    this._updateReferenceImage(imgBase64);
  }
});

// Export our constructor
module.exports = ImageSet;
