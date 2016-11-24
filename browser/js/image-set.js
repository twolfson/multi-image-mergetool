// Load in our dependencies
var $ = window.$ = window.jQuery = require('jquery');
var D = require('./domo');
var Overlay = require('./overlay');

// Deifne our constructor
function ImageSet(_containerEl, imageSetInfo) {
  // Create local variables for our image set
  var imgSetId = imageSetInfo.id;
  var imgSetHumanName = imageSetInfo.id;

  // Save our state
  this.state = {
    imagesEqual: imageSetInfo.imagesEqual
  };

  // Generate our image set element
  var imgSetEl = D.UL({'data-image-set': imgSetId}, [
    D.LI([
      // Row title
      this.saveEl('titleEl', D.A({
        class: 'image-set__title',
        href: 'javascript:void 0;', 'data-toggle': 'collapse',
        'data-target': '[data-image-set="' + imgSetId + '"] .image-set__collapse',
        'data-images-equal': imageSetInfo.imagesEqual,
        'aria-controls': imgSetId
      }, imgSetHumanName)),

      // Collapsable container for row
      // DEV: We use `data-id` as `id` has restrictions on characters
      D.DIV({
        // Make our first image set visible
        // DEV: If class names get too complex, use `classnames` library
        class: imageSetInfo.imagesEqual ? 'image-set__collapse collapse well' : 'image-set__collapse collapse in well'
      }, [
        // Action buttons
        D.DIV([
          D.BUTTON({
            class: 'btn btn-default',
            'data-action': 'accept-changes'
          }, '✓ Accept changes'),
          ' ',
          D.BUTTON({
            class: 'btn btn-default',
            'data-action': 'find-similar-images'
            // TODO: Make our button disabled and only enable when an overlay is drawn
            // TODO: When changes are accepted, reset all affected overlays and buttons
            // disabled: 'disabled'
          }, 'Find similar images with selection')
        ]),

        // Image set
        D.TABLE({class: 'table'}, [
          D.THEAD([
            D.TR([
              D.TH('Current:'),
              D.TH('Diff:'),
              D.TH('Ref:')
            ])
          ]),
          D.TBODY([
            D.TR([
              // DEV: We use `width: 33%` to guarantee no widths change when images are loading
              D.TD({style: 'width: 33%'}, [
                this.saveEl('currentImg', D.IMG({
                  'data-compare-type': 'current',
                  src: imageSetInfo.currentImgUrl,
                  style: 'max-width: 100%'
                }))
              ]),
              D.TD({style: 'width: 33%'}, [
                this.saveEl('diffImg', D.IMG({
                  'data-compare-type': 'diff',
                  src: imageSetInfo.diffImgUrl,
                  style: 'max-width: 100%'
                }))
              ]),
              D.TD({style: 'width: 33%'}, [
                this.saveEl('refImg', D.IMG({
                  'data-compare-type': 'ref',
                  src: imageSetInfo.refImgUrl,
                  style: 'max-width: 100%'
                }))
              ])
            ])
          ])
        ])
      ])
    ])
  ]);

  // Bind an overlay to diff image
  // TODO: Explore binding overlay to each of images (that jumps between them)
  // DEV: We use imgSetEl's collapse as a container so it hides on collapse
  var imgOverlay = new Overlay(imgSetEl.querySelector('img[data-compare-type=diff]'), {
    containerEl: imgSetEl.querySelector('.image-set__collapse')
  });

  // Save imgOverlay directly to imgSetEl
  imgSetEl.imgOverlay = imgOverlay;

  // Append our element to the container element
  _containerEl.appendChild(imgSetEl);
}

// Define class level helpers
ImageSet.cachebustImg = function (imgEl) {
  var originalSrc = imgEl.getAttribute('src');
  var newSrc = originalSrc.match(/\?1$/) ? originalSrc + '1' : originalSrc + '?1';
  imgEl.setAttribute('src', newSrc);
};

// Define prototype methods
ImageSet.prototype = {
  acceptChanges: function (acceptedImgBase64) {
    // Fade out diff and reference images to "loading" state
    this.diffImg.classList.add('loading');
    this.refImg.classList.add('loading');

    // Eagerly update our status
    // DEV: This won't be the scenario for update reference image (i.e. we are progressively updating images)
    var oldStatus = this.imagesEqual;
    this.titleEl.setAttribute('data-images-equal', 'true');

    // Make an AJAX call to accept our image
    // http://api.jquery.com/jQuery.ajax/#jqXHR
    var jqXHR = $.post('/update-image-set/' + encodeURIComponent(this.id), {
      ref: acceptedImgBase64
    });

    // If there is an error
    var that = this;
    jqXHR.fail(function handleFail (jqXHR, textStatus, errorThrown) {
      // TODO: Expose error to user so they can retry
      console.error('Error encountered "' + errorThrown + '" when updating image "' + that.id + '"');

      // Reset status to previous state
      // TODO: Test resetting to previous state on failure
      that.titleEl.setAttribute('data-images-equal', oldStatus);
    });

    // When loading completes, remove loading state and update image references
    jqXHR.always(function handleAlways (dataOrJqXHR, textStatus, jqXHROrErrorThrown) {
      that.diffImg.classList.remove('loading');
      that.refImg.classList.remove('loading');
      ImageSet.cachebustImg(that.diffImg);
      ImageSet.cachebustImg(that.refImg);
    });
  },
  saveEl: function (key, el) {
    this[key] = el;
    return el;
  }
};

// Export our constructor
module.exports = ImageSet;
