// Load in our dependencies
// DEV: Re-expose jQuery for Bootstrap
window.$ = window.jQuery = require('jquery');
void require('bootstrap/dist/js/bootstrap.js');
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
  var imageSetsDocFrag = document.createDcoumentFragment();

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
  ImageSet.bindOnce();
  SimilarImageResults.bindOnce();
};

// Export our application
module.exports = Application;
