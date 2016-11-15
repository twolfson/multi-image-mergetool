// Load in our dependencies
// DEV: Re-expose jQuery for Bootstrap
var $ = window.$ = window.jQuery = require('jquery');
void require('bootstrap/dist/js/bootstrap.js');
var D = require('./domo');
var Overlay = require('./overlay');

// TODO: Consider scrollspy for update buttons
// TODO: Consider buttons to expand row of images to full screen
// TODO: Consider magnifying glass zoom on images (e.g. like in ecommerce sites)

// Define our application
function Application(_containerEl, imageSets) {
  // Save our container element for later
  // TODO: Add a `destroy` method which removes element as well as any bindings
  this.containerEl = _containerEl;

  // Generate our document fragment
  // DEV: We use a document fragment instead of the DOM directly to prevent redrawing elements on each append
  var imageSetsDocFrag = D.FRAGMENT();

  // Expose our images
  // TODO: Expose images in tree list like gemini-gui, maybe even simplified variants like GitHub
  //   (e.g. `a/b/c` when only 1 file)
  imageSets.forEach(function createImageSet (imgSet, i) {
    // Create local variables for our image set
    var imgSetId = imgSet.id;
    var imgSetHumanName = imgSet.id;

    // Generate our image set element
    var imgSetEl = D.UL({'data-image-set': imgSetId}, [
      D.LI([
        // Row title
        D.A({
          class: 'image-set__title',
          href: 'javascript:void 0;', 'data-toggle': 'collapse',
          'data-target': '[data-image-set="' + imgSetId + '"] .image-set__collapse',
          'data-images-equal': imgSet.imagesEqual,
          'aria-controls': imgSetId
        }, imgSetHumanName),

        // Collapsable container for row
        // DEV: We use `data-id` as `id` has restrictions on characters
        D.DIV({
          // Make our first image set visible
          // DEV: If class names get too complex, use `classnames` library
          class: imgSet.imagesEqual ? 'image-set__collapse collapse well' : 'image-set__collapse collapse in well'
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
                    src: imgSet.currentImgUrl,
                    style: 'max-width: 100%'
                  })
                ]),
                D.TD({style: 'width: 33%'}, [
                  D.IMG({
                    'data-compare-type': 'diff',
                    src: imgSet.diffImgUrl,
                    style: 'max-width: 100%'
                  })
                ]),
                D.TD({style: 'width: 33%'}, [
                  D.IMG({
                    'data-compare-type': 'ref',
                    src: imgSet.refImgUrl,
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
    imageSetsDocFrag.appendChild(imgSetEl);
  });

  // Apppend our container element
  this.containerEl.appendChild(imageSetsDocFrag);
}

// Define our button bindings
Application.bind = function () {
  // Define cache busting helper
  function cachebustImg($img) {
    var originalSrc = $img.attr('src');
    var newSrc = originalSrc.match(/\?1$/) ? originalSrc + '1' : originalSrc + '?1';
    $img.attr('src', newSrc);
  }

  // Define acceptance and update helpers
  // TODO: Consolidate these helpers
  function acceptImageSetChanges(acceptedImgBase64, imgSetId) {
    // Fade out diff and reference images to "loading" state
    var $imgSet = $('[data-image-set="' + $.escapeSelector(imgSetId) + '"]');
    // assert.strictEqual($imgSet.length, 1);
    var $diffImg = $imgSet.find('[data-compare-type="diff"]');
    var $refImg = $imgSet.find('[data-compare-type="ref"]');
    $diffImg.addClass('loading');
    $refImg.addClass('loading');

    // Eagerly update our status
    // DEV: This won't be the scenario for update reference image (i.e. we are progressively updating images)
    var $imagesEqual = $imgSet.find('[data-images-equal]');
    var oldStatus = $imagesEqual.attr('data-images-equal');
    $imagesEqual.attr('data-images-equal', 'true');

    // Make an AJAX call to accept our image
    // http://api.jquery.com/jQuery.ajax/#jqXHR
    var jqXHR = $.post('/update-image-set/' + encodeURIComponent(imgSetId), {
      ref: acceptedImgBase64
    });

    // If there is an error
    jqXHR.fail(function handleFail (jqXHR, textStatus, errorThrown) {
      // TODO: Expose error to user so they can retry
      console.error('Error encountered "' + errorThrown + '" when updating image "' + imgSetId + '"');

      // Reset status to previous state
      // TODO: Test resetting to previous state on failure
      $imagesEqual.attr('data-images-equal', oldStatus);
    });

    // When loading completes, remove loading state and update image references
    jqXHR.always(function handleAlways (dataOrJqXHR, textStatus, jqXHROrErrorThrown) {
      $diffImg.removeClass('loading');
      $refImg.removeClass('loading');
      cachebustImg($diffImg);
      cachebustImg($refImg);
    });
  }

  function updateReferenceImage(imgBase64, imgSetId) {
    // Fade out diff and reference images to "loading" state
    var $imgSet = $('[data-image-set="' + $.escapeSelector(imgSetId) + '"]');
    // assert.strictEqual($imgSet.length, 1);
    var $diffImg = $imgSet.find('[data-compare-type="diff"]');
    // TODO: We are selecting results table image as well via this selected due to cloneNode
    //   Figure out how to not select it or make results disappear or something
    var $refImg = $imgSet.find('[data-compare-type="ref"]');
    $diffImg.addClass('loading');
    $refImg.addClass('loading');

    // Set status to neutral state
    var $imagesEqual = $imgSet.find('[data-images-equal]');
    var oldStatus = $imagesEqual.attr('data-images-equal');
    $imagesEqual.attr('data-images-equal', 'loading');

    // Make an AJAX call to accept our image
    // http://api.jquery.com/jQuery.ajax/#jqXHR
    var jqXHR = $.post('/update-image-set/' + encodeURIComponent(imgSetId), {
      ref: imgBase64
    });

    // If there is an error
    jqXHR.fail(function handleFail (jqXHR, textStatus, errorThrown) {
      // TODO: Expose error to user so they can retry
      console.error('Error encountered "' + errorThrown + '" when updating image "' + imgSetId + '"');

      // Reset status to previous state
      // TODO: Test resetting to previous state on failure
      $imagesEqual.attr('data-images-equal', oldStatus);
    });

    // When we complete updating
    jqXHR.done(function handleDone (data, textStatus, jqXHR) {
      // Update status to new state
      // data = {imagesEqual: true}
      $imagesEqual.attr('data-images-equal', data.imagesEqual);
    });

    // When loading completes, remove loading state and update image references
    jqXHR.always(function handleAlways (dataOrJqXHR, textStatus, jqXHROrErrorThrown) {
      $diffImg.removeClass('loading');
      $refImg.removeClass('loading');
      cachebustImg($diffImg);
      cachebustImg($refImg);
    });
  }

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
    var $imgSet = $(btnEl).closest('[data-image-set]');
    var imgSetId = $imgSet.data('image-set');
    // assert.strictEqual($imgSet.length, 1);

    // Find the current image
    var $currentImg = $imgSet.find('[data-compare-type="current"]');
    // assert.strictEqual($currentImg.length, 1);

    // Extract base64 content for image
    var base64Data = getBase64Content($currentImg[0]);

    // Run acceptance function
    acceptImageSetChanges(base64Data, imgSetId);
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
      acceptImageSetChanges(originalCurrentImgBase64, similarImgSetId);
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
      updateReferenceImage(base64Data, similarImgSetId);
    });
  });

  $('body').on('click', 'button[data-action="find-similar-images"]', function handleClick (evt) {
    // Find our image set container
    var btnEl = evt.target;
    var $expectedImgSet = $(btnEl).closest('[data-image-set]');
    var expectedImgSetEl = $expectedImgSet[0];
    var expectedImgSetCollapseEl = $expectedImgSet.find('.image-set__collapse')[0];

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
      // Start our performance check (70ms for 200 1024x1600 images)
      console.time('findSelectionMatches');

      // Find our sets of images to update
      var imageSetEls = document.querySelectorAll('[data-image-set]');
      imageSetEls = Array.prototype.slice.call(imageSetEls);

      // Convert image sets into objects so we can add metadata
      var imageSetInfos = imageSetEls.map(function createImageSetInfo (imageSetEl) {
        var retVal = {
          currentImg: imageSetEl.querySelector('[data-compare-type=current]'),
          diffImg: imageSetEl.querySelector('[data-compare-type=diff]'),
          refImg: imageSetEl.querySelector('[data-compare-type=ref]'),
          id: imageSetEl.getAttribute('data-image-set'),
          humanName: imageSetEl.getAttribute('data-image-set')
        };
        if (imageSetEl === expectedImgSetEl) {
          retVal.humanName += ' (current set)';
        }
        return retVal;
      });

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
      expectedDiffImg = expectedDiffImg.cloneNode();
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
      // TODO: Handle only 1 matching image set (i.e. source image) -- should say "No matches found" or similar
      var matchingImageSetInfos = imageSetInfos.filter(function matchImageSetInfo (imageSetInfo) {
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

      // If we have no matching image sets
      // assert.notEqual(matchingImageSetInfos.length, 0,
      //   'Something went horribly wrong when matching images; not even the original is equal to itself');
      if (matchingImageSetInfos.length === 1) {
        resultsEl.appendChild(D.DIV('No similar images found'));
        return;
      }

      // Otherwise, update our count and append our buttons
      resultsEl.querySelector('.results__count').textContent = ' (' + matchingImageSetInfos.length + ')';
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
      bulkUpdateSelection(matchingImageSetInfos);
    }

    function bulkUpdateSelection(imageSetInfos) { // jshint ignore:line
      // Start our performance check (620ms total for 100 1024x1600 images, 400ms seems to be first `drawImage`)
      console.time('bulkUpdateSelection');

      // Find our output targets
      var resultsDocFrag = D.FRAGMENT();

      // Generate and updated ref image for each of our comparisons
      imageSetInfos.forEach(function generateUpdatedRef (imageSetInfo) {
        // Localize our references
        var currentImg = imageSetInfo.currentImg;
        var diffImg = imageSetInfo.diffImg;
        var refImg = imageSetInfo.refImg;

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
        currentImgClone.style.width = '100%';
        updatedDiffCanvasEl.style.width = '100%';
        updatedRefCanvasEl.style.width = '100%';

        // Generate and append result content
        // DEV: We use a document fragment to avoid `n` DOM edits -- instead it's 1
        // DEV: Tables will all use same width due to heuristics
        var resultGroupEl = D.TABLE({
          class: 'table',
          'data-similar-image-set': imageSetInfo.id
        }, [
          D.THEAD([
            D.TR([
              // TODO: Add collapse support like in `gemini-gui`
              D.TH({colspan: 3}, imageSetInfo.humanName)
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
