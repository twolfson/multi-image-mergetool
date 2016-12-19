// Load in our dependencies
var assert = require('assert');
var $ = window.$ = window.jQuery = require('jquery');
var h = require('hyperscript-helpers')(require('hyperscript'));
var classnames = require('classnames');
var GlobalState = require('./global-state');
var Overlay = require('./overlay');
var SimilarImageResults = require('./similar-image-results');
var utils = require('./utils');

// Define our constructor
function ImageSet(_containerEl, imageSetInfo) {
  // Create local variables for our image set
  var imageSetId = this.id = imageSetInfo.id;
  var imageSetHumanName = this.humanName = imageSetInfo.id;

  // Save our state
  this.state = {
    imagesEqual: imageSetInfo.imagesEqual
  };

  // Generate our image set element
  var imageSetEl = h.ul({'data-image-set': imageSetId}, [
    h.li([
      // Row title
      // TODO: Move from link to button styled as link so we can ditch `href`
      this.saveEl('titleEl', h.a({
        className: 'image-set__title',
        href: 'javascript:void 0;', 'data-toggle': 'collapse',
        'data-target': '[data-image-set="' + imageSetId + '"] .image-set__collapse',
        'data-images-equal': imageSetInfo.imagesEqual,
        'aria-controls': imageSetId
      }, imageSetHumanName)),

      // Collapsable container for row
      // DEV: We use `data-id` as `id` has restrictions on characters
      this.saveEl('contentsEl', h.div({
        // Make our first image set visible
        className: classnames('image-set__collapse', 'collapse', 'well', {in: !imageSetInfo.imagesEqual})
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
                  src: imageSetInfo.currentImageUrl,
                  style: 'max-width: 100%'
                }))
              ]),
              h.td({style: 'width: 33%'}, [
                this.saveEl('diffImg', h.img({
                  'data-compare-type': 'diff',
                  src: imageSetInfo.diffImageUrl,
                  style: 'max-width: 100%'
                }))
              ]),
              h.td({style: 'width: 33%'}, [
                this.saveEl('refImg', h.img({
                  'data-compare-type': 'ref',
                  src: imageSetInfo.refImageUrl,
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
  _containerEl.appendChild(imageSetEl);

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
  acceptChanges: function (imgBase64) {
    this._updateReferenceImage(imgBase64, 'true');
  },
  _findSimilarImageSets: function (targetArea) {
    // Start our performance check (70ms for 200 1024x1600 images)
    console.time('findSelectionMatches');

    // Prepare canvas for images to match against
    function getSelectionImageData(img) {
      // Generate our canvas sized down to the selection
      // https://github.com/scijs/get-pixels/blob/7c447cd979637b31e47e148f238a1e71611af481/dom-pixels.js#L14-L18
      var canvasEl = document.createElement('canvas');
      canvasEl.width = targetArea.width;
      canvasEl.height = targetArea.height;
      var context = canvasEl.getContext('2d');

      // Draw a clip as a performance precaution, then our image
      // DEV: We haven't tested if using a clip improves performance but assume it should
      // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
      // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rect
      context.rect(0, 0, targetArea.width, targetArea.height);
      context.clip();
      // TODO: Verify that drawing scaled images doesn't affect canvas drawing
      context.drawImage(img, -1 * targetArea.left, -1 * targetArea.top);

      // Return our generated canvas
      // https://github.com/scijs/get-pixels/blob/7c447cd979637b31e47e148f238a1e71611af481/dom-pixels.js#L19-L20
      return context.getImageData(0, 0, targetArea.width, targetArea.height).data;
    }

    // Reset HTML/CSS overrides
    // TODO: We should be able to remove overrides by using `naturalWidth`
    var expectedDiffImg = this.diffImg.cloneNode();
    delete expectedDiffImg.height; delete expectedDiffImg.width;
    delete expectedDiffImg.style; delete expectedDiffImg.className;
    var expectedImageData = getSelectionImageData(expectedDiffImg);

    // Prepare deep equals helper
    // DEV: This is bad for security as we short circuit (i.e. not time constant comparison)
    function deepEquals(aArr, bArr) {
      if (aArr.length !== bArr.length) {
        return false;
      }
      var i = 0;
      for (; i < aArr.length; i += 1) {
        if (aArr[i] !== bArr[i]) {
          return false;
        }
      }
      return true;
    }

    // Filter image sets based on matching widths and selection
    var matchingImageSets = GlobalState.getImageSets().filter(function matchImageSetInfo (imageSetInfo) {
      // If the images are different widths, return false
      // TODO: Allow this to be a configurable heuristic
      var actualDiffImg = imageSetInfo.diffImg;
      if (expectedDiffImg.naturalWidth !== actualDiffImg.naturalWidth) {
        return false;
      }

      // If the selection is different, return false
      // DEV: We current do an exact match but could move to other comparison script
      //   Unfortunately, Gemini's comparison seems to be Node.js only
      //   and an exact match is "good enough" for now
      var actualImageData = getSelectionImageData(actualDiffImg);
      if (!deepEquals(actualImageData, expectedImageData)) {
        return false;
      }

      // Otherwise, approve match
      return true;
    });

    // End our performance check
    console.timeEnd('findSelectionMatches');

    // Return our matching image sets
    return matchingImageSets;
  },
  findSimilarImages: function () {
    // Localize our expected diff img
    var expectedDiffImg = this.diffImg;

    // Find and adjust our target area based on scaling
    // TODO: Be sure to test target area scaling for both matching and updated diffs
    var targetArea = this.imgOverlay.overlayInfo.relative;
    var scaleRatio = expectedDiffImg.naturalWidth / expectedDiffImg.width;
    targetArea = {
      width: Math.min(Math.ceil(scaleRatio * targetArea.width), expectedDiffImg.naturalWidth),
      height: Math.min(Math.ceil(scaleRatio * targetArea.height), expectedDiffImg.naturalHeight),
      left: Math.max(Math.floor(scaleRatio * targetArea.left), 0),
      top: Math.max(Math.floor(scaleRatio * targetArea.top), 0)
    };

    // Remove previously existing results
    if (this._resultsEl) {
      this.contentsEl.removeChild(this._resultsEl);
    }

    // Generate and append our results
    // TODO: Relocate results generation/clearing into ImageSet class
    // DEV: We perform result element generation/append first to improve perceived loading
    var resultsEl = this._resultsEl = h.div({className: 'results'}, [
      h.h4([
        'Similar images',
        h.span({className: 'results__count'}, ''),
        ':'
      ])
    ]);
    // TODO: Delete results element upon resolution
    this.contentsEl.appendChild(resultsEl);

    // Resolve our similar image sets based on target area
    var matchingImageSets = this._findSimilarImageSets(targetArea);

    // If we have no matching image sets
    assert.notEqual(matchingImageSets.length, 0,
      'Something went horribly wrong when matching images; not even the original is equal to itself');
    if (matchingImageSets.length === 1) {
      resultsEl.appendChild(h.div(null, 'No similar images found'));
      return;
    }

    // Otherwise, update our count and append our buttons
    resultsEl.querySelector('.results__count').textContent = ' (' + matchingImageSets.length + ')';
    resultsEl.appendChild(h.div([
      h.button({
        className: 'btn btn-default',
        'data-action': 'accept-similar-images'
      }, '✓ Accept similar images'),
      ' ',
      h.button({
        className: 'btn btn-default',
        'data-action': 'update-similar-images'
      }, '✓ Update similar images with selection')
    ]));

    // Generate our new results
    // DEV: We could generate similar image sets separately but this is to keep performance issues contained
    void new SimilarImageResults(resultsEl, {
      imageSets: matchingImageSets,
      targetArea: targetArea,
      expectedImageSet: this
    });
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
