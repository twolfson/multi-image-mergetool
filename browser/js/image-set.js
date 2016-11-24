// Load in our dependencies
var D = require('./domo');
var Overlay = require('./overlay');

// Deifne our constructor
function ImageSet(_containerEl, imageSetInfo) {
  // Create local variables for our image set
  var imgSetId = imageSetInfo.id;
  var imgSetHumanName = imageSetInfo.id;

  // Generate our image set element
  var imgSetEl = D.UL({'data-image-set': imgSetId}, [
    D.LI([
      // Row title
      D.A({
        class: 'image-set__title',
        href: 'javascript:void 0;', 'data-toggle': 'collapse',
        'data-target': '[data-image-set="' + imgSetId + '"] .image-set__collapse',
        'data-images-equal': imageSetInfo.imagesEqual,
        'aria-controls': imgSetId
      }, imgSetHumanName),

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
                D.IMG({
                  'data-compare-type': 'current',
                  src: imageSetInfo.currentImgUrl,
                  style: 'max-width: 100%'
                })
              ]),
              D.TD({style: 'width: 33%'}, [
                D.IMG({
                  'data-compare-type': 'diff',
                  src: imageSetInfo.diffImgUrl,
                  style: 'max-width: 100%'
                })
              ]),
              D.TD({style: 'width: 33%'}, [
                D.IMG({
                  'data-compare-type': 'ref',
                  src: imageSetInfo.refImgUrl,
                  style: 'max-width: 100%'
                })
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

// Export our constructor
module.exports = ImageSet;
