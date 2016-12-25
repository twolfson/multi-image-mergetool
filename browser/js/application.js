// Load in our dependencies
// DEV: Re-expose jQuery for Bootstrap
var assert = require('assert');
window.$ = window.jQuery = require('jquery');
void require('bootstrap/dist/js/bootstrap.js');
var h = require('hyperscript-helpers')(require('hyperscript'));
var BaseComponent = require('./base-component');
var ImageSet = require('./image-set');
var SimilarImageResults = require('./similar-image-results');

// TODO: Consider scrollspy for update buttons
// TODO: Consider buttons to expand row of images to full screen
// TODO: Consider magnifying glass zoom on images (e.g. like in ecommerce sites)

// Define our application
var Application = BaseComponent.extend({
  initialize: function (options) {
    // Generate our detached DOM node
    // DEV: We use a detached node instead of an attached one to prevent repainting elements on each append
    // TODO: Add a `destroy` method which removes element as well as any bindings
    var ulEl = h.ul();

    // Expose our images
    // TODO: Expose images in tree list like gemini-gui, maybe even simplified variants like GitHub
    //   (e.g. `a/b/c` when only 1 file)
    var imageSetInfoArr = options.imageSets; assert(imageSetInfoArr);
    imageSetInfoArr.forEach(function createImageSet (imageSetInfo) {
      var liEl = h.li();
      void new ImageSet({
        el: liEl,
        imageSetInfo: imageSetInfo
      });
      ulEl.appendChild(liEl);
    });

    // Apppend our containing element
    this.el.appendChild(ulEl);
  }
});

// Define our button bindings
Application.bindOnce = function () {
  ImageSet.bindOnce();
  SimilarImageResults.bindOnce();
};

// Export our application
module.exports = Application;
