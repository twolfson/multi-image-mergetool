// Load in our dependencies
// DEV: Re-expose jQuery for Bootstrap
var assert = require('assert');
var $ = window.$ = window.jQuery = require('jquery');
void require('bootstrap/dist/js/bootstrap.js');
var D = require('./domo');
var GlobalState = require('./global-state');
var ImageSet = require('./image-set');
var SimilarImageResults = require('./similar-image-results');

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
    var $imageSet = $(btnEl).closest('[data-image-set]');
    // assert.strictEqual($imageSet.length, 1);

    // Find our similar image sets
    var $similarImageSets = $imageSet.find('[data-similar-image-set]');
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
      var similarImageSetId = $similarImageSet.data('similar-image-set');

      // Find our original current image
      var $originalCurrentImg = $similarImageSet.find('.original-current');
      // assert.strictEqual($originalCurrentImg.length, 1);
      var originalCurrentImgBase64 = getBase64Content($originalCurrentImg[0]);

      // Run accept function
      // TODO: Remove results when all loaded
      var imageSet = GlobalState.fetchImageSetById(similarImageSetId);
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
      var similarImageSetId = $similarImageSet.data('similar-image-set');

      // Extract updated base64 content
      var $updatedRefCanvas = $similarImageSet.find('.updated-ref');
      // assert.strictEqual($updatedRefCanvas.length, 1);
      var base64Data = $updatedRefCanvas[0].toDataURL('image/png');

      // Run update function
      // TODO: Remove results when all loaded
      var imageSet = GlobalState.fetchImageSetById(similarImageSetId);
      imageSet.acceptChanges(base64Data);
    });
  });

  $('body').on('click', 'button[data-action="find-similar-images"]', function handleClick (evt) {
    // Find our image set container
    var btnEl = evt.target;
    var $expectedImageSet = $(btnEl).closest('[data-image-set]');
    var expectedImageSetEl = $expectedImageSet[0];
    var expectedImageSetCollapseEl = $expectedImageSet.find('.image-set__collapse')[0];
    var expectedImageSetId = $expectedImageSet.data('image-set');
    var expectedImageSet = GlobalState.fetchImageSetById(expectedImageSetId);

    // Find our target area
    var imgOverlay = expectedImageSetEl.imgOverlay;
    // assert(imgOverlay);
    var targetArea = imgOverlay.overlayInfo.relative;

    // Resolve our expected diff img
    // DEV: This loads first matching image only due to `querySelector` instead of `querySelectorAll`
    var expectedDiffImg = expectedImageSetEl.querySelector('[data-compare-type=diff]');

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
    var _resultsEl = expectedImageSetCollapseEl.querySelector('.results');
    if (_resultsEl) {
      expectedImageSetCollapseEl.removeChild(_resultsEl);
    }

    // Generate and append our results
    // TODO: Relocate results generation/clearing into ImageSet class
    var resultsEl = D.DIV({class: 'results'}, [
      D.H4([
        'Similar images',
        D.SPAN({class: 'results__count'}, ''),
        ':'
      ])
    ]);
    // TODO: Delete results element upon resolution
    expectedImageSetCollapseEl.appendChild(resultsEl);

    // Start our chain of methods
    findSelectionMatches();
    function findSelectionMatches() { // jshint ignore:line
      // Resolve our similar image sets based on target area
      var matchingImageSets = expectedImageSet.findSimilarImageSets(targetArea);

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
      // Generate our new results
      // DEV: We could generate similar image sets separately but this is to keep performance issues contained
      void new SimilarImageResults(resultsEl, {
        imageSets: imageSets,
        targetArea: targetArea,
        expectedImageSet: expectedImageSet
      });
    }
  });
};

// Export our application
module.exports = Application;
