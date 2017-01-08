// Load in our dependencies
var $ = window.$ = window.jQuery = require('jquery');
var _ = require('underscore');
var assert = require('assert');
var h = require('hyperscript-helpers')(require('hyperscript'));
var BaseComponent = require('./base-component');
var GlobalState = require('./global-state');
var utils = require('./utils');

// Define our constructor
var SimilarImageResults = BaseComponent.extend({
  initialize: function (options) {
    // Localize/assert our parameters
    this.targetArea = options.targetArea; assert(this.targetArea);
    this.expectedImageSet = options.expectedImageSet; assert(this.expectedImageSet);

    // Set up initial loading state and render now
    // DEV: We render early with loading state to provide visual feedback
    this.setState({
      imageSets: null
    });
    this.render();

    // Resolve our matching image sets
    this.findMatchingImageSets();
  }
});

// Define our class level helpers
// DEV: We don't inline these to make them mockable for demos
SimilarImageResults.findSelectedSimilarImageSets = function (evt) {
  // Find our image set container
  var btnEl = evt.target;
  var $imageSet = $(btnEl).closest('[data-image-set]');
  assert.strictEqual($imageSet.length, 1);

  // Find our similar image sets
  // TODO: Use direct references instead of query selector
  var $similarImageSets = $imageSet.find('[data-similar-image-set]');

  // Filter our similar image sets to selected ones
  return $similarImageSets.filter(function updateImageSet (i, similarImageSetEl) {
    return similarImageSetEl.querySelector('[name=save_update]').checked;
  });
};
SimilarImageResults.acceptSimilarImageSet = function (similarImageSetEl) {
  // Move back to jQuery collection
  var $similarImageSet = $(similarImageSetEl);
  var similarImageSetId = $similarImageSet.data('similar-image-set');

  // Find our original current image
  var $originalCurrentImg = $similarImageSet.find('.original-current');
  assert.strictEqual($originalCurrentImg.length, 1);
  var originalCurrentImgBase64 = utils.getBase64Content($originalCurrentImg[0]);

  // Run accept function
  // TODO: Remove results when all loaded
  var imageSet = GlobalState.fetchImageSetById(similarImageSetId);
  imageSet.acceptChanges(originalCurrentImgBase64);
};
SimilarImageResults.updateSimilarImageSet = function (similarImageSetEl) {
  // Move back to jQuery collection
  var $similarImageSet = $(similarImageSetEl);
  var similarImageSetId = $similarImageSet.data('similar-image-set');

  // Extract updated base64 content
  var $updatedRefCanvas = $similarImageSet.find('.updated-ref');
  assert.strictEqual($updatedRefCanvas.length, 1);
  var base64Data = $updatedRefCanvas[0].toDataURL('image/png');

  // Run update function
  // TODO: Remove results when all loaded
  var imageSet = GlobalState.fetchImageSetById(similarImageSetId);
  imageSet.acceptChanges(base64Data);
};

// Define our bindings
SimilarImageResults.bindOnce = function () {
  $('body').on('click', 'button[data-action="accept-similar-images"]', function handleClick (evt) {
    // Resolve and accept our selected similar image sets
    var $selectedSimilarImageSets = SimilarImageResults.findSelectedSimilarImageSets(evt);
    _.each($selectedSimilarImageSets, SimilarImageResults.acceptSimilarImageSet);
  });
  $('body').on('click', 'button[data-action="update-similar-images"]', function handleClick (evt) {
    // Resolve and update our selected similar image sets
    var $selectedSimilarImageSets = SimilarImageResults.findSelectedSimilarImageSets(evt);
    _.each($selectedSimilarImageSets, SimilarImageResults.updateSimilarImageSet);
  });
};

// Define more class methods
SimilarImageResults.findSimilarImageSets = function (expectedImageSet, targetArea) {
  // Start our performance check (70ms for 200 1024x1600 images)
  console.time('findSimilarImageSets');

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
  var expectedDiffImg = expectedImageSet.diffImg.cloneNode();
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
    // If the image set is new, return false
    if (imageSetInfo.isNew()) {
      return false;
    }

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
  console.timeEnd('findSimilarImageSets');

  // Return our matching image sets
  return matchingImageSets;
};

// Define our prototype
SimilarImageResults.prototype = _.extend(SimilarImageResults.prototype, {
  render: function () {
    // Render our title element
    var titleEl = this.titleEl = h.h4([
      'Similar images',
      this.saveEl('resultsCountEl', h.span({className: 'results__count'}, '')),
      ':'
    ]);
    this.el.appendChild(titleEl);

    // When our image sets load, render them
    this.onStateChange('imageSets', function handleImageSets (previousImageSets, imageSets) {
      // Sanity check that we are only finding image sets once
      assert.strictEqual(previousImageSets, null);

      // If we have no matching image sets
      if (imageSets.length === 1) {
        this.el.appendChild(h.div(null, 'No similar images found'));
        return;
      }

      // Otherwise, update our count and append our buttons
      this.resultsCountEl.textContent = ' (' + imageSets.length + ')';
      this.el.appendChild(h.div([
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

      // Start our performance check (620ms total for 100 1024x1600 images, 400ms seems to be first `drawImage`)
      console.time('bulkUpdateSelection');

      // Find our output targets
      var resultsDocFrag = this.resultsDocFrag = document.createDocumentFragment();

      // Generate and updated ref image for each of our comparisons
      var expectedImageSet = this.expectedImageSet;
      var targetArea = this.targetArea;
      imageSets.forEach(function generateUpdatedRef (imageSet) {
        // Localize our references
        var currentImg = imageSet.currentImg;
        var diffImg = imageSet.diffImg;
        var refImg = imageSet.refImg;

        // Create helper to generate new canvases
        function createUpdatedCanvas(baseImg, attributes) {
          // Create a canvas
          // https://github.com/scijs/get-pixels/blob/7c447cd979637b31e47e148f238a1e71611af481/dom-pixels.js#L14-L18
          var canvasEl = h.canvas(attributes);
          canvasEl.width = refImg.naturalWidth;
          canvasEl.height = refImg.naturalHeight;
          var context = canvasEl.getContext('2d');

          // Load our base image onto the canvas
          // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
          context.drawImage(baseImg, 0, 0);

          // Update our selected portion on reference and draw image in clipping
          // DEV: This is probably the most efficient way (outside of web workers) because
          //   we would have to draw image twice no matter what
          //   Maybe there's double pixel updates but I don't thinks so
          // DEV: Performance alternatives we thought of but aren't needed
          //   Extract image from 2nd canvas via `ndarray`
          //   Use web workers
          //   Requesting server do it via `get-pixels` and `save-pixels`
          // DEV: Slowest part is drawing initial image above
          // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rect
          context.rect(targetArea.left, targetArea.top, targetArea.width, targetArea.height);
          context.clip();
          context.drawImage(currentImg, 0, 0);

          // Return our canvas
          return canvasEl;
        }

        // Generate updated images and clone reference image
        var currentImgClone = currentImg.cloneNode();
        currentImgClone.className = 'original-current';
        var updatedDiffCanvasEl = createUpdatedCanvas(diffImg, {className: 'updated-diff'});
        var updatedRefCanvasEl = createUpdatedCanvas(refImg, {className: 'updated-ref'});
        // Shrink all canvases/images for output
        currentImgClone.style.maxWidth = '100%';
        updatedDiffCanvasEl.style.maxWidth = '100%';
        updatedRefCanvasEl.style.maxWidth = '100%';

        // Generate and append result content
        // DEV: We use a document fragment to avoid `n` DOM edits -- instead it's 1
        // DEV: Tables will all use same width due to heuristics
        var imageSetHumanName = imageSet.humanName;
        if (imageSet === expectedImageSet) { imageSetHumanName += ' (current set)'; }
        var resultGroupEl = h.table({
          className: 'table',
          'data-similar-image-set': imageSet.id
        }, [
          h.thead([
            h.tr([
              h.th({colSpan: 3}, imageSetHumanName)
            ]),
            h.tr([
              // TODO: Move style out of inline and to classes for more performance
              // DEV: `min-width` is to give us spacing for "Save update text"
              h.td({style: 'padding-right: 10px; min-width: 120px;'}, 'Save update:'),
              h.td(null, 'Current (unchanged):'),
              h.td(null, 'Updated diff (diff + overlay):'),
              h.td(null, 'Updated ref (ref + overlay):')
            ])
          ]),
          h.tbody([
            h.tr([
              h.td({
                style: 'vertical-align: top;'
              }, [
                h.input({name: 'save_update', type: 'checkbox', checked: true})
              ]),
              // TODO: Consider placing overlay on canvases or muting non-overlay section
              //   It's hard to see the changes as is but maybe the overlay selection will make it more obvious
              h.td({style: 'vertical-align: top;'}, [currentImgClone]),
              h.td({style: 'vertical-align: top;'}, [updatedDiffCanvasEl]),
              h.td({style: 'vertical-align: top;'}, [updatedRefCanvasEl])
            ])
          ])
        ]);
        resultsDocFrag.appendChild(resultGroupEl);
      });

      // Append aggregate content to DOM
      this.el.appendChild(resultsDocFrag);

      // End our performance check
      console.timeEnd('bulkUpdateSelection');
    });
  },
  findMatchingImageSets: function () {
    // Resolve our similar image sets based on target area
    var matchingImageSets = SimilarImageResults.findSimilarImageSets(this.expectedImageSet, this.targetArea);
    assert.notEqual(matchingImageSets.length, 0,
      'Something went horribly wrong when matching images; not even the original is equal to itself');

    // Save our image sets (causes re-render)
    // TODO: Unset `imageSets`/sate on destroy
    this.setState('imageSets', matchingImageSets);
  }
});

// Export our constructor
module.exports = SimilarImageResults;

