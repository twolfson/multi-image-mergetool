// Load in our dependencies
// DEV: Re-expose jQuery for Bootstrap
var assert = require('assert');
var $ = window.$ = window.jQuery = require('jquery');
void require('bootstrap/dist/js/bootstrap.js');
var D = require('./domo');
var GlobalState = require('./global-state');
var ImageSet = require('./image-set');
var utils = require('./utils');

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
    var base64Data = utils.getBase64Content($currentImg[0]);

    // Run acceptance function
    var imageSet = GlobalState.fetchImageSetById(imageSetId);
    imageSet.acceptChanges(base64Data);
  });

  $('body').on('click', 'button[data-action="find-similar-images"]', function handleClick (evt) {
    // Find our image set
    var btnEl = evt.target;
    var $imageSet = $(btnEl).closest('[data-image-set]');
    var imageSet = GlobalState.fetchImageSetById($imageSet.data('image-set'));

    // Find its similar images
    imageSet.findSimilarImages();
  });
};

// Export our application
module.exports = Application;
