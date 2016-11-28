// Load in our dependencies
// DEV: Re-expose jQuery for Bootstrap
var assert = require('assert');
var $ = window.$ = window.jQuery = require('jquery');
void require('bootstrap/dist/js/bootstrap.js');
var D = require('./domo');
var ImageSet = require('./image-set');
var GlobalState = require('./global-state');

// TODO: Consider scrollspy for update buttons
// TODO: Consider buttons to expand row of images to full screen
// TODO: Consider magnifying glass zoom on images (e.g. like in ecommerce sites)

// Define our application
function Application(_containerEl, imageSetInfoArr) {
  // Save our container element for later
  // TODO: Add a `destroy` method which removes element as well as any bindings
  this.containerEl = _containerEl;

  // Generate our document fragment
  // DEV: We use a document fragment instead of the DOM directly to prevent redrawing elements on each append
  var imageSetsDocFrag = D.FRAGMENT();

  // Expose our images
  // TODO: Expose images in tree list like gemini-gui, maybe even simplified variants like GitHub
  //   (e.g. `a/b/c` when only 1 file)
  imageSetInfoArr.forEach(function createImageSet (imageSetInfo) {
    void new ImageSet(imageSetsDocFrag, imageSetInfo);
  });

  // Apppend our container element
  this.containerEl.appendChild(imageSetsDocFrag);
}

// Define our button bindings
Application.bindOnce = function () {
  // Define base64 content helper
  // TODO: Find a base64 content helper library?
  var base64CanvasEl = document.createElement('canvas');
  var base64Context = base64CanvasEl.getContext('2d');
  function getBase64Content(imgEl) {
    // Resize our canvas to target size
    var width = base64CanvasEl.width = imgEl.naturalWidth;
    var height = base64CanvasEl.height = imgEl.naturalHeight;

    // Clear our canvas to prevent legacy artifacts
    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clearRect
    // TODO: Test me that we clear legacy artifacts properly
    base64Context.clearRect(0, 0, width, height);

    // Draw our image and return its data URL
    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL
    // DEV: We use `image/png` for lossless encoding which is necessary for visual comparison
    base64Context.drawImage(imgEl, 0, 0);
    return base64CanvasEl.toDataURL('image/png');
  }

  // Set up image acceptance binding
  $('body').on('click', 'button[data-action="accept-changes"]', function handleClick (evt) {
    // Find our image set container
    var btnEl = evt.target;
    var $imageSet = $(btnEl).closest('[data-image-set]');
    var imageSetId = $imageSet.data('image-set');
    assert.strictEqual($imageSet.length, 1);

    // Find the current image
    var $currentImg = $imageSet.find('[data-compare-type="current"]');
    assert.strictEqual($currentImg.length, 1);

    // Extract base64 content for image
    var base64Data = getBase64Content($currentImg[0]);

    // Run acceptance function
    var imageSet = GlobalState.fetchImageSetById(imageSetId);
    imageSet.acceptChanges(base64Data);
  });

  function findSelectedSimilarImageSets(evt) {
    // Find our image set container
    var btnEl = evt.target;
    var $imgSet = $(btnEl).closest('[data-image-set]');
    // assert.strictEqual($imgSet.length, 1);

    // Find our similar image sets
    var $similarImageSets = $imgSet.find('[data-similar-image-set]');
    // assert.strictEqual($currentImg.length, 1);

    // Filter our similar image sets to selected ones
    return $similarImageSets.filter(function updateImageSet (i, similarImageSetEl) {
      return similarImageSetEl.querySelector('[name=save_update]').checked;
    });
  }

  $('body').on('click', 'button[data-action="accept-similar-images"]', function handleClick (evt) {
    // Resolve our similar image sets
    var $selectedSimilarImageSets = findSelectedSimilarImageSets(evt);

    // Accept our image set based on its selection
    $selectedSimilarImageSets.each(function updateImageSet (i, similarImageSetEl) {
      // Move back to jQuery collection
      var $similarImageSet = $(similarImageSetEl);
      var similarImgSetId = $similarImageSet.data('similar-image-set');

      // Find our original current image
      var $originalCurrentImg = $similarImageSet.find('.original-current');
      // assert.strictEqual($originalCurrentImg.length, 1);
      var originalCurrentImgBase64 = getBase64Content($originalCurrentImg[0]);

      // Run accept function
      // TODO: Remove results when all loaded
      var imageSet = GlobalState.fetchImageSetById(similarImgSetId);
      imageSet.acceptChanges(originalCurrentImgBase64);
    });
  });
  $('body').on('click', 'button[data-action="update-similar-images"]', function handleClick (evt) {
    // Resolve our similar image sets
    var $selectedSimilarImageSets = findSelectedSimilarImageSets(evt);

    // Update our image set based on its selection
    $selectedSimilarImageSets.each(function updateImageSet (i, similarImageSetEl) {
      // Move back to jQuery collection
      var $similarImageSet = $(similarImageSetEl);
      var similarImgSetId = $similarImageSet.data('similar-image-set');

      // Extract updated base64 content
      var $updatedRefCanvas = $similarImageSet.find('.updated-ref');
      // assert.strictEqual($updatedRefCanvas.length, 1);
      var base64Data = $updatedRefCanvas[0].toDataURL('image/png');

      // Run update function
      // TODO: Remove results when all loaded
      var imageSet = GlobalState.fetchImageSetById(similarImgSetId);
      imageSet.acceptChanges(base64Data);
    });
  });

  $('body').on('click', 'button[data-action="find-similar-images"]', function handleClick (evt) {
    // Find our image set container
    var btnEl = evt.target;
    var $expectedImgSet = $(btnEl).closest('[data-image-set]');
    var expectedImgSetEl = $expectedImgSet[0];
    var expectedImgSetCollapseEl = $expectedImgSet.find('.image-set__collapse')[0];
    var expectedImgSetId = $expectedImgSet.data('image-set');
    var expectedImgSet = GlobalState.fetchImageSetById(expectedImgSetId);

    // Find our target area
    var imgOverlay = expectedImgSetEl.imgOverlay;
    // assert(imgOverlay);
    var targetArea = imgOverlay.overlayInfo.relative;

    // Resolve our expected diff img
    // DEV: This loads first matching image only due to `querySelector` instead of `querySelectorAll`
    var expectedDiffImg = expectedImgSetEl.querySelector('[data-compare-type=diff]');

    // Adjust our target area based on scaling
    // TODO: Be sure to test target area scaling for both matching and updated diffs
    var scaleRatio = expectedDiffImg.naturalWidth / expectedDiffImg.width;
    targetArea = {
      width: Math.min(Math.ceil(scaleRatio * targetArea.width), expectedDiffImg.naturalWidth),
      height: Math.min(Math.ceil(scaleRatio * targetArea.height), expectedDiffImg.naturalHeight),
      left: Math.max(Math.floor(scaleRatio * targetArea.left), 0),
      top: Math.max(Math.floor(scaleRatio * targetArea.top), 0)
    };

    // Remove previously existing results
    var _resultsEl = expectedImgSetCollapseEl.querySelector('.results');
    if (_resultsEl) {
      expectedImgSetCollapseEl.removeChild(_resultsEl);
    }

    // Generate and append our results
    var resultsEl = D.DIV({class: 'results'}, [
      D.H4([
        'Similar images',
        D.SPAN({class: 'results__count'}, ''),
        ':'
      ])
    ]);
    // TODO: Delete results element upon resolution
    expectedImgSetCollapseEl.appendChild(resultsEl);

    // Start our chain of methods
    findSelectionMatches();
    function findSelectionMatches() { // jshint ignore:line
      // Resolve our similar image sets based on target area
      var matchingImageSets = expectedImgSet.findSimilarImageSets(targetArea);

      // If we have no matching image sets
      assert.notEqual(matchingImageSets.length, 0,
        'Something went horribly wrong when matching images; not even the original is equal to itself');
      if (matchingImageSets.length === 1) {
        resultsEl.appendChild(D.DIV('No similar images found'));
        return;
      }

      // Otherwise, update our count and append our buttons
      resultsEl.querySelector('.results__count').textContent = ' (' + matchingImageSets.length + ')';
      resultsEl.appendChild(D.DIV([
        D.BUTTON({
          class: 'btn btn-default',
          'data-action': 'accept-similar-images'
        }, '✓ Accept similar images'),
        ' ',
        D.BUTTON({
          class: 'btn btn-default',
          'data-action': 'update-similar-images'
        }, '✓ Update similar images with selection')
      ]));

      // Pass through matching sets to `bulkUpdateSelection`
      bulkUpdateSelection(matchingImageSets);
    }

    function bulkUpdateSelection(imageSets) { // jshint ignore:line
      // Start our performance check (620ms total for 100 1024x1600 images, 400ms seems to be first `drawImage`)
      console.time('bulkUpdateSelection');

      // Find our output targets
      var resultsDocFrag = D.FRAGMENT();

      // Generate and updated ref image for each of our comparisons
      imageSets.forEach(function generateUpdatedRef (imageSet) {
        // Localize our references
        var currentImg = imageSet.currentImg;
        var diffImg = imageSet.diffImg;
        var refImg = imageSet.refImg;

        // Create helper to generate new canvases
        function createUpdatedCanvas(baseImg, attributes) {
          // Create a canvas
          // https://github.com/scijs/get-pixels/blob/7c447cd979637b31e47e148f238a1e71611af481/dom-pixels.js#L14-L18
          var canvasEl = D.CANVAS(attributes);
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
        var updatedDiffCanvasEl = createUpdatedCanvas(diffImg, {class: 'updated-diff'});
        var updatedRefCanvasEl = createUpdatedCanvas(refImg, {class: 'updated-ref'});
        // Shrink all canvases/images for output
        currentImgClone.style.maxWidth = '100%';
        updatedDiffCanvasEl.style.maxWidth = '100%';
        updatedRefCanvasEl.style.maxWidth = '100%';

        // Generate and append result content
        // DEV: We use a document fragment to avoid `n` DOM edits -- instead it's 1
        // DEV: Tables will all use same width due to heuristics
        var resultGroupEl = D.TABLE({
          class: 'table',
          'data-similar-image-set': imageSet.id
        }, [
          D.THEAD([
            D.TR([
              // TODO: Add collapse support like in `gemini-gui`
              D.TH({colspan: 3}, imageSet === expectedImgSet ? imageSet.humanName + ' (current set)' : imageSet.humanName)
            ]),
            D.TR([
              // TODO: Move style out of inline and to classes for more performance
              // DEV: `min-width` is to give us spacing for "Save update text"
              D.TD({style: 'padding-right: 10px; min-width: 120px;'}, 'Save update:'),
              D.TD('Original current:'),
              D.TD('Updated diff:'),
              D.TD('Updated ref:')
            ])
          ]),
          D.TBODY([
            D.TR([
              D.TD({
                style: 'vertical-align: top;'
              }, [
                D.INPUT({name: 'save_update', type: 'checkbox', checked: true})
              ]),
              // TODO: Consider placing overlay on canvases or muting non-overlay section
              //   It's hard to see the changes as is but maybe the overlay selection will make it more obvious
              D.TD({style: 'vertical-align: top;'}, [currentImgClone]),
              D.TD({style: 'vertical-align: top;'}, [updatedDiffCanvasEl]),
              D.TD({style: 'vertical-align: top;'}, [updatedRefCanvasEl])
            ])
          ])
        ]);
        resultsDocFrag.appendChild(resultGroupEl);
      });

      // Append aggregate content to DOM
      resultsEl.appendChild(resultsDocFrag);

      // End our performance check
      console.timeEnd('bulkUpdateSelection');
    }
  });
};

// Export our application
module.exports = Application;
