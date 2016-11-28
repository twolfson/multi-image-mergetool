// Load in our dependencies
var assert = require('assert');
var D = require('./domo');

// Define our constructor
function SimilarImageResults(_containerEl, params) {
  // Start our performance check (620ms total for 100 1024x1600 images, 400ms seems to be first `drawImage`)
  console.time('bulkUpdateSelection');

  // Find our output targets
  var resultsDocFrag = D.FRAGMENT();

  // Localize our parameters
  // DEV: We could generate similar image sets separately but this is to keep performance issues contained
  var targetArea = params.targetArea; assert(targetArea);
  var imageSets = params.imageSets; assert(imageSets);
  var expectedImageSet = params.expectedImageSet; assert(expectedImageSet);

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
    var imageSetHumanName = imageSet.humanName;
    if (imageSet === expectedImageSet) { imageSetHumanName += ' (current set)'; }
    var resultGroupEl = D.TABLE({
      class: 'table',
      'data-similar-image-set': imageSet.id
    }, [
      D.THEAD([
        D.TR([
          // TODO: Add collapse support like in `gemini-gui`
          D.TH({colspan: 3}, imageSetHumanName)
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
  _containerEl.appendChild(resultsDocFrag);

  // End our performance check
  console.timeEnd('bulkUpdateSelection');
}

// Export our constructor
module.exports = SimilarImageResults;
