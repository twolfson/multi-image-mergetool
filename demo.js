(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./base-component":2,"./image-set":5,"./similar-image-results":8,"assert":12,"bootstrap/dist/js/bootstrap.js":11,"hyperscript":20,"hyperscript-helpers":19,"jquery":24}],2:[function(require,module,exports){
// Load in our dependencies
var assert = require('assert');
var $ = require('jquery');
var Model = require('backbone').Model;
var View = require('backbone').View;

// Define our base component
var BaseComponent = View.extend({
  constructor: function (options) {
    // Override `render` so it only runs once
    assert(this.render, 'Expected `render()` to be defined but it wasn\'t');
    this._render = this.render;
    this.render = this._renderOnce;
    this.renderedOnce = false;

    // Define state for our component
    this.state = new Model();
    this._sections = {};

    // Call our default constructor (invokes initialize)
    View.prototype.constructor.apply(this, arguments);
  },

  // Rendering
  _renderOnce: function () {
    // Verify render hasn't been called before
    assert.strictEqual(this.renderedOnce, false, '`this.render()` has already been called. ' +
      'Please manage all dynamic state via `.onStateChange` events');
    this.renderedOnce = true;

    // Run our render function
    this._render.apply(this, arguments);
  },
  saveEl: function (key, el) {
    this[key] = el;
    return el;
  },
  saveSection: function (key, fn) {
    // Verify we aren't double saving
    assert.strictEqual(this._sections[key], undefined,
      '`saveSection` was called by the same key "' + key + '" multiple times. ' +
      'It can only be generated once, please use `replaceSection` instead');

    // Save our section function and call an update on it
    this._sections[key] = {
      fn: fn,
      results: null
    };
    return this.replaceSection(key);
  },
  replaceSection: function (key) {
    // Verify we have our section
    var section = this._sections[key];
    assert(section, '`replaceSection` has no key "' + key + '". Please verify `saveSection` was called first');

    // Replace our results
    var results = section.fn.call(this);
    $(section.results).empty().append(results);
    section.results = results;

    // Return our results
    return results;
  },

  // State managment
  setState: function () {
    // Call normal `set` actions for state
    return this.state.set.apply(this.state, arguments);
  },
  getState: function () {
    // Call normal `get` actions for state
    return this.state.get.apply(this.state, arguments);
  },
  onStateChange: function (key, fn) {
    // If there is no key, bind to all state changes
    // TODO: Add tests for not persisting unchanged values after multiple sets
    var that = this;
    if (typeof key === 'function') {
      fn = key;
      this.state.on('change', function handleEntireChange (state) {
        var previousState = state.previousAttributes();
        var newState = state.toJSON();
        fn.call(that, previousState, newState);
      });
    // Otherwise, bind to a specific value
    } else {
      this.state.on('change:' + key, function handlePropertyChange (state) {
        var previousProperty = state.previous(key);
        var newProperty = state.get(key);
        fn.call(that, previousProperty, newProperty);
      });
    }
  }
});

// Export our component
module.exports = BaseComponent;

},{"assert":12,"backbone":10,"jquery":24}],3:[function(require,module,exports){
(function (global){
// Script for making our demo work
// Load in our dependencies
var assert = require('assert');
var _ = require('underscore');
var GlobalState = require('./global-state');
var ImageSet = require('./image-set');
var utils = require('./utils');
var SimilarImageResults = require('./similar-image-results');
var sinonUtils = require('../../test/utils/sinon');
var xhrResponses = require('../../test/test-files/http-responses/xhr');

// Define our demo bindings
window.runDemo = exports.runDemo = function (options) {
  // If we are running live, overwrite Mocha's contents
  if (options && options.overwriteMocha) {
    global.before = function (fn) { fn(); };
    global.after = function (fn) { /* Don't run after functions */ };
  }

  // Start a Sinon server that approves all images
  sinonUtils.mockXHR([{
    method: xhrResponses.UPDATE_IMAGE_SET_APPROVE.method,
    url: xhrResponses.UPDATE_IMAGE_SET_APPROVE.url,
    fn: function (request) {
      // Resolve our image set
      var imageSetMatch = request.url.match(/\/update-image-set\/([^\/]+)/);
      assert(imageSetMatch, 'Unable to extract ImageSet if from "' + request.url);
      var imageSet = GlobalState.getImageSetById(decodeURIComponent(imageSetMatch[1]));
      assert(imageSet, 'Unable to find image set by id "' + imageSetMatch[1] + '"');

      // Convert our image into its base64 equivalent and compare them
      // DEV: We are using a strict comparison which banks on canvas encoding consistently across different content
      // DEV: We cannot generate a new image/wait for it to load as Sinon requires synchronous responses
      //   https://github.com/sinonjs/sinon/blob/v1.17.6/lib/sinon/util/fake_server.js#L204-L206
      //   https://github.com/sinonjs/sinon/blob/v1.17.6/lib/sinon/util/fake_server.js#L57-L61
      var currentImg = imageSet.currentImg; assert(currentImg);
      var currentImgBase64 = utils.getBase64Content(currentImg);
      var newRefBase64Data = decodeURIComponent(request.requestBody.replace('ref=', ''));
      assert(newRefBase64Data.indexOf('data:image/png;base64,') === 0);
      var imagesMatch = currentImgBase64 === newRefBase64Data;

      // Reply to our request
      // http://sinonjs.org/docs/#respond
      var response = imagesMatch ? xhrResponses.UPDATE_IMAGE_SET_APPROVE : xhrResponses.UPDATE_IMAGE_SET_DISAPPROVE;
      request.respond.apply(request, sinonUtils.getMockXHRResponse(response));
    }
  }]);

  // Mock over ImageSet accept/update to receieve additional `diff` base64
  // DEV: We don't handle both data sets normally as it's computationally expensive
  var _acceptChanges = ImageSet.prototype.acceptChanges;
  var _updateReferenceImage = ImageSet.prototype.updateReferenceImage;
  function updateImageSetURLs(imageSet, diffBase64Data, refBase64Data) {
    // Overwrite image URLs for new images
    assert(diffBase64Data && refBase64Data, 'Expected both diffBase64Data and refBase64Data but didn\'t receive both');
    imageSet.imageSetInfo = _.defaults({
      diffImageUrl: diffBase64Data,
      refImageUrl: refBase64Data
    }, imageSet.imageSetInfo);

    // If we have images, then update their src
    if (imageSet.diffImg) { imageSet.diffImg.setAttribute('src', diffBase64Data); }
    if (imageSet.refImg) { imageSet.refImg.setAttribute('src', refBase64Data); }
  }
  sinonUtils.contextFreeStub(ImageSet.prototype, 'acceptChanges',
      function acceptChangesStub (diffBase64Data, refBase64Data) {
    // Call custom hook to update image URLs
    updateImageSetURLs(this, diffBase64Data, refBase64Data);

    // Run normal method
    return _acceptChanges.call(this, refBase64Data);
  });
  sinonUtils.contextFreeStub(ImageSet.prototype, 'updateReferenceImage',
      function updateReferenceImageStub (diffBase64Data, refBase64Data) {
    updateImageSetURLs(this, diffBase64Data, refBase64Data);
    return _updateReferenceImage.call(this, refBase64Data);
  });
  // Silence cache busting in favor of directly swapping URLs in accept/update stubs
  sinonUtils.contextFreeStub(ImageSet, 'cachebustImg');

  // Mock over ImageSet/SimilarImageResults to send additional `diff` base64
  sinonUtils.contextFreeStub(ImageSet, '_getAcceptChangesArgs', function _getAcceptChangesArgsStub (imageSet) {
    // Return current base64 content as both `[diff, ref]`
    var currentBase64Data = utils.getBase64Content(imageSet.currentImg);
    return [currentBase64Data, currentBase64Data];
  });
  sinonUtils.contextFreeStub(SimilarImageResults, '_getAcceptChangesArgs',
      function _getAcceptChangesArgsStub ($similarImageSet) {
    // Find and return our original base64 data as both `[diff, ref]`
    var $originalCurrentImg = $similarImageSet.find('.original-current');
    assert.strictEqual($originalCurrentImg.length, 1);
    var originalCurrentImgBase64 = utils.getBase64Content($originalCurrentImg[0]);
    return [originalCurrentImgBase64, originalCurrentImgBase64];
  });
  sinonUtils.contextFreeStub(SimilarImageResults, '_getUpdateReferenceImageArgs',
      function _getUpdateReferenceImageArgsStub ($similarImageSet) {
    // Find and return updated base64 content
    var $updatedDiffCanvas = $similarImageSet.find('.updated-diff');
    assert.strictEqual($updatedDiffCanvas.length, 1);
    var updatedDiffBase64Data = $updatedDiffCanvas[0].toDataURL('image/png');
    var $updatedRefCanvas = $similarImageSet.find('.updated-ref');
    assert.strictEqual($updatedRefCanvas.length, 1);
    var updatedRefBase64Data = $updatedRefCanvas[0].toDataURL('image/png');
    return [updatedDiffBase64Data, updatedRefBase64Data];
  });
};

// Load in normal script
void require('./index.js');

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../test/test-files/http-responses/xhr":57,"../../test/utils/sinon":58,"./global-state":4,"./image-set":5,"./index.js":6,"./similar-image-results":8,"./utils":9,"assert":12,"underscore":53}],4:[function(require,module,exports){
// Load in our dependencies
var assert = require('assert');

// Define our catch-all global state
module.exports = {
  // DEV: `_state` will be reset via `reset` below
  _state: undefined,
  reset: function () {
    this._state = {
      imageSets: [],
      imageSetsById: {}
    };
  },
  addImageSet: function (imageSet) {
    assert(imageSet.id, 'Unable to find `id` property of `imageSet`. ' +
      'Please verify an `ImageSet` is being passed to `GlobalState.addImageSet`');
    var imageSetsById = this._state.imageSetsById;
    assert.strictEqual(imageSetsById[imageSet.id], undefined,
      'An image set with id "' + imageSet.id + '" is already registered');
    this._state.imageSets.push(imageSet);
    imageSetsById[imageSet.id] = imageSet;
  },
  getImageSets: function () {
    return this._state.imageSets;
  },
  getImageSetById: function (id) {
    return this._state.imageSetsById[id];
  },
  fetchImageSetById: function (id) {
    var imageSet = this.getImageSetById(id);
    assert(imageSet, 'Unable to find image set by id "' + id + '"');
    return imageSet;
  }
};

// Reset our state
module.exports.reset();

},{"assert":12}],5:[function(require,module,exports){
// Load in our dependencies
var $ = window.$ = window.jQuery = require('jquery');
var assert = require('assert');
var _ = require('underscore');
var h = require('hyperscript-helpers')(require('hyperscript'));
var classnames = require('classnames');
var BaseComponent = require('./base-component');
var GlobalState = require('./global-state');
var Overlay = require('./overlay');
var SimilarImageResults = require('./similar-image-results');
var utils = require('./utils');

// Define our constants
var IN_PROGRESS = 'IN_PROGRESS';
var NONE = 'NONE';

// Define our constructor
var ImageSet = BaseComponent.extend({
  initialize: function (options) {
    // Save parameters for later
    var imageSetInfo = this.imageSetInfo = options.imageSetInfo; assert(imageSetInfo);

    // Create one-off quick-reference variables
    this.id = imageSetInfo.id;
    this.humanName = imageSetInfo.id;

    // Save our state
    this.setState({
      eagerStatus: null,
      findSimilarImages: false,
      imagesEqual: imageSetInfo.imagesEqual,
      isNew: imageSetInfo.isNew,
      xhrState: NONE,
      targetArea: null
    });

    // Run our render method
    // TODO: Add destroy method so we can unreference element
    this.render();

    // Register our image set to the global state
    GlobalState.addImageSet(this);
  }
});

// Define class level helpers
// DEV: We expose argument retriever for easier demo mocking
ImageSet._getAcceptChangesArgs = function (imageSet) {
  var base64Data = utils.getBase64Content(imageSet.currentImg);
  return [base64Data];
};
ImageSet.bindOnce = function () {
  // Set up image acceptance binding
  $('body').on('click', 'button[data-action="accept-changes"]', function handleClick (evt) {
    // Resolve our image set
    var imageSet = ImageSet.fetchByEvent(evt);

    // Accept base64 content for image
    var acceptChangesArgs = ImageSet._getAcceptChangesArgs(imageSet);
    imageSet.acceptChanges.apply(imageSet, acceptChangesArgs);
  });

  $('body').on('click', 'button[data-action="find-similar-images"]', function handleClick (evt) {
    // Find our image set's similar images
    var imageSet = ImageSet.fetchByEvent(evt);
    imageSet.findSimilarImages();
  });
};
ImageSet.cachebustImg = function (imgEl) {
  var originalSrc = imgEl.getAttribute('src');
  var newSrc = originalSrc.match(/\?1$/) ? originalSrc + '1' : originalSrc + '?1';
  imgEl.setAttribute('src', newSrc);
};
ImageSet.fetchByEvent = function (evt) {
  // Resolve our id
  var targetEl = evt.target;
  var $imageSet = $(targetEl).closest('[data-image-set]');
  var imageSetId = $imageSet.data('image-set');

  // Return our image set
  return GlobalState.fetchImageSetById(imageSetId);
};

// Define prototype methods
ImageSet.prototype = _.extend(ImageSet.prototype, {
  isNew: function () {
    // Expose `isNew` state for external use
    return this.getState('isNew');
  },
  render: function () {
    // Create local variables for our image set
    var imageSetId = this.id;
    var imageSetHumanName = this.humanName;
    this.renderedAlready = true;
    this.el.setAttribute('data-image-set', imageSetId);

    // Row title
    // TODO: Move from link to button styled as link so we can ditch `href`
    this.el.appendChild(this.saveEl('titleEl', h.a({
      className: 'image-set__title',
      href: 'javascript:void 0;', 'data-toggle': 'collapse',
      'data-target': '[data-image-set="' + imageSetId + '"] .image-set__collapse',
      'data-images-equal': this.getState('imagesEqual'),
      attrs: {'aria-controls': imageSetId}
    }, imageSetHumanName)));

    // Collapsable container for row
    // DEV: We use `data-id` as `id` has restrictions on characters
    // DEV: We eagerly save `contentsEl` so overlays can reference their container element
    this.el.appendChild(this.saveEl('contentsEl', h.div({
      // Make our first image set visible
      className: classnames('image-set__collapse', 'collapse', 'well', {in: !this.getState('imagesEqual')})
    })));

    // Action buttons
    this.contentsEl.appendChild(h.div([
      h.button({
        className: 'btn btn-default',
        'data-action': 'accept-changes'
      }, '✓ Accept changes'),
      ' ',
      h.button({
        className: 'btn btn-default',
        'data-action': 'find-similar-images'
        // TODO: Make our button disabled and only enable when an overlay is drawn
        // TODO: When changes are accepted, reset all affected overlays and buttons
        // disabled: 'disabled'
      }, 'Find similar images with selection')
    ]));

    // Image set
    this.contentsEl.appendChild(h.table({className: 'table'}, [
      h.thead([
        h.tr([
          h.th(null, 'Current:'),
          h.th(null, 'Diff:'),
          h.th(null, 'Ref:')
        ])
      ]),
      h.tbody([
        h.tr([
          // DEV: We use `width: 33%` to guarantee no widths change when images are loading
          h.td({style: 'width: 33%'}, [
            this.saveEl('currentImg', h.img({
              'data-compare-type': 'current',
              src: this.imageSetInfo.currentImageUrl,
              style: 'max-width: 100%'
            }))
          ]),
          h.td({style: 'width: 33%'}, [
            this.saveSection('diffImg', function () {
              if (this.getState('isNew')) {
                return h.em('No diff image yet, image set is new. Please accept changes first');
              } else {
                // Generate our image
                var retVal = this.saveEl('diffImg', h.img({
                  'data-compare-type': 'diff',
                  src: this.imageSetInfo.diffImageUrl,
                  style: 'max-width: 100%'
                }));

                // Bind an overlay to diff image
                // TODO: Explore binding overlay to each of images (that jumps between them)
                // DEV: We use our collapse as a container so it hides on collapse
                // DEV: We assert to prevent overlay generation being contained in `this.contentsEl` generation
                assert(this.contentsEl);
                this.imgOverlay = new Overlay(this.diffImg, {
                  containerEl: this.contentsEl
                });

                // Return our retVal
                return retVal;
              }
            })
          ]),
          h.td({style: 'width: 33%'}, [
            this.saveSection('refImg', function () {
              if (this.getState('isNew')) {
                return h.em('No ref image yet, image set is new. Please accept changes first');
              } else {
                return this.saveEl('refImg', h.img({
                  'data-compare-type': 'ref',
                  src: this.imageSetInfo.refImageUrl,
                  style: 'max-width: 100%'
                }));
              }
            })
          ])
        ])
      ])
    ]));

    // When our XHR state changes (e.g. updating, completed updating)
    this.onStateChange(function handleChange (prevState, newState) {
      // If our XHR state is updating
      if (prevState.xhrState !== newState.xhrState) {
        // If our XHR state
        if (newState.xhrState === IN_PROGRESS) {
          // Fade out diff and reference images to "loading" state
          if (this.diffImg) { this.diffImg.classList.add('loading'); }
          if (this.refImg) { this.refImg.classList.add('loading'); }

          // Update our status to eager status
          this.titleEl.setAttribute('data-images-equal', this.getState('eagerStatus'));
        // Otherwise (update completed)
        } else {
          // If our image set was new, re-render our images
          if (prevState.isNew) {
            this.replaceSection('diffImg');
            this.replaceSection('refImg');
          }

          // Remove loading classes
          this.diffImg.classList.remove('loading');
          this.refImg.classList.remove('loading');

          // Use actual status as status
          this.titleEl.setAttribute('data-images-equal', this.getState('imagesEqual'));

          // Cachebust our images
          ImageSet.cachebustImg(this.diffImg);
          ImageSet.cachebustImg(this.refImg);
        }
      }
    });

    // When we toggle finding similar images/not
    this.onStateChange('findSimilarImages', function handleStateChange (prevVal, newVal) {
      // Remove previously existing content
      // TODO: Relocate removal of results el outside of `this.state` check -- it should be always
      if (this._resultsEl) {
        this.contentsEl.removeChild(this._resultsEl);
        delete this._resultsEl;
      }

      // If we are generating results, then populate them
      // DEV: We could generate similar image sets separately but this is to keep performance issues contained
      if (newVal !== false) {
        var resultsEl = this._resultsEl = h.div({className: 'results'});
        this.contentsEl.appendChild(resultsEl);
        void new SimilarImageResults({
          el: resultsEl,
          targetArea: this.getState('targetArea'),
          expectedImageSet: this
        });
      }
    });
  },
  acceptChanges: function (imgBase64) {
    this._updateReferenceImage(imgBase64, 'true');
  },
  findSimilarImages: function () {
    // Localize our expected diff img
    var expectedDiffImg = this.diffImg;

    // Find and adjust our target area based on scaling
    // TODO: Be sure to test target area scaling for both matching and updated diffs
    // TODO: Move `targetArea` to `getTargetArea` method
    var targetArea = this.imgOverlay.overlayInfo.relative;
    var scaleRatio = expectedDiffImg.naturalWidth / expectedDiffImg.width;
    targetArea = {
      width: Math.min(Math.ceil(scaleRatio * targetArea.width), expectedDiffImg.naturalWidth),
      height: Math.min(Math.ceil(scaleRatio * targetArea.height), expectedDiffImg.naturalHeight),
      left: Math.max(Math.floor(scaleRatio * targetArea.left), 0),
      top: Math.max(Math.floor(scaleRatio * targetArea.top), 0)
    };

    // Save our image set info and trigger results rendering
    // TODO: Unset `targetArea` values on destroy/results removal
    // DEV: We use `Date.now()` to guarantee a different value on multiple presses
    this.setState({
      targetArea: targetArea,
      findSimilarImages: Date.now()
    });
  },
  _updateReferenceImage: function (imgBase64, eagerStatus) {
    // Set our state as loading and an eager status
    // DEV: For an acceptance request, we will eagerly update to 'imagesEqual: true'
    this.setState({
      eagerStatus: eagerStatus || 'loading',
      xhrState: IN_PROGRESS
    });

    // Make an AJAX call to accept our image
    // http://api.jquery.com/jQuery.ajax/#jqXHR
    var jqXHR = $.post('/update-image-set/' + encodeURIComponent(this.id), {
      ref: imgBase64
    });

    // If there is an error
    var that = this;
    jqXHR.fail(function handleFail (jqXHR, textStatus, errorThrown) {
      // TODO: Expose error to user so they can retry
      console.error('Error encountered "' + errorThrown + '" when updating image "' + that.id + '"');

      // Remove loading state (triggers re-render)
      that.setState({
        eagerStatus: null,
        xhrState: NONE
      });
    });

    // When we complete updating
    jqXHR.done(function handleDone (data, textStatus, jqXHR) {
      // Save our new state (triggers re-render)
      // data = {imagesEqual: true}
      that.setState({
        eagerStatus: null,
        imagesEqual: data.imagesEqual,
        isNew: false,
        xhrState: NONE
      });
    });
  },
  updateReferenceImage: function (imgBase64) {
    this._updateReferenceImage(imgBase64);
  }
});

// Export our constructor
module.exports = ImageSet;

},{"./base-component":2,"./global-state":4,"./overlay":7,"./similar-image-results":8,"./utils":9,"assert":12,"classnames":18,"hyperscript":20,"hyperscript-helpers":19,"jquery":24,"underscore":53}],6:[function(require,module,exports){
// Expose our Node.js dependencies to window
window.Application = require('./application');

},{"./application":1}],7:[function(require,module,exports){
// Load in our dependencies
var Unidragger = require('unidragger');

// Define our overlay class
function Overlay(targetEl, options) {
  // Fallback our options
  options = options || {};

  // Bind our overlay to the element
  this.targetEl = targetEl;
  this.handles = [targetEl];
  this.bindHandles();

  // Resolve our container
  this.containerEl = options.containerEl || document.body;

  // Add an overlay binding class to our element
  targetEl.className += ' overlay-bound';
}
// Inherit prototype from Unidragger
Overlay.prototype = Object.create(Unidragger.prototype);
Overlay.prototype.dragStart = function (evt, pointer) {
  // If we don't have an overlay element, create one now
  if (!this.overlayEl) {
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'overlay';
    this.containerEl.appendChild(this.overlayEl);
  }

  // Calculate target dimensions
  // TODO: For wider browser support, see what `draggabilly` does (prob uses `get-size`)
  // bounds = {x, y, width, height, top, right, bottom, left}
  // http://youmightnotneedjquery.com/#offset
  // DEV: This is our poor man's `_.extend`
  // DEV: We resolve target dimensions on drag start to prevent boundary issues
  //   (e.g. element was initially hidden/collapsed)
  var _bounds = this.targetEl.getBoundingClientRect();
  var bounds = this.bounds = {};
  ['x', 'y', 'width', 'height', 'top', 'right', 'bottom', 'left'].forEach(function copyKey (key) {
    bounds[key] = _bounds[key];
  });
  this.bounds.top += document.documentElement.scrollTop + document.body.scrollTop;
  this.bounds.left += document.documentElement.scrollLeft + document.body.scrollLeft;

  // Update our box position
  this.update(evt, pointer, {x: 0, y: 0});
};
Overlay.prototype.update = function (evt, pointer, moveVector) {
  // If the move vector's X dimension is normal
  // DEV: We use `pointerDownPoint` instead of `dragStartPoint` for better cursor positioning
  var left, top, width, height;
  if (moveVector.x >= 0) {
    left = this.pointerDownPoint.x;
    width = moveVector.x;
  // Otherwise (inverted), use opposite parameters)
  } else {
    // DEV: Technically we are subtracting moveVector as it's a negative value
    left = this.pointerDownPoint.x + moveVector.x;
    width = (-1 * moveVector.x);
  }

  // Similar behavior for Y dimension
  if (moveVector.y >= 0) {
    top = this.pointerDownPoint.y;
    height = moveVector.y;
  } else {
    top = this.pointerDownPoint.y + moveVector.y;
    height = (-1 * moveVector.y);
  }

  // Restrict our dimensions so we don't go out of bounds
  // DEV: We limit top/left first as height/width offsets are dependent
  if (top < this.bounds.top) {
    // Remove excess distance from height to account for overflow
    // height += 100 - 200 /* higher on page - lower on page */;
    height += top - this.bounds.top;
    top = this.bounds.top;
  }
  if (left < this.bounds.left) {
    width += left - this.bounds.left;
    left = this.bounds.left;
  }
  // bottomEdgeFromTop = 100 + 800 /* 900 */
  var bottomEdgeFromTop = this.bounds.top + this.bounds.height;
  if (top + height > bottomEdgeFromTop) {
    // height = 900 - 300 /* 600 */
    height = bottomEdgeFromTop - top;
  }
  var rightEdgeFromLeft = this.bounds.left + this.bounds.width;
  if (left + width > rightEdgeFromLeft) {
    width = rightEdgeFromLeft - left;
  }

  // Update our element position
  this.overlayEl.style.left = left + 'px';
  this.overlayEl.style.width = width + 'px';
  this.overlayEl.style.top = top + 'px';
  this.overlayEl.style.height = height + 'px';

  // Emit an update event
  // TODO: Make sure we erase overlayInfo on unbind
  this.overlayInfo = {
    absolute: {
      left: left,
      width: width,
      top: top,
      height: height
    },
    relative: {
      left: left - this.bounds.left,
      width: width,
      top: top - this.bounds.top,
      height: height
    }
  };
  this.emitEvent('change:overlay', [evt, pointer, this.overlayInfo]);
};
Overlay.prototype.dragMove = function (evt, pointer, moveVector) {
  this.update(evt, pointer, moveVector);
};

// Export our overlay
module.exports = Overlay;

},{"unidragger":56}],8:[function(require,module,exports){
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

// Define our bindings
// DEV: We use argument fetchers for easier mocking in demo
SimilarImageResults._getAcceptChangesArgs = function ($similarImageSet) {
  // Find and return our original current image
  var $originalCurrentImg = $similarImageSet.find('.original-current');
  assert.strictEqual($originalCurrentImg.length, 1);
  var originalCurrentImgBase64 = utils.getBase64Content($originalCurrentImg[0]);
  return [originalCurrentImgBase64];
};
SimilarImageResults._getUpdateReferenceImageArgs = function ($similarImageSet) {
  // Extract updated base64 content
  var $updatedRefCanvas = $similarImageSet.find('.updated-ref');
  assert.strictEqual($updatedRefCanvas.length, 1);
  var base64Data = $updatedRefCanvas[0].toDataURL('image/png');
  return [base64Data];
};
SimilarImageResults.bindOnce = function () {
  function findSelectedSimilarImageSets(evt) {
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
  }

  $('body').on('click', 'button[data-action="accept-similar-images"]', function handleClick (evt) {
    // Resolve our similar image sets
    var $selectedSimilarImageSets = findSelectedSimilarImageSets(evt);

    // Accept our image set based on its selection
    $selectedSimilarImageSets.each(function updateImageSet (i, similarImageSetEl) {
      // Move back to jQuery collection
      var $similarImageSet = $(similarImageSetEl);
      var similarImageSetId = $similarImageSet.data('similar-image-set');

      // Run accept function
      // TODO: Remove results when all loaded
      var acceptChangesArgs = SimilarImageResults._getAcceptChangesArgs($similarImageSet);
      var imageSet = GlobalState.fetchImageSetById(similarImageSetId);
      imageSet.acceptChanges.apply(imageSet, acceptChangesArgs);
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

      // Run update function
      // TODO: Remove results when all loaded
      var updateReferenceImageArgs = SimilarImageResults._getUpdateReferenceImageArgs($similarImageSet);
      var imageSet = GlobalState.fetchImageSetById(similarImageSetId);
      imageSet.updateReferenceImage.apply(imageSet, updateReferenceImageArgs);
    });
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


},{"./base-component":2,"./global-state":4,"./utils":9,"assert":12,"hyperscript":20,"hyperscript-helpers":19,"jquery":24,"underscore":53}],9:[function(require,module,exports){
// Define base64 content helper
var base64CanvasEl = document.createElement('canvas');
var base64Context = base64CanvasEl.getContext('2d');
exports.getBase64Content = function (imgEl) {
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
};

},{}],10:[function(require,module,exports){
(function (global){
//     Backbone.js 1.3.3

//     (c) 2010-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(factory) {

  // Establish the root object, `window` (`self`) in the browser, or `global` on the server.
  // We use `self` instead of `window` for `WebWorker` support.
  var root = (typeof self == 'object' && self.self === self && self) ||
            (typeof global == 'object' && global.global === global && global);

  // Set up Backbone appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'jquery', 'exports'], function(_, $, exports) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backbone.
      root.Backbone = factory(root, exports, _, $);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore'), $;
    try { $ = require('jquery'); } catch (e) {}
    factory(root, exports, _, $);

  // Finally, as a browser global.
  } else {
    root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
  }

})(function(root, Backbone, _, $) {

  // Initial Setup
  // -------------

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create a local reference to a common array method we'll want to use later.
  var slice = Array.prototype.slice;

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.3.3';

  // For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
  // the `$` variable.
  Backbone.$ = $;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PATCH"`, `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... this will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Proxy Backbone class methods to Underscore functions, wrapping the model's
  // `attributes` object or collection's `models` array behind the scenes.
  //
  // collection.filter(function(model) { return model.get('age') > 10 });
  // collection.each(this.addView);
  //
  // `Function#apply` can be slow so we use the method's arg count, if we know it.
  var addMethod = function(length, method, attribute) {
    switch (length) {
      case 1: return function() {
        return _[method](this[attribute]);
      };
      case 2: return function(value) {
        return _[method](this[attribute], value);
      };
      case 3: return function(iteratee, context) {
        return _[method](this[attribute], cb(iteratee, this), context);
      };
      case 4: return function(iteratee, defaultVal, context) {
        return _[method](this[attribute], cb(iteratee, this), defaultVal, context);
      };
      default: return function() {
        var args = slice.call(arguments);
        args.unshift(this[attribute]);
        return _[method].apply(_, args);
      };
    }
  };
  var addUnderscoreMethods = function(Class, methods, attribute) {
    _.each(methods, function(length, method) {
      if (_[method]) Class.prototype[method] = addMethod(length, method, attribute);
    });
  };

  // Support `collection.sortBy('attr')` and `collection.findWhere({id: 1})`.
  var cb = function(iteratee, instance) {
    if (_.isFunction(iteratee)) return iteratee;
    if (_.isObject(iteratee) && !instance._isModel(iteratee)) return modelMatcher(iteratee);
    if (_.isString(iteratee)) return function(model) { return model.get(iteratee); };
    return iteratee;
  };
  var modelMatcher = function(attrs) {
    var matcher = _.matches(attrs);
    return function(model) {
      return matcher(model.attributes);
    };
  };

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // a custom event channel. You may bind a callback to an event with `on` or
  // remove with `off`; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {};

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Iterates over the standard `event, callback` (as well as the fancy multiple
  // space-separated events `"change blur", callback` and jQuery-style event
  // maps `{event: callback}`).
  var eventsApi = function(iteratee, events, name, callback, opts) {
    var i = 0, names;
    if (name && typeof name === 'object') {
      // Handle event maps.
      if (callback !== void 0 && 'context' in opts && opts.context === void 0) opts.context = callback;
      for (names = _.keys(name); i < names.length ; i++) {
        events = eventsApi(iteratee, events, names[i], name[names[i]], opts);
      }
    } else if (name && eventSplitter.test(name)) {
      // Handle space-separated event names by delegating them individually.
      for (names = name.split(eventSplitter); i < names.length; i++) {
        events = iteratee(events, names[i], callback, opts);
      }
    } else {
      // Finally, standard events.
      events = iteratee(events, name, callback, opts);
    }
    return events;
  };

  // Bind an event to a `callback` function. Passing `"all"` will bind
  // the callback to all events fired.
  Events.on = function(name, callback, context) {
    return internalOn(this, name, callback, context);
  };

  // Guard the `listening` argument from the public API.
  var internalOn = function(obj, name, callback, context, listening) {
    obj._events = eventsApi(onApi, obj._events || {}, name, callback, {
      context: context,
      ctx: obj,
      listening: listening
    });

    if (listening) {
      var listeners = obj._listeners || (obj._listeners = {});
      listeners[listening.id] = listening;
    }

    return obj;
  };

  // Inversion-of-control versions of `on`. Tell *this* object to listen to
  // an event in another object... keeping track of what it's listening to
  // for easier unbinding later.
  Events.listenTo = function(obj, name, callback) {
    if (!obj) return this;
    var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
    var listeningTo = this._listeningTo || (this._listeningTo = {});
    var listening = listeningTo[id];

    // This object is not listening to any other events on `obj` yet.
    // Setup the necessary references to track the listening callbacks.
    if (!listening) {
      var thisId = this._listenId || (this._listenId = _.uniqueId('l'));
      listening = listeningTo[id] = {obj: obj, objId: id, id: thisId, listeningTo: listeningTo, count: 0};
    }

    // Bind callbacks on obj, and keep track of them on listening.
    internalOn(obj, name, callback, this, listening);
    return this;
  };

  // The reducing API that adds a callback to the `events` object.
  var onApi = function(events, name, callback, options) {
    if (callback) {
      var handlers = events[name] || (events[name] = []);
      var context = options.context, ctx = options.ctx, listening = options.listening;
      if (listening) listening.count++;

      handlers.push({callback: callback, context: context, ctx: context || ctx, listening: listening});
    }
    return events;
  };

  // Remove one or many callbacks. If `context` is null, removes all
  // callbacks with that function. If `callback` is null, removes all
  // callbacks for the event. If `name` is null, removes all bound
  // callbacks for all events.
  Events.off = function(name, callback, context) {
    if (!this._events) return this;
    this._events = eventsApi(offApi, this._events, name, callback, {
      context: context,
      listeners: this._listeners
    });
    return this;
  };

  // Tell this object to stop listening to either specific events ... or
  // to every object it's currently listening to.
  Events.stopListening = function(obj, name, callback) {
    var listeningTo = this._listeningTo;
    if (!listeningTo) return this;

    var ids = obj ? [obj._listenId] : _.keys(listeningTo);

    for (var i = 0; i < ids.length; i++) {
      var listening = listeningTo[ids[i]];

      // If listening doesn't exist, this object is not currently
      // listening to obj. Break out early.
      if (!listening) break;

      listening.obj.off(name, callback, this);
    }

    return this;
  };

  // The reducing API that removes a callback from the `events` object.
  var offApi = function(events, name, callback, options) {
    if (!events) return;

    var i = 0, listening;
    var context = options.context, listeners = options.listeners;

    // Delete all events listeners and "drop" events.
    if (!name && !callback && !context) {
      var ids = _.keys(listeners);
      for (; i < ids.length; i++) {
        listening = listeners[ids[i]];
        delete listeners[listening.id];
        delete listening.listeningTo[listening.objId];
      }
      return;
    }

    var names = name ? [name] : _.keys(events);
    for (; i < names.length; i++) {
      name = names[i];
      var handlers = events[name];

      // Bail out if there are no events stored.
      if (!handlers) break;

      // Replace events if there are any remaining.  Otherwise, clean up.
      var remaining = [];
      for (var j = 0; j < handlers.length; j++) {
        var handler = handlers[j];
        if (
          callback && callback !== handler.callback &&
            callback !== handler.callback._callback ||
              context && context !== handler.context
        ) {
          remaining.push(handler);
        } else {
          listening = handler.listening;
          if (listening && --listening.count === 0) {
            delete listeners[listening.id];
            delete listening.listeningTo[listening.objId];
          }
        }
      }

      // Update tail event if the list has any events.  Otherwise, clean up.
      if (remaining.length) {
        events[name] = remaining;
      } else {
        delete events[name];
      }
    }
    return events;
  };

  // Bind an event to only be triggered a single time. After the first time
  // the callback is invoked, its listener will be removed. If multiple events
  // are passed in using the space-separated syntax, the handler will fire
  // once for each event, not once for a combination of all events.
  Events.once = function(name, callback, context) {
    // Map the event into a `{event: once}` object.
    var events = eventsApi(onceMap, {}, name, callback, _.bind(this.off, this));
    if (typeof name === 'string' && context == null) callback = void 0;
    return this.on(events, callback, context);
  };

  // Inversion-of-control versions of `once`.
  Events.listenToOnce = function(obj, name, callback) {
    // Map the event into a `{event: once}` object.
    var events = eventsApi(onceMap, {}, name, callback, _.bind(this.stopListening, this, obj));
    return this.listenTo(obj, events);
  };

  // Reduces the event callbacks into a map of `{event: onceWrapper}`.
  // `offer` unbinds the `onceWrapper` after it has been called.
  var onceMap = function(map, name, callback, offer) {
    if (callback) {
      var once = map[name] = _.once(function() {
        offer(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
    }
    return map;
  };

  // Trigger one or many events, firing all bound callbacks. Callbacks are
  // passed the same arguments as `trigger` is, apart from the event name
  // (unless you're listening on `"all"`, which will cause your callback to
  // receive the true name of the event as the first argument).
  Events.trigger = function(name) {
    if (!this._events) return this;

    var length = Math.max(0, arguments.length - 1);
    var args = Array(length);
    for (var i = 0; i < length; i++) args[i] = arguments[i + 1];

    eventsApi(triggerApi, this._events, name, void 0, args);
    return this;
  };

  // Handles triggering the appropriate event callbacks.
  var triggerApi = function(objEvents, name, callback, args) {
    if (objEvents) {
      var events = objEvents[name];
      var allEvents = objEvents.all;
      if (events && allEvents) allEvents = allEvents.slice();
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, [name].concat(args));
    }
    return objEvents;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
    }
  };

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId(this.cidPrefix);
    this.attributes = {};
    if (options.collection) this.collection = options.collection;
    if (options.parse) attrs = this.parse(attrs, options) || {};
    var defaults = _.result(this, 'defaults');
    attrs = _.defaults(_.extend({}, defaults, attrs), defaults);
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The value returned during the last failed validation.
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // The prefix is used to create the client id which is used to identify models locally.
    // You may want to override this if you're experiencing name clashes with model ids.
    cidPrefix: 'c',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Special-cased proxy to underscore's `_.matches` method.
    matches: function(attrs) {
      return !!_.iteratee(attrs, this)(this.attributes);
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, val, options) {
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      var attrs;
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      var unset      = options.unset;
      var silent     = options.silent;
      var changes    = [];
      var changing   = this._changing;
      this._changing = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }

      var current = this.attributes;
      var changed = this.changed;
      var prev    = this._previousAttributes;

      // For each `set` attribute, update or delete the current value.
      for (var attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          changed[attr] = val;
        } else {
          delete changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      // Update the `id`.
      if (this.idAttribute in attrs) this.id = this.get(this.idAttribute);

      // Trigger all relevant attribute changes.
      if (!silent) {
        if (changes.length) this._pending = options;
        for (var i = 0; i < changes.length; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          options = this._pending;
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      var changed = {};
      for (var attr in diff) {
        var val = diff[attr];
        if (_.isEqual(old[attr], val)) continue;
        changed[attr] = val;
      }
      return _.size(changed) ? changed : false;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server, merging the response with the model's
    // local attributes. Any changed attributes will trigger a "change" event.
    fetch: function(options) {
      options = _.extend({parse: true}, options);
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        var serverAttrs = options.parse ? model.parse(resp, options) : resp;
        if (!model.set(serverAttrs, options)) return false;
        if (success) success.call(options.context, model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      // Handle both `"key", value` and `{key: value}` -style arguments.
      var attrs;
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options = _.extend({validate: true, parse: true}, options);
      var wait = options.wait;

      // If we're not waiting and attributes exist, save acts as
      // `set(attr).save(null, opts)` with validation. Otherwise, check if
      // the model will be valid when the attributes, if any, are set.
      if (attrs && !wait) {
        if (!this.set(attrs, options)) return false;
      } else if (!this._validate(attrs, options)) {
        return false;
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      var model = this;
      var success = options.success;
      var attributes = this.attributes;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        model.attributes = attributes;
        var serverAttrs = options.parse ? model.parse(resp, options) : resp;
        if (wait) serverAttrs = _.extend({}, attrs, serverAttrs);
        if (serverAttrs && !model.set(serverAttrs, options)) return false;
        if (success) success.call(options.context, model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      // Set temporary attributes if `{wait: true}` to properly find new ids.
      if (attrs && wait) this.attributes = _.extend({}, attributes, attrs);

      var method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch' && !options.attrs) options.attrs = attrs;
      var xhr = this.sync(method, this, options);

      // Restore attributes.
      this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;
      var wait = options.wait;

      var destroy = function() {
        model.stopListening();
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (wait) destroy();
        if (success) success.call(options.context, model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      var xhr = false;
      if (this.isNew()) {
        _.defer(options.success);
      } else {
        wrapError(this, options);
        xhr = this.sync('delete', this, options);
      }
      if (!wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base =
        _.result(this, 'urlRoot') ||
        _.result(this.collection, 'url') ||
        urlError();
      if (this.isNew()) return base;
      var id = this.get(this.idAttribute);
      return base.replace(/[^\/]$/, '$&/') + encodeURIComponent(id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return !this.has(this.idAttribute);
    },

    // Check if the model is currently in a valid state.
    isValid: function(options) {
      return this._validate({}, _.extend({}, options, {validate: true}));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model, mapped to the
  // number of arguments they take.
  var modelMethods = {keys: 1, values: 1, pairs: 1, invert: 1, pick: 0,
      omit: 0, chain: 1, isEmpty: 1};

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  addUnderscoreMethods(Model, modelMethods, 'attributes');

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analogous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, remove: false};

  // Splices `insert` into `array` at index `at`.
  var splice = function(array, insert, at) {
    at = Math.min(Math.max(at, 0), array.length);
    var tail = Array(array.length - at);
    var length = insert.length;
    var i;
    for (i = 0; i < tail.length; i++) tail[i] = array[i + at];
    for (i = 0; i < length; i++) array[i + at] = insert[i];
    for (i = 0; i < tail.length; i++) array[i + length + at] = tail[i];
  };

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model) { return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set. `models` may be Backbone
    // Models or raw JavaScript objects to be converted to Models, or any
    // combination of the two.
    add: function(models, options) {
      return this.set(models, _.extend({merge: false}, options, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      options = _.extend({}, options);
      var singular = !_.isArray(models);
      models = singular ? [models] : models.slice();
      var removed = this._removeModels(models, options);
      if (!options.silent && removed.length) {
        options.changes = {added: [], merged: [], removed: removed};
        this.trigger('update', this, options);
      }
      return singular ? removed[0] : removed;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      if (models == null) return;

      options = _.extend({}, setOptions, options);
      if (options.parse && !this._isModel(models)) {
        models = this.parse(models, options) || [];
      }

      var singular = !_.isArray(models);
      models = singular ? [models] : models.slice();

      var at = options.at;
      if (at != null) at = +at;
      if (at > this.length) at = this.length;
      if (at < 0) at += this.length + 1;

      var set = [];
      var toAdd = [];
      var toMerge = [];
      var toRemove = [];
      var modelMap = {};

      var add = options.add;
      var merge = options.merge;
      var remove = options.remove;

      var sort = false;
      var sortable = this.comparator && at == null && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      var model, i;
      for (i = 0; i < models.length; i++) {
        model = models[i];

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        var existing = this.get(model);
        if (existing) {
          if (merge && model !== existing) {
            var attrs = this._isModel(model) ? model.attributes : model;
            if (options.parse) attrs = existing.parse(attrs, options);
            existing.set(attrs, options);
            toMerge.push(existing);
            if (sortable && !sort) sort = existing.hasChanged(sortAttr);
          }
          if (!modelMap[existing.cid]) {
            modelMap[existing.cid] = true;
            set.push(existing);
          }
          models[i] = existing;

        // If this is a new, valid model, push it to the `toAdd` list.
        } else if (add) {
          model = models[i] = this._prepareModel(model, options);
          if (model) {
            toAdd.push(model);
            this._addReference(model, options);
            modelMap[model.cid] = true;
            set.push(model);
          }
        }
      }

      // Remove stale models.
      if (remove) {
        for (i = 0; i < this.length; i++) {
          model = this.models[i];
          if (!modelMap[model.cid]) toRemove.push(model);
        }
        if (toRemove.length) this._removeModels(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      var orderChanged = false;
      var replace = !sortable && add && remove;
      if (set.length && replace) {
        orderChanged = this.length !== set.length || _.some(this.models, function(m, index) {
          return m !== set[index];
        });
        this.models.length = 0;
        splice(this.models, set, 0);
        this.length = this.models.length;
      } else if (toAdd.length) {
        if (sortable) sort = true;
        splice(this.models, toAdd, at == null ? this.length : at);
        this.length = this.models.length;
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      // Unless silenced, it's time to fire all appropriate add/sort/update events.
      if (!options.silent) {
        for (i = 0; i < toAdd.length; i++) {
          if (at != null) options.index = at + i;
          model = toAdd[i];
          model.trigger('add', model, this, options);
        }
        if (sort || orderChanged) this.trigger('sort', this, options);
        if (toAdd.length || toRemove.length || toMerge.length) {
          options.changes = {
            added: toAdd,
            removed: toRemove,
            merged: toMerge
          };
          this.trigger('update', this, options);
        }
      }

      // Return the added (or merged) model (or models).
      return singular ? models[0] : models;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options = options ? _.clone(options) : {};
      for (var i = 0; i < this.models.length; i++) {
        this._removeReference(this.models[i], options);
      }
      options.previousModels = this.models;
      this._reset();
      models = this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return models;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      return this.add(model, _.extend({at: this.length}, options));
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      return this.remove(model, options);
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      return this.add(model, _.extend({at: 0}, options));
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      return this.remove(model, options);
    },

    // Slice out a sub-array of models from the collection.
    slice: function() {
      return slice.apply(this.models, arguments);
    },

    // Get a model from the set by id, cid, model object with id or cid
    // properties, or an attributes object that is transformed through modelId.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj] ||
        this._byId[this.modelId(obj.attributes || obj)] ||
        obj.cid && this._byId[obj.cid];
    },

    // Returns `true` if the model is in the collection.
    has: function(obj) {
      return this.get(obj) != null;
    },

    // Get the model at the given index.
    at: function(index) {
      if (index < 0) index += this.length;
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      return this[first ? 'find' : 'filter'](attrs);
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      var comparator = this.comparator;
      if (!comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      var length = comparator.length;
      if (_.isFunction(comparator)) comparator = _.bind(comparator, this);

      // Run sort based on type of `comparator`.
      if (length === 1 || _.isString(comparator)) {
        this.models = this.sortBy(comparator);
      } else {
        this.models.sort(comparator);
      }
      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return this.map(attr + '');
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = _.extend({parse: true}, options);
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success.call(options.context, collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      var wait = options.wait;
      model = this._prepareModel(model, options);
      if (!model) return false;
      if (!wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(m, resp, callbackOpts) {
        if (wait) collection.add(m, callbackOpts);
        if (success) success.call(callbackOpts.context, m, resp, callbackOpts);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models, {
        model: this.model,
        comparator: this.comparator
      });
    },

    // Define how to uniquely identify models in the collection.
    modelId: function(attrs) {
      return attrs[this.model.prototype.idAttribute || 'id'];
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (this._isModel(attrs)) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options = options ? _.clone(options) : {};
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model.validationError) return model;
      this.trigger('invalid', this, model.validationError, options);
      return false;
    },

    // Internal method called by both remove and set.
    _removeModels: function(models, options) {
      var removed = [];
      for (var i = 0; i < models.length; i++) {
        var model = this.get(models[i]);
        if (!model) continue;

        var index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;

        // Remove references before triggering 'remove' event to prevent an
        // infinite loop. #3693
        delete this._byId[model.cid];
        var id = this.modelId(model.attributes);
        if (id != null) delete this._byId[id];

        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }

        removed.push(model);
        this._removeReference(model, options);
      }
      return removed;
    },

    // Method for checking whether an object should be considered a model for
    // the purposes of adding to the collection.
    _isModel: function(model) {
      return model instanceof Model;
    },

    // Internal method to create a model's ties to a collection.
    _addReference: function(model, options) {
      this._byId[model.cid] = model;
      var id = this.modelId(model.attributes);
      if (id != null) this._byId[id] = model;
      model.on('all', this._onModelEvent, this);
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model, options) {
      delete this._byId[model.cid];
      var id = this.modelId(model.attributes);
      if (id != null) delete this._byId[id];
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if (model) {
        if ((event === 'add' || event === 'remove') && collection !== this) return;
        if (event === 'destroy') this.remove(model, options);
        if (event === 'change') {
          var prevId = this.modelId(model.previousAttributes());
          var id = this.modelId(model.attributes);
          if (prevId !== id) {
            if (prevId != null) delete this._byId[prevId];
            if (id != null) this._byId[id] = model;
          }
        }
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var collectionMethods = {forEach: 3, each: 3, map: 3, collect: 3, reduce: 0,
      foldl: 0, inject: 0, reduceRight: 0, foldr: 0, find: 3, detect: 3, filter: 3,
      select: 3, reject: 3, every: 3, all: 3, some: 3, any: 3, include: 3, includes: 3,
      contains: 3, invoke: 0, max: 3, min: 3, toArray: 1, size: 1, first: 3,
      head: 3, take: 3, initial: 3, rest: 3, tail: 3, drop: 3, last: 3,
      without: 0, difference: 0, indexOf: 3, shuffle: 1, lastIndexOf: 3,
      isEmpty: 1, chain: 1, sample: 3, partition: 3, groupBy: 3, countBy: 3,
      sortBy: 3, indexBy: 3, findIndex: 3, findLastIndex: 3};

  // Mix in each Underscore method as a proxy to `Collection#models`.
  addUnderscoreMethods(Collection, collectionMethods, 'models');

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    _.extend(this, _.pick(options, viewOptions));
    this._ensureElement();
    this.initialize.apply(this, arguments);
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be set as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be preferred to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this._removeElement();
      this.stopListening();
      return this;
    },

    // Remove this view's element from the document and all event listeners
    // attached to it. Exposed for subclasses using an alternative DOM
    // manipulation API.
    _removeElement: function() {
      this.$el.remove();
    },

    // Change the view's element (`this.el` property) and re-delegate the
    // view's events on the new element.
    setElement: function(element) {
      this.undelegateEvents();
      this._setElement(element);
      this.delegateEvents();
      return this;
    },

    // Creates the `this.el` and `this.$el` references for this view using the
    // given `el`. `el` can be a CSS selector or an HTML string, a jQuery
    // context or an element. Subclasses can override this to utilize an
    // alternative DOM manipulation API and are only required to set the
    // `this.el` property.
    _setElement: function(el) {
      this.$el = el instanceof Backbone.$ ? el : Backbone.$(el);
      this.el = this.$el[0];
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save',
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    delegateEvents: function(events) {
      events || (events = _.result(this, 'events'));
      if (!events) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[method];
        if (!method) continue;
        var match = key.match(delegateEventSplitter);
        this.delegate(match[1], match[2], _.bind(method, this));
      }
      return this;
    },

    // Add a single event listener to the view's element (or a child element
    // using `selector`). This only works for delegate-able events: not `focus`,
    // `blur`, and not `change`, `submit`, and `reset` in Internet Explorer.
    delegate: function(eventName, selector, listener) {
      this.$el.on(eventName + '.delegateEvents' + this.cid, selector, listener);
      return this;
    },

    // Clears all callbacks previously bound to the view by `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      if (this.$el) this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // A finer-grained `undelegateEvents` for removing a single delegated event.
    // `selector` and `listener` are both optional.
    undelegate: function(eventName, selector, listener) {
      this.$el.off(eventName + '.delegateEvents' + this.cid, selector, listener);
      return this;
    },

    // Produces a DOM element to be assigned to your view. Exposed for
    // subclasses using an alternative DOM manipulation API.
    _createElement: function(tagName) {
      return document.createElement(tagName);
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        this.setElement(this._createElement(_.result(this, 'tagName')));
        this._setAttributes(attrs);
      } else {
        this.setElement(_.result(this, 'el'));
      }
    },

    // Set attributes from a hash on this view's element.  Exposed for
    // subclasses using an alternative DOM manipulation API.
    _setAttributes: function(attributes) {
      this.$el.attr(attributes);
    }

  });

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // Pass along `textStatus` and `errorThrown` from jQuery.
    var error = options.error;
    options.error = function(xhr, textStatus, errorThrown) {
      options.textStatus = textStatus;
      options.errorThrown = errorThrown;
      if (error) error.call(options.context, xhr, textStatus, errorThrown);
    };

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch': 'PATCH',
    'delete': 'DELETE',
    'read': 'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        if (router.execute(callback, args, name) !== false) {
          router.trigger.apply(router, ['route:' + name].concat(args));
          router.trigger('route', name, args);
          Backbone.history.trigger('route', router, name, args);
        }
      });
      return this;
    },

    // Execute a route handler with the provided parameters.  This is an
    // excellent place to do pre-route setup or post-route cleanup.
    execute: function(callback, args, name) {
      if (callback) callback.apply(this, args);
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional) {
                     return optional ? match : '([^/?]+)';
                   })
                   .replace(splatParam, '([^?]*?)');
      return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param, i) {
        // Don't decode the search params.
        if (i === params.length - 1) return param || null;
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    this.checkUrl = _.bind(this.checkUrl, this);

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for stripping urls of hash.
  var pathStripper = /#.*$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Are we at the app root?
    atRoot: function() {
      var path = this.location.pathname.replace(/[^\/]$/, '$&/');
      return path === this.root && !this.getSearch();
    },

    // Does the pathname match the root?
    matchRoot: function() {
      var path = this.decodeFragment(this.location.pathname);
      var rootPath = path.slice(0, this.root.length - 1) + '/';
      return rootPath === this.root;
    },

    // Unicode characters in `location.pathname` are percent encoded so they're
    // decoded for comparison. `%25` should not be decoded since it may be part
    // of an encoded parameter.
    decodeFragment: function(fragment) {
      return decodeURI(fragment.replace(/%25/g, '%2525'));
    },

    // In IE6, the hash fragment and search params are incorrect if the
    // fragment contains `?`.
    getSearch: function() {
      var match = this.location.href.replace(/#.*/, '').match(/\?.+/);
      return match ? match[0] : '';
    },

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the pathname and search params, without the root.
    getPath: function() {
      var path = this.decodeFragment(
        this.location.pathname + this.getSearch()
      ).slice(this.root.length - 1);
      return path.charAt(0) === '/' ? path.slice(1) : path;
    },

    // Get the cross-browser normalized URL fragment from the path or hash.
    getFragment: function(fragment) {
      if (fragment == null) {
        if (this._usePushState || !this._wantsHashChange) {
          fragment = this.getPath();
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error('Backbone.history has already been started');
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._hasHashChange   = 'onhashchange' in window && (document.documentMode === void 0 || document.documentMode > 7);
      this._useHashChange   = this._wantsHashChange && this._hasHashChange;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.history && this.history.pushState);
      this._usePushState    = this._wantsPushState && this._hasPushState;
      this.fragment         = this.getFragment();

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      // Transition from hashChange to pushState or vice versa if both are
      // requested.
      if (this._wantsHashChange && this._wantsPushState) {

        // If we've started off with a route from a `pushState`-enabled
        // browser, but we're currently in a browser that doesn't support it...
        if (!this._hasPushState && !this.atRoot()) {
          var rootPath = this.root.slice(0, -1) || '/';
          this.location.replace(rootPath + '#' + this.getPath());
          // Return immediately as browser will do redirect to new url
          return true;

        // Or if we've started out with a hash-based route, but we're currently
        // in a browser where it could be `pushState`-based instead...
        } else if (this._hasPushState && this.atRoot()) {
          this.navigate(this.getHash(), {replace: true});
        }

      }

      // Proxy an iframe to handle location events if the browser doesn't
      // support the `hashchange` event, HTML5 history, or the user wants
      // `hashChange` but not `pushState`.
      if (!this._hasHashChange && this._wantsHashChange && !this._usePushState) {
        this.iframe = document.createElement('iframe');
        this.iframe.src = 'javascript:0';
        this.iframe.style.display = 'none';
        this.iframe.tabIndex = -1;
        var body = document.body;
        // Using `appendChild` will throw on IE < 9 if the document is not ready.
        var iWindow = body.insertBefore(this.iframe, body.firstChild).contentWindow;
        iWindow.document.open();
        iWindow.document.close();
        iWindow.location.hash = '#' + this.fragment;
      }

      // Add a cross-platform `addEventListener` shim for older browsers.
      var addEventListener = window.addEventListener || function(eventName, listener) {
        return attachEvent('on' + eventName, listener);
      };

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._usePushState) {
        addEventListener('popstate', this.checkUrl, false);
      } else if (this._useHashChange && !this.iframe) {
        addEventListener('hashchange', this.checkUrl, false);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      // Add a cross-platform `removeEventListener` shim for older browsers.
      var removeEventListener = window.removeEventListener || function(eventName, listener) {
        return detachEvent('on' + eventName, listener);
      };

      // Remove window listeners.
      if (this._usePushState) {
        removeEventListener('popstate', this.checkUrl, false);
      } else if (this._useHashChange && !this.iframe) {
        removeEventListener('hashchange', this.checkUrl, false);
      }

      // Clean up the iframe if necessary.
      if (this.iframe) {
        document.body.removeChild(this.iframe);
        this.iframe = null;
      }

      // Some environments will throw when clearing an undefined interval.
      if (this._checkUrlInterval) clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();

      // If the user pressed the back button, the iframe's hash will have
      // changed and we should use that for comparison.
      if (current === this.fragment && this.iframe) {
        current = this.getHash(this.iframe.contentWindow);
      }

      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl();
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragment) {
      // If the root doesn't match, no routes can match either.
      if (!this.matchRoot()) return false;
      fragment = this.fragment = this.getFragment(fragment);
      return _.some(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: !!options};

      // Normalize the fragment.
      fragment = this.getFragment(fragment || '');

      // Don't include a trailing slash on the root.
      var rootPath = this.root;
      if (fragment === '' || fragment.charAt(0) === '?') {
        rootPath = rootPath.slice(0, -1) || '/';
      }
      var url = rootPath + fragment;

      // Strip the hash and decode for matching.
      fragment = this.decodeFragment(fragment.replace(pathStripper, ''));

      if (this.fragment === fragment) return;
      this.fragment = fragment;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._usePushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && fragment !== this.getHash(this.iframe.contentWindow)) {
          var iWindow = this.iframe.contentWindow;

          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if (!options.replace) {
            iWindow.document.open();
            iWindow.document.close();
          }

          this._updateHash(iWindow.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) return this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function and add the prototype properties.
    child.prototype = _.create(parent.prototype, protoProps);
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function(model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error.call(options.context, model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

  return Backbone;
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"jquery":24,"underscore":53}],11:[function(require,module,exports){
/*!
 * Bootstrap v3.3.7 (http://getbootstrap.com)
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under the MIT license
 */

if (typeof jQuery === 'undefined') {
  throw new Error('Bootstrap\'s JavaScript requires jQuery')
}

+function ($) {
  'use strict';
  var version = $.fn.jquery.split(' ')[0].split('.')
  if ((version[0] < 2 && version[1] < 9) || (version[0] == 1 && version[1] == 9 && version[2] < 1) || (version[0] > 3)) {
    throw new Error('Bootstrap\'s JavaScript requires jQuery version 1.9.1 or higher, but lower than version 4')
  }
}(jQuery);

/* ========================================================================
 * Bootstrap: transition.js v3.3.7
 * http://getbootstrap.com/javascript/#transitions
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // CSS TRANSITION SUPPORT (Shoutout: http://www.modernizr.com/)
  // ============================================================

  function transitionEnd() {
    var el = document.createElement('bootstrap')

    var transEndEventNames = {
      WebkitTransition : 'webkitTransitionEnd',
      MozTransition    : 'transitionend',
      OTransition      : 'oTransitionEnd otransitionend',
      transition       : 'transitionend'
    }

    for (var name in transEndEventNames) {
      if (el.style[name] !== undefined) {
        return { end: transEndEventNames[name] }
      }
    }

    return false // explicit for ie8 (  ._.)
  }

  // http://blog.alexmaccaw.com/css-transitions
  $.fn.emulateTransitionEnd = function (duration) {
    var called = false
    var $el = this
    $(this).one('bsTransitionEnd', function () { called = true })
    var callback = function () { if (!called) $($el).trigger($.support.transition.end) }
    setTimeout(callback, duration)
    return this
  }

  $(function () {
    $.support.transition = transitionEnd()

    if (!$.support.transition) return

    $.event.special.bsTransitionEnd = {
      bindType: $.support.transition.end,
      delegateType: $.support.transition.end,
      handle: function (e) {
        if ($(e.target).is(this)) return e.handleObj.handler.apply(this, arguments)
      }
    }
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: alert.js v3.3.7
 * http://getbootstrap.com/javascript/#alerts
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // ALERT CLASS DEFINITION
  // ======================

  var dismiss = '[data-dismiss="alert"]'
  var Alert   = function (el) {
    $(el).on('click', dismiss, this.close)
  }

  Alert.VERSION = '3.3.7'

  Alert.TRANSITION_DURATION = 150

  Alert.prototype.close = function (e) {
    var $this    = $(this)
    var selector = $this.attr('data-target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
    }

    var $parent = $(selector === '#' ? [] : selector)

    if (e) e.preventDefault()

    if (!$parent.length) {
      $parent = $this.closest('.alert')
    }

    $parent.trigger(e = $.Event('close.bs.alert'))

    if (e.isDefaultPrevented()) return

    $parent.removeClass('in')

    function removeElement() {
      // detach from parent, fire event then clean up data
      $parent.detach().trigger('closed.bs.alert').remove()
    }

    $.support.transition && $parent.hasClass('fade') ?
      $parent
        .one('bsTransitionEnd', removeElement)
        .emulateTransitionEnd(Alert.TRANSITION_DURATION) :
      removeElement()
  }


  // ALERT PLUGIN DEFINITION
  // =======================

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.alert')

      if (!data) $this.data('bs.alert', (data = new Alert(this)))
      if (typeof option == 'string') data[option].call($this)
    })
  }

  var old = $.fn.alert

  $.fn.alert             = Plugin
  $.fn.alert.Constructor = Alert


  // ALERT NO CONFLICT
  // =================

  $.fn.alert.noConflict = function () {
    $.fn.alert = old
    return this
  }


  // ALERT DATA-API
  // ==============

  $(document).on('click.bs.alert.data-api', dismiss, Alert.prototype.close)

}(jQuery);

/* ========================================================================
 * Bootstrap: button.js v3.3.7
 * http://getbootstrap.com/javascript/#buttons
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // BUTTON PUBLIC CLASS DEFINITION
  // ==============================

  var Button = function (element, options) {
    this.$element  = $(element)
    this.options   = $.extend({}, Button.DEFAULTS, options)
    this.isLoading = false
  }

  Button.VERSION  = '3.3.7'

  Button.DEFAULTS = {
    loadingText: 'loading...'
  }

  Button.prototype.setState = function (state) {
    var d    = 'disabled'
    var $el  = this.$element
    var val  = $el.is('input') ? 'val' : 'html'
    var data = $el.data()

    state += 'Text'

    if (data.resetText == null) $el.data('resetText', $el[val]())

    // push to event loop to allow forms to submit
    setTimeout($.proxy(function () {
      $el[val](data[state] == null ? this.options[state] : data[state])

      if (state == 'loadingText') {
        this.isLoading = true
        $el.addClass(d).attr(d, d).prop(d, true)
      } else if (this.isLoading) {
        this.isLoading = false
        $el.removeClass(d).removeAttr(d).prop(d, false)
      }
    }, this), 0)
  }

  Button.prototype.toggle = function () {
    var changed = true
    var $parent = this.$element.closest('[data-toggle="buttons"]')

    if ($parent.length) {
      var $input = this.$element.find('input')
      if ($input.prop('type') == 'radio') {
        if ($input.prop('checked')) changed = false
        $parent.find('.active').removeClass('active')
        this.$element.addClass('active')
      } else if ($input.prop('type') == 'checkbox') {
        if (($input.prop('checked')) !== this.$element.hasClass('active')) changed = false
        this.$element.toggleClass('active')
      }
      $input.prop('checked', this.$element.hasClass('active'))
      if (changed) $input.trigger('change')
    } else {
      this.$element.attr('aria-pressed', !this.$element.hasClass('active'))
      this.$element.toggleClass('active')
    }
  }


  // BUTTON PLUGIN DEFINITION
  // ========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.button')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.button', (data = new Button(this, options)))

      if (option == 'toggle') data.toggle()
      else if (option) data.setState(option)
    })
  }

  var old = $.fn.button

  $.fn.button             = Plugin
  $.fn.button.Constructor = Button


  // BUTTON NO CONFLICT
  // ==================

  $.fn.button.noConflict = function () {
    $.fn.button = old
    return this
  }


  // BUTTON DATA-API
  // ===============

  $(document)
    .on('click.bs.button.data-api', '[data-toggle^="button"]', function (e) {
      var $btn = $(e.target).closest('.btn')
      Plugin.call($btn, 'toggle')
      if (!($(e.target).is('input[type="radio"], input[type="checkbox"]'))) {
        // Prevent double click on radios, and the double selections (so cancellation) on checkboxes
        e.preventDefault()
        // The target component still receive the focus
        if ($btn.is('input,button')) $btn.trigger('focus')
        else $btn.find('input:visible,button:visible').first().trigger('focus')
      }
    })
    .on('focus.bs.button.data-api blur.bs.button.data-api', '[data-toggle^="button"]', function (e) {
      $(e.target).closest('.btn').toggleClass('focus', /^focus(in)?$/.test(e.type))
    })

}(jQuery);

/* ========================================================================
 * Bootstrap: carousel.js v3.3.7
 * http://getbootstrap.com/javascript/#carousel
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // CAROUSEL CLASS DEFINITION
  // =========================

  var Carousel = function (element, options) {
    this.$element    = $(element)
    this.$indicators = this.$element.find('.carousel-indicators')
    this.options     = options
    this.paused      = null
    this.sliding     = null
    this.interval    = null
    this.$active     = null
    this.$items      = null

    this.options.keyboard && this.$element.on('keydown.bs.carousel', $.proxy(this.keydown, this))

    this.options.pause == 'hover' && !('ontouchstart' in document.documentElement) && this.$element
      .on('mouseenter.bs.carousel', $.proxy(this.pause, this))
      .on('mouseleave.bs.carousel', $.proxy(this.cycle, this))
  }

  Carousel.VERSION  = '3.3.7'

  Carousel.TRANSITION_DURATION = 600

  Carousel.DEFAULTS = {
    interval: 5000,
    pause: 'hover',
    wrap: true,
    keyboard: true
  }

  Carousel.prototype.keydown = function (e) {
    if (/input|textarea/i.test(e.target.tagName)) return
    switch (e.which) {
      case 37: this.prev(); break
      case 39: this.next(); break
      default: return
    }

    e.preventDefault()
  }

  Carousel.prototype.cycle = function (e) {
    e || (this.paused = false)

    this.interval && clearInterval(this.interval)

    this.options.interval
      && !this.paused
      && (this.interval = setInterval($.proxy(this.next, this), this.options.interval))

    return this
  }

  Carousel.prototype.getItemIndex = function (item) {
    this.$items = item.parent().children('.item')
    return this.$items.index(item || this.$active)
  }

  Carousel.prototype.getItemForDirection = function (direction, active) {
    var activeIndex = this.getItemIndex(active)
    var willWrap = (direction == 'prev' && activeIndex === 0)
                || (direction == 'next' && activeIndex == (this.$items.length - 1))
    if (willWrap && !this.options.wrap) return active
    var delta = direction == 'prev' ? -1 : 1
    var itemIndex = (activeIndex + delta) % this.$items.length
    return this.$items.eq(itemIndex)
  }

  Carousel.prototype.to = function (pos) {
    var that        = this
    var activeIndex = this.getItemIndex(this.$active = this.$element.find('.item.active'))

    if (pos > (this.$items.length - 1) || pos < 0) return

    if (this.sliding)       return this.$element.one('slid.bs.carousel', function () { that.to(pos) }) // yes, "slid"
    if (activeIndex == pos) return this.pause().cycle()

    return this.slide(pos > activeIndex ? 'next' : 'prev', this.$items.eq(pos))
  }

  Carousel.prototype.pause = function (e) {
    e || (this.paused = true)

    if (this.$element.find('.next, .prev').length && $.support.transition) {
      this.$element.trigger($.support.transition.end)
      this.cycle(true)
    }

    this.interval = clearInterval(this.interval)

    return this
  }

  Carousel.prototype.next = function () {
    if (this.sliding) return
    return this.slide('next')
  }

  Carousel.prototype.prev = function () {
    if (this.sliding) return
    return this.slide('prev')
  }

  Carousel.prototype.slide = function (type, next) {
    var $active   = this.$element.find('.item.active')
    var $next     = next || this.getItemForDirection(type, $active)
    var isCycling = this.interval
    var direction = type == 'next' ? 'left' : 'right'
    var that      = this

    if ($next.hasClass('active')) return (this.sliding = false)

    var relatedTarget = $next[0]
    var slideEvent = $.Event('slide.bs.carousel', {
      relatedTarget: relatedTarget,
      direction: direction
    })
    this.$element.trigger(slideEvent)
    if (slideEvent.isDefaultPrevented()) return

    this.sliding = true

    isCycling && this.pause()

    if (this.$indicators.length) {
      this.$indicators.find('.active').removeClass('active')
      var $nextIndicator = $(this.$indicators.children()[this.getItemIndex($next)])
      $nextIndicator && $nextIndicator.addClass('active')
    }

    var slidEvent = $.Event('slid.bs.carousel', { relatedTarget: relatedTarget, direction: direction }) // yes, "slid"
    if ($.support.transition && this.$element.hasClass('slide')) {
      $next.addClass(type)
      $next[0].offsetWidth // force reflow
      $active.addClass(direction)
      $next.addClass(direction)
      $active
        .one('bsTransitionEnd', function () {
          $next.removeClass([type, direction].join(' ')).addClass('active')
          $active.removeClass(['active', direction].join(' '))
          that.sliding = false
          setTimeout(function () {
            that.$element.trigger(slidEvent)
          }, 0)
        })
        .emulateTransitionEnd(Carousel.TRANSITION_DURATION)
    } else {
      $active.removeClass('active')
      $next.addClass('active')
      this.sliding = false
      this.$element.trigger(slidEvent)
    }

    isCycling && this.cycle()

    return this
  }


  // CAROUSEL PLUGIN DEFINITION
  // ==========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.carousel')
      var options = $.extend({}, Carousel.DEFAULTS, $this.data(), typeof option == 'object' && option)
      var action  = typeof option == 'string' ? option : options.slide

      if (!data) $this.data('bs.carousel', (data = new Carousel(this, options)))
      if (typeof option == 'number') data.to(option)
      else if (action) data[action]()
      else if (options.interval) data.pause().cycle()
    })
  }

  var old = $.fn.carousel

  $.fn.carousel             = Plugin
  $.fn.carousel.Constructor = Carousel


  // CAROUSEL NO CONFLICT
  // ====================

  $.fn.carousel.noConflict = function () {
    $.fn.carousel = old
    return this
  }


  // CAROUSEL DATA-API
  // =================

  var clickHandler = function (e) {
    var href
    var $this   = $(this)
    var $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) // strip for ie7
    if (!$target.hasClass('carousel')) return
    var options = $.extend({}, $target.data(), $this.data())
    var slideIndex = $this.attr('data-slide-to')
    if (slideIndex) options.interval = false

    Plugin.call($target, options)

    if (slideIndex) {
      $target.data('bs.carousel').to(slideIndex)
    }

    e.preventDefault()
  }

  $(document)
    .on('click.bs.carousel.data-api', '[data-slide]', clickHandler)
    .on('click.bs.carousel.data-api', '[data-slide-to]', clickHandler)

  $(window).on('load', function () {
    $('[data-ride="carousel"]').each(function () {
      var $carousel = $(this)
      Plugin.call($carousel, $carousel.data())
    })
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: collapse.js v3.3.7
 * http://getbootstrap.com/javascript/#collapse
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

/* jshint latedef: false */

+function ($) {
  'use strict';

  // COLLAPSE PUBLIC CLASS DEFINITION
  // ================================

  var Collapse = function (element, options) {
    this.$element      = $(element)
    this.options       = $.extend({}, Collapse.DEFAULTS, options)
    this.$trigger      = $('[data-toggle="collapse"][href="#' + element.id + '"],' +
                           '[data-toggle="collapse"][data-target="#' + element.id + '"]')
    this.transitioning = null

    if (this.options.parent) {
      this.$parent = this.getParent()
    } else {
      this.addAriaAndCollapsedClass(this.$element, this.$trigger)
    }

    if (this.options.toggle) this.toggle()
  }

  Collapse.VERSION  = '3.3.7'

  Collapse.TRANSITION_DURATION = 350

  Collapse.DEFAULTS = {
    toggle: true
  }

  Collapse.prototype.dimension = function () {
    var hasWidth = this.$element.hasClass('width')
    return hasWidth ? 'width' : 'height'
  }

  Collapse.prototype.show = function () {
    if (this.transitioning || this.$element.hasClass('in')) return

    var activesData
    var actives = this.$parent && this.$parent.children('.panel').children('.in, .collapsing')

    if (actives && actives.length) {
      activesData = actives.data('bs.collapse')
      if (activesData && activesData.transitioning) return
    }

    var startEvent = $.Event('show.bs.collapse')
    this.$element.trigger(startEvent)
    if (startEvent.isDefaultPrevented()) return

    if (actives && actives.length) {
      Plugin.call(actives, 'hide')
      activesData || actives.data('bs.collapse', null)
    }

    var dimension = this.dimension()

    this.$element
      .removeClass('collapse')
      .addClass('collapsing')[dimension](0)
      .attr('aria-expanded', true)

    this.$trigger
      .removeClass('collapsed')
      .attr('aria-expanded', true)

    this.transitioning = 1

    var complete = function () {
      this.$element
        .removeClass('collapsing')
        .addClass('collapse in')[dimension]('')
      this.transitioning = 0
      this.$element
        .trigger('shown.bs.collapse')
    }

    if (!$.support.transition) return complete.call(this)

    var scrollSize = $.camelCase(['scroll', dimension].join('-'))

    this.$element
      .one('bsTransitionEnd', $.proxy(complete, this))
      .emulateTransitionEnd(Collapse.TRANSITION_DURATION)[dimension](this.$element[0][scrollSize])
  }

  Collapse.prototype.hide = function () {
    if (this.transitioning || !this.$element.hasClass('in')) return

    var startEvent = $.Event('hide.bs.collapse')
    this.$element.trigger(startEvent)
    if (startEvent.isDefaultPrevented()) return

    var dimension = this.dimension()

    this.$element[dimension](this.$element[dimension]())[0].offsetHeight

    this.$element
      .addClass('collapsing')
      .removeClass('collapse in')
      .attr('aria-expanded', false)

    this.$trigger
      .addClass('collapsed')
      .attr('aria-expanded', false)

    this.transitioning = 1

    var complete = function () {
      this.transitioning = 0
      this.$element
        .removeClass('collapsing')
        .addClass('collapse')
        .trigger('hidden.bs.collapse')
    }

    if (!$.support.transition) return complete.call(this)

    this.$element
      [dimension](0)
      .one('bsTransitionEnd', $.proxy(complete, this))
      .emulateTransitionEnd(Collapse.TRANSITION_DURATION)
  }

  Collapse.prototype.toggle = function () {
    this[this.$element.hasClass('in') ? 'hide' : 'show']()
  }

  Collapse.prototype.getParent = function () {
    return $(this.options.parent)
      .find('[data-toggle="collapse"][data-parent="' + this.options.parent + '"]')
      .each($.proxy(function (i, element) {
        var $element = $(element)
        this.addAriaAndCollapsedClass(getTargetFromTrigger($element), $element)
      }, this))
      .end()
  }

  Collapse.prototype.addAriaAndCollapsedClass = function ($element, $trigger) {
    var isOpen = $element.hasClass('in')

    $element.attr('aria-expanded', isOpen)
    $trigger
      .toggleClass('collapsed', !isOpen)
      .attr('aria-expanded', isOpen)
  }

  function getTargetFromTrigger($trigger) {
    var href
    var target = $trigger.attr('data-target')
      || (href = $trigger.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '') // strip for ie7

    return $(target)
  }


  // COLLAPSE PLUGIN DEFINITION
  // ==========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.collapse')
      var options = $.extend({}, Collapse.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data && options.toggle && /show|hide/.test(option)) options.toggle = false
      if (!data) $this.data('bs.collapse', (data = new Collapse(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.collapse

  $.fn.collapse             = Plugin
  $.fn.collapse.Constructor = Collapse


  // COLLAPSE NO CONFLICT
  // ====================

  $.fn.collapse.noConflict = function () {
    $.fn.collapse = old
    return this
  }


  // COLLAPSE DATA-API
  // =================

  $(document).on('click.bs.collapse.data-api', '[data-toggle="collapse"]', function (e) {
    var $this   = $(this)

    if (!$this.attr('data-target')) e.preventDefault()

    var $target = getTargetFromTrigger($this)
    var data    = $target.data('bs.collapse')
    var option  = data ? 'toggle' : $this.data()

    Plugin.call($target, option)
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: dropdown.js v3.3.7
 * http://getbootstrap.com/javascript/#dropdowns
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // DROPDOWN CLASS DEFINITION
  // =========================

  var backdrop = '.dropdown-backdrop'
  var toggle   = '[data-toggle="dropdown"]'
  var Dropdown = function (element) {
    $(element).on('click.bs.dropdown', this.toggle)
  }

  Dropdown.VERSION = '3.3.7'

  function getParent($this) {
    var selector = $this.attr('data-target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
    }

    var $parent = selector && $(selector)

    return $parent && $parent.length ? $parent : $this.parent()
  }

  function clearMenus(e) {
    if (e && e.which === 3) return
    $(backdrop).remove()
    $(toggle).each(function () {
      var $this         = $(this)
      var $parent       = getParent($this)
      var relatedTarget = { relatedTarget: this }

      if (!$parent.hasClass('open')) return

      if (e && e.type == 'click' && /input|textarea/i.test(e.target.tagName) && $.contains($parent[0], e.target)) return

      $parent.trigger(e = $.Event('hide.bs.dropdown', relatedTarget))

      if (e.isDefaultPrevented()) return

      $this.attr('aria-expanded', 'false')
      $parent.removeClass('open').trigger($.Event('hidden.bs.dropdown', relatedTarget))
    })
  }

  Dropdown.prototype.toggle = function (e) {
    var $this = $(this)

    if ($this.is('.disabled, :disabled')) return

    var $parent  = getParent($this)
    var isActive = $parent.hasClass('open')

    clearMenus()

    if (!isActive) {
      if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
        // if mobile we use a backdrop because click events don't delegate
        $(document.createElement('div'))
          .addClass('dropdown-backdrop')
          .insertAfter($(this))
          .on('click', clearMenus)
      }

      var relatedTarget = { relatedTarget: this }
      $parent.trigger(e = $.Event('show.bs.dropdown', relatedTarget))

      if (e.isDefaultPrevented()) return

      $this
        .trigger('focus')
        .attr('aria-expanded', 'true')

      $parent
        .toggleClass('open')
        .trigger($.Event('shown.bs.dropdown', relatedTarget))
    }

    return false
  }

  Dropdown.prototype.keydown = function (e) {
    if (!/(38|40|27|32)/.test(e.which) || /input|textarea/i.test(e.target.tagName)) return

    var $this = $(this)

    e.preventDefault()
    e.stopPropagation()

    if ($this.is('.disabled, :disabled')) return

    var $parent  = getParent($this)
    var isActive = $parent.hasClass('open')

    if (!isActive && e.which != 27 || isActive && e.which == 27) {
      if (e.which == 27) $parent.find(toggle).trigger('focus')
      return $this.trigger('click')
    }

    var desc = ' li:not(.disabled):visible a'
    var $items = $parent.find('.dropdown-menu' + desc)

    if (!$items.length) return

    var index = $items.index(e.target)

    if (e.which == 38 && index > 0)                 index--         // up
    if (e.which == 40 && index < $items.length - 1) index++         // down
    if (!~index)                                    index = 0

    $items.eq(index).trigger('focus')
  }


  // DROPDOWN PLUGIN DEFINITION
  // ==========================

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.dropdown')

      if (!data) $this.data('bs.dropdown', (data = new Dropdown(this)))
      if (typeof option == 'string') data[option].call($this)
    })
  }

  var old = $.fn.dropdown

  $.fn.dropdown             = Plugin
  $.fn.dropdown.Constructor = Dropdown


  // DROPDOWN NO CONFLICT
  // ====================

  $.fn.dropdown.noConflict = function () {
    $.fn.dropdown = old
    return this
  }


  // APPLY TO STANDARD DROPDOWN ELEMENTS
  // ===================================

  $(document)
    .on('click.bs.dropdown.data-api', clearMenus)
    .on('click.bs.dropdown.data-api', '.dropdown form', function (e) { e.stopPropagation() })
    .on('click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle)
    .on('keydown.bs.dropdown.data-api', toggle, Dropdown.prototype.keydown)
    .on('keydown.bs.dropdown.data-api', '.dropdown-menu', Dropdown.prototype.keydown)

}(jQuery);

/* ========================================================================
 * Bootstrap: modal.js v3.3.7
 * http://getbootstrap.com/javascript/#modals
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // MODAL CLASS DEFINITION
  // ======================

  var Modal = function (element, options) {
    this.options             = options
    this.$body               = $(document.body)
    this.$element            = $(element)
    this.$dialog             = this.$element.find('.modal-dialog')
    this.$backdrop           = null
    this.isShown             = null
    this.originalBodyPad     = null
    this.scrollbarWidth      = 0
    this.ignoreBackdropClick = false

    if (this.options.remote) {
      this.$element
        .find('.modal-content')
        .load(this.options.remote, $.proxy(function () {
          this.$element.trigger('loaded.bs.modal')
        }, this))
    }
  }

  Modal.VERSION  = '3.3.7'

  Modal.TRANSITION_DURATION = 300
  Modal.BACKDROP_TRANSITION_DURATION = 150

  Modal.DEFAULTS = {
    backdrop: true,
    keyboard: true,
    show: true
  }

  Modal.prototype.toggle = function (_relatedTarget) {
    return this.isShown ? this.hide() : this.show(_relatedTarget)
  }

  Modal.prototype.show = function (_relatedTarget) {
    var that = this
    var e    = $.Event('show.bs.modal', { relatedTarget: _relatedTarget })

    this.$element.trigger(e)

    if (this.isShown || e.isDefaultPrevented()) return

    this.isShown = true

    this.checkScrollbar()
    this.setScrollbar()
    this.$body.addClass('modal-open')

    this.escape()
    this.resize()

    this.$element.on('click.dismiss.bs.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this))

    this.$dialog.on('mousedown.dismiss.bs.modal', function () {
      that.$element.one('mouseup.dismiss.bs.modal', function (e) {
        if ($(e.target).is(that.$element)) that.ignoreBackdropClick = true
      })
    })

    this.backdrop(function () {
      var transition = $.support.transition && that.$element.hasClass('fade')

      if (!that.$element.parent().length) {
        that.$element.appendTo(that.$body) // don't move modals dom position
      }

      that.$element
        .show()
        .scrollTop(0)

      that.adjustDialog()

      if (transition) {
        that.$element[0].offsetWidth // force reflow
      }

      that.$element.addClass('in')

      that.enforceFocus()

      var e = $.Event('shown.bs.modal', { relatedTarget: _relatedTarget })

      transition ?
        that.$dialog // wait for modal to slide in
          .one('bsTransitionEnd', function () {
            that.$element.trigger('focus').trigger(e)
          })
          .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
        that.$element.trigger('focus').trigger(e)
    })
  }

  Modal.prototype.hide = function (e) {
    if (e) e.preventDefault()

    e = $.Event('hide.bs.modal')

    this.$element.trigger(e)

    if (!this.isShown || e.isDefaultPrevented()) return

    this.isShown = false

    this.escape()
    this.resize()

    $(document).off('focusin.bs.modal')

    this.$element
      .removeClass('in')
      .off('click.dismiss.bs.modal')
      .off('mouseup.dismiss.bs.modal')

    this.$dialog.off('mousedown.dismiss.bs.modal')

    $.support.transition && this.$element.hasClass('fade') ?
      this.$element
        .one('bsTransitionEnd', $.proxy(this.hideModal, this))
        .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
      this.hideModal()
  }

  Modal.prototype.enforceFocus = function () {
    $(document)
      .off('focusin.bs.modal') // guard against infinite focus loop
      .on('focusin.bs.modal', $.proxy(function (e) {
        if (document !== e.target &&
            this.$element[0] !== e.target &&
            !this.$element.has(e.target).length) {
          this.$element.trigger('focus')
        }
      }, this))
  }

  Modal.prototype.escape = function () {
    if (this.isShown && this.options.keyboard) {
      this.$element.on('keydown.dismiss.bs.modal', $.proxy(function (e) {
        e.which == 27 && this.hide()
      }, this))
    } else if (!this.isShown) {
      this.$element.off('keydown.dismiss.bs.modal')
    }
  }

  Modal.prototype.resize = function () {
    if (this.isShown) {
      $(window).on('resize.bs.modal', $.proxy(this.handleUpdate, this))
    } else {
      $(window).off('resize.bs.modal')
    }
  }

  Modal.prototype.hideModal = function () {
    var that = this
    this.$element.hide()
    this.backdrop(function () {
      that.$body.removeClass('modal-open')
      that.resetAdjustments()
      that.resetScrollbar()
      that.$element.trigger('hidden.bs.modal')
    })
  }

  Modal.prototype.removeBackdrop = function () {
    this.$backdrop && this.$backdrop.remove()
    this.$backdrop = null
  }

  Modal.prototype.backdrop = function (callback) {
    var that = this
    var animate = this.$element.hasClass('fade') ? 'fade' : ''

    if (this.isShown && this.options.backdrop) {
      var doAnimate = $.support.transition && animate

      this.$backdrop = $(document.createElement('div'))
        .addClass('modal-backdrop ' + animate)
        .appendTo(this.$body)

      this.$element.on('click.dismiss.bs.modal', $.proxy(function (e) {
        if (this.ignoreBackdropClick) {
          this.ignoreBackdropClick = false
          return
        }
        if (e.target !== e.currentTarget) return
        this.options.backdrop == 'static'
          ? this.$element[0].focus()
          : this.hide()
      }, this))

      if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

      this.$backdrop.addClass('in')

      if (!callback) return

      doAnimate ?
        this.$backdrop
          .one('bsTransitionEnd', callback)
          .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
        callback()

    } else if (!this.isShown && this.$backdrop) {
      this.$backdrop.removeClass('in')

      var callbackRemove = function () {
        that.removeBackdrop()
        callback && callback()
      }
      $.support.transition && this.$element.hasClass('fade') ?
        this.$backdrop
          .one('bsTransitionEnd', callbackRemove)
          .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
        callbackRemove()

    } else if (callback) {
      callback()
    }
  }

  // these following methods are used to handle overflowing modals

  Modal.prototype.handleUpdate = function () {
    this.adjustDialog()
  }

  Modal.prototype.adjustDialog = function () {
    var modalIsOverflowing = this.$element[0].scrollHeight > document.documentElement.clientHeight

    this.$element.css({
      paddingLeft:  !this.bodyIsOverflowing && modalIsOverflowing ? this.scrollbarWidth : '',
      paddingRight: this.bodyIsOverflowing && !modalIsOverflowing ? this.scrollbarWidth : ''
    })
  }

  Modal.prototype.resetAdjustments = function () {
    this.$element.css({
      paddingLeft: '',
      paddingRight: ''
    })
  }

  Modal.prototype.checkScrollbar = function () {
    var fullWindowWidth = window.innerWidth
    if (!fullWindowWidth) { // workaround for missing window.innerWidth in IE8
      var documentElementRect = document.documentElement.getBoundingClientRect()
      fullWindowWidth = documentElementRect.right - Math.abs(documentElementRect.left)
    }
    this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth
    this.scrollbarWidth = this.measureScrollbar()
  }

  Modal.prototype.setScrollbar = function () {
    var bodyPad = parseInt((this.$body.css('padding-right') || 0), 10)
    this.originalBodyPad = document.body.style.paddingRight || ''
    if (this.bodyIsOverflowing) this.$body.css('padding-right', bodyPad + this.scrollbarWidth)
  }

  Modal.prototype.resetScrollbar = function () {
    this.$body.css('padding-right', this.originalBodyPad)
  }

  Modal.prototype.measureScrollbar = function () { // thx walsh
    var scrollDiv = document.createElement('div')
    scrollDiv.className = 'modal-scrollbar-measure'
    this.$body.append(scrollDiv)
    var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth
    this.$body[0].removeChild(scrollDiv)
    return scrollbarWidth
  }


  // MODAL PLUGIN DEFINITION
  // =======================

  function Plugin(option, _relatedTarget) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.modal')
      var options = $.extend({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data) $this.data('bs.modal', (data = new Modal(this, options)))
      if (typeof option == 'string') data[option](_relatedTarget)
      else if (options.show) data.show(_relatedTarget)
    })
  }

  var old = $.fn.modal

  $.fn.modal             = Plugin
  $.fn.modal.Constructor = Modal


  // MODAL NO CONFLICT
  // =================

  $.fn.modal.noConflict = function () {
    $.fn.modal = old
    return this
  }


  // MODAL DATA-API
  // ==============

  $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
    var $this   = $(this)
    var href    = $this.attr('href')
    var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))) // strip for ie7
    var option  = $target.data('bs.modal') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href }, $target.data(), $this.data())

    if ($this.is('a')) e.preventDefault()

    $target.one('show.bs.modal', function (showEvent) {
      if (showEvent.isDefaultPrevented()) return // only register focus restorer if modal will actually get shown
      $target.one('hidden.bs.modal', function () {
        $this.is(':visible') && $this.trigger('focus')
      })
    })
    Plugin.call($target, option, this)
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: tooltip.js v3.3.7
 * http://getbootstrap.com/javascript/#tooltip
 * Inspired by the original jQuery.tipsy by Jason Frame
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // TOOLTIP PUBLIC CLASS DEFINITION
  // ===============================

  var Tooltip = function (element, options) {
    this.type       = null
    this.options    = null
    this.enabled    = null
    this.timeout    = null
    this.hoverState = null
    this.$element   = null
    this.inState    = null

    this.init('tooltip', element, options)
  }

  Tooltip.VERSION  = '3.3.7'

  Tooltip.TRANSITION_DURATION = 150

  Tooltip.DEFAULTS = {
    animation: true,
    placement: 'top',
    selector: false,
    template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
    trigger: 'hover focus',
    title: '',
    delay: 0,
    html: false,
    container: false,
    viewport: {
      selector: 'body',
      padding: 0
    }
  }

  Tooltip.prototype.init = function (type, element, options) {
    this.enabled   = true
    this.type      = type
    this.$element  = $(element)
    this.options   = this.getOptions(options)
    this.$viewport = this.options.viewport && $($.isFunction(this.options.viewport) ? this.options.viewport.call(this, this.$element) : (this.options.viewport.selector || this.options.viewport))
    this.inState   = { click: false, hover: false, focus: false }

    if (this.$element[0] instanceof document.constructor && !this.options.selector) {
      throw new Error('`selector` option must be specified when initializing ' + this.type + ' on the window.document object!')
    }

    var triggers = this.options.trigger.split(' ')

    for (var i = triggers.length; i--;) {
      var trigger = triggers[i]

      if (trigger == 'click') {
        this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this))
      } else if (trigger != 'manual') {
        var eventIn  = trigger == 'hover' ? 'mouseenter' : 'focusin'
        var eventOut = trigger == 'hover' ? 'mouseleave' : 'focusout'

        this.$element.on(eventIn  + '.' + this.type, this.options.selector, $.proxy(this.enter, this))
        this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this))
      }
    }

    this.options.selector ?
      (this._options = $.extend({}, this.options, { trigger: 'manual', selector: '' })) :
      this.fixTitle()
  }

  Tooltip.prototype.getDefaults = function () {
    return Tooltip.DEFAULTS
  }

  Tooltip.prototype.getOptions = function (options) {
    options = $.extend({}, this.getDefaults(), this.$element.data(), options)

    if (options.delay && typeof options.delay == 'number') {
      options.delay = {
        show: options.delay,
        hide: options.delay
      }
    }

    return options
  }

  Tooltip.prototype.getDelegateOptions = function () {
    var options  = {}
    var defaults = this.getDefaults()

    this._options && $.each(this._options, function (key, value) {
      if (defaults[key] != value) options[key] = value
    })

    return options
  }

  Tooltip.prototype.enter = function (obj) {
    var self = obj instanceof this.constructor ?
      obj : $(obj.currentTarget).data('bs.' + this.type)

    if (!self) {
      self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
      $(obj.currentTarget).data('bs.' + this.type, self)
    }

    if (obj instanceof $.Event) {
      self.inState[obj.type == 'focusin' ? 'focus' : 'hover'] = true
    }

    if (self.tip().hasClass('in') || self.hoverState == 'in') {
      self.hoverState = 'in'
      return
    }

    clearTimeout(self.timeout)

    self.hoverState = 'in'

    if (!self.options.delay || !self.options.delay.show) return self.show()

    self.timeout = setTimeout(function () {
      if (self.hoverState == 'in') self.show()
    }, self.options.delay.show)
  }

  Tooltip.prototype.isInStateTrue = function () {
    for (var key in this.inState) {
      if (this.inState[key]) return true
    }

    return false
  }

  Tooltip.prototype.leave = function (obj) {
    var self = obj instanceof this.constructor ?
      obj : $(obj.currentTarget).data('bs.' + this.type)

    if (!self) {
      self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
      $(obj.currentTarget).data('bs.' + this.type, self)
    }

    if (obj instanceof $.Event) {
      self.inState[obj.type == 'focusout' ? 'focus' : 'hover'] = false
    }

    if (self.isInStateTrue()) return

    clearTimeout(self.timeout)

    self.hoverState = 'out'

    if (!self.options.delay || !self.options.delay.hide) return self.hide()

    self.timeout = setTimeout(function () {
      if (self.hoverState == 'out') self.hide()
    }, self.options.delay.hide)
  }

  Tooltip.prototype.show = function () {
    var e = $.Event('show.bs.' + this.type)

    if (this.hasContent() && this.enabled) {
      this.$element.trigger(e)

      var inDom = $.contains(this.$element[0].ownerDocument.documentElement, this.$element[0])
      if (e.isDefaultPrevented() || !inDom) return
      var that = this

      var $tip = this.tip()

      var tipId = this.getUID(this.type)

      this.setContent()
      $tip.attr('id', tipId)
      this.$element.attr('aria-describedby', tipId)

      if (this.options.animation) $tip.addClass('fade')

      var placement = typeof this.options.placement == 'function' ?
        this.options.placement.call(this, $tip[0], this.$element[0]) :
        this.options.placement

      var autoToken = /\s?auto?\s?/i
      var autoPlace = autoToken.test(placement)
      if (autoPlace) placement = placement.replace(autoToken, '') || 'top'

      $tip
        .detach()
        .css({ top: 0, left: 0, display: 'block' })
        .addClass(placement)
        .data('bs.' + this.type, this)

      this.options.container ? $tip.appendTo(this.options.container) : $tip.insertAfter(this.$element)
      this.$element.trigger('inserted.bs.' + this.type)

      var pos          = this.getPosition()
      var actualWidth  = $tip[0].offsetWidth
      var actualHeight = $tip[0].offsetHeight

      if (autoPlace) {
        var orgPlacement = placement
        var viewportDim = this.getPosition(this.$viewport)

        placement = placement == 'bottom' && pos.bottom + actualHeight > viewportDim.bottom ? 'top'    :
                    placement == 'top'    && pos.top    - actualHeight < viewportDim.top    ? 'bottom' :
                    placement == 'right'  && pos.right  + actualWidth  > viewportDim.width  ? 'left'   :
                    placement == 'left'   && pos.left   - actualWidth  < viewportDim.left   ? 'right'  :
                    placement

        $tip
          .removeClass(orgPlacement)
          .addClass(placement)
      }

      var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight)

      this.applyPlacement(calculatedOffset, placement)

      var complete = function () {
        var prevHoverState = that.hoverState
        that.$element.trigger('shown.bs.' + that.type)
        that.hoverState = null

        if (prevHoverState == 'out') that.leave(that)
      }

      $.support.transition && this.$tip.hasClass('fade') ?
        $tip
          .one('bsTransitionEnd', complete)
          .emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
        complete()
    }
  }

  Tooltip.prototype.applyPlacement = function (offset, placement) {
    var $tip   = this.tip()
    var width  = $tip[0].offsetWidth
    var height = $tip[0].offsetHeight

    // manually read margins because getBoundingClientRect includes difference
    var marginTop = parseInt($tip.css('margin-top'), 10)
    var marginLeft = parseInt($tip.css('margin-left'), 10)

    // we must check for NaN for ie 8/9
    if (isNaN(marginTop))  marginTop  = 0
    if (isNaN(marginLeft)) marginLeft = 0

    offset.top  += marginTop
    offset.left += marginLeft

    // $.fn.offset doesn't round pixel values
    // so we use setOffset directly with our own function B-0
    $.offset.setOffset($tip[0], $.extend({
      using: function (props) {
        $tip.css({
          top: Math.round(props.top),
          left: Math.round(props.left)
        })
      }
    }, offset), 0)

    $tip.addClass('in')

    // check to see if placing tip in new offset caused the tip to resize itself
    var actualWidth  = $tip[0].offsetWidth
    var actualHeight = $tip[0].offsetHeight

    if (placement == 'top' && actualHeight != height) {
      offset.top = offset.top + height - actualHeight
    }

    var delta = this.getViewportAdjustedDelta(placement, offset, actualWidth, actualHeight)

    if (delta.left) offset.left += delta.left
    else offset.top += delta.top

    var isVertical          = /top|bottom/.test(placement)
    var arrowDelta          = isVertical ? delta.left * 2 - width + actualWidth : delta.top * 2 - height + actualHeight
    var arrowOffsetPosition = isVertical ? 'offsetWidth' : 'offsetHeight'

    $tip.offset(offset)
    this.replaceArrow(arrowDelta, $tip[0][arrowOffsetPosition], isVertical)
  }

  Tooltip.prototype.replaceArrow = function (delta, dimension, isVertical) {
    this.arrow()
      .css(isVertical ? 'left' : 'top', 50 * (1 - delta / dimension) + '%')
      .css(isVertical ? 'top' : 'left', '')
  }

  Tooltip.prototype.setContent = function () {
    var $tip  = this.tip()
    var title = this.getTitle()

    $tip.find('.tooltip-inner')[this.options.html ? 'html' : 'text'](title)
    $tip.removeClass('fade in top bottom left right')
  }

  Tooltip.prototype.hide = function (callback) {
    var that = this
    var $tip = $(this.$tip)
    var e    = $.Event('hide.bs.' + this.type)

    function complete() {
      if (that.hoverState != 'in') $tip.detach()
      if (that.$element) { // TODO: Check whether guarding this code with this `if` is really necessary.
        that.$element
          .removeAttr('aria-describedby')
          .trigger('hidden.bs.' + that.type)
      }
      callback && callback()
    }

    this.$element.trigger(e)

    if (e.isDefaultPrevented()) return

    $tip.removeClass('in')

    $.support.transition && $tip.hasClass('fade') ?
      $tip
        .one('bsTransitionEnd', complete)
        .emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
      complete()

    this.hoverState = null

    return this
  }

  Tooltip.prototype.fixTitle = function () {
    var $e = this.$element
    if ($e.attr('title') || typeof $e.attr('data-original-title') != 'string') {
      $e.attr('data-original-title', $e.attr('title') || '').attr('title', '')
    }
  }

  Tooltip.prototype.hasContent = function () {
    return this.getTitle()
  }

  Tooltip.prototype.getPosition = function ($element) {
    $element   = $element || this.$element

    var el     = $element[0]
    var isBody = el.tagName == 'BODY'

    var elRect    = el.getBoundingClientRect()
    if (elRect.width == null) {
      // width and height are missing in IE8, so compute them manually; see https://github.com/twbs/bootstrap/issues/14093
      elRect = $.extend({}, elRect, { width: elRect.right - elRect.left, height: elRect.bottom - elRect.top })
    }
    var isSvg = window.SVGElement && el instanceof window.SVGElement
    // Avoid using $.offset() on SVGs since it gives incorrect results in jQuery 3.
    // See https://github.com/twbs/bootstrap/issues/20280
    var elOffset  = isBody ? { top: 0, left: 0 } : (isSvg ? null : $element.offset())
    var scroll    = { scroll: isBody ? document.documentElement.scrollTop || document.body.scrollTop : $element.scrollTop() }
    var outerDims = isBody ? { width: $(window).width(), height: $(window).height() } : null

    return $.extend({}, elRect, scroll, outerDims, elOffset)
  }

  Tooltip.prototype.getCalculatedOffset = function (placement, pos, actualWidth, actualHeight) {
    return placement == 'bottom' ? { top: pos.top + pos.height,   left: pos.left + pos.width / 2 - actualWidth / 2 } :
           placement == 'top'    ? { top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2 } :
           placement == 'left'   ? { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth } :
        /* placement == 'right' */ { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width }

  }

  Tooltip.prototype.getViewportAdjustedDelta = function (placement, pos, actualWidth, actualHeight) {
    var delta = { top: 0, left: 0 }
    if (!this.$viewport) return delta

    var viewportPadding = this.options.viewport && this.options.viewport.padding || 0
    var viewportDimensions = this.getPosition(this.$viewport)

    if (/right|left/.test(placement)) {
      var topEdgeOffset    = pos.top - viewportPadding - viewportDimensions.scroll
      var bottomEdgeOffset = pos.top + viewportPadding - viewportDimensions.scroll + actualHeight
      if (topEdgeOffset < viewportDimensions.top) { // top overflow
        delta.top = viewportDimensions.top - topEdgeOffset
      } else if (bottomEdgeOffset > viewportDimensions.top + viewportDimensions.height) { // bottom overflow
        delta.top = viewportDimensions.top + viewportDimensions.height - bottomEdgeOffset
      }
    } else {
      var leftEdgeOffset  = pos.left - viewportPadding
      var rightEdgeOffset = pos.left + viewportPadding + actualWidth
      if (leftEdgeOffset < viewportDimensions.left) { // left overflow
        delta.left = viewportDimensions.left - leftEdgeOffset
      } else if (rightEdgeOffset > viewportDimensions.right) { // right overflow
        delta.left = viewportDimensions.left + viewportDimensions.width - rightEdgeOffset
      }
    }

    return delta
  }

  Tooltip.prototype.getTitle = function () {
    var title
    var $e = this.$element
    var o  = this.options

    title = $e.attr('data-original-title')
      || (typeof o.title == 'function' ? o.title.call($e[0]) :  o.title)

    return title
  }

  Tooltip.prototype.getUID = function (prefix) {
    do prefix += ~~(Math.random() * 1000000)
    while (document.getElementById(prefix))
    return prefix
  }

  Tooltip.prototype.tip = function () {
    if (!this.$tip) {
      this.$tip = $(this.options.template)
      if (this.$tip.length != 1) {
        throw new Error(this.type + ' `template` option must consist of exactly 1 top-level element!')
      }
    }
    return this.$tip
  }

  Tooltip.prototype.arrow = function () {
    return (this.$arrow = this.$arrow || this.tip().find('.tooltip-arrow'))
  }

  Tooltip.prototype.enable = function () {
    this.enabled = true
  }

  Tooltip.prototype.disable = function () {
    this.enabled = false
  }

  Tooltip.prototype.toggleEnabled = function () {
    this.enabled = !this.enabled
  }

  Tooltip.prototype.toggle = function (e) {
    var self = this
    if (e) {
      self = $(e.currentTarget).data('bs.' + this.type)
      if (!self) {
        self = new this.constructor(e.currentTarget, this.getDelegateOptions())
        $(e.currentTarget).data('bs.' + this.type, self)
      }
    }

    if (e) {
      self.inState.click = !self.inState.click
      if (self.isInStateTrue()) self.enter(self)
      else self.leave(self)
    } else {
      self.tip().hasClass('in') ? self.leave(self) : self.enter(self)
    }
  }

  Tooltip.prototype.destroy = function () {
    var that = this
    clearTimeout(this.timeout)
    this.hide(function () {
      that.$element.off('.' + that.type).removeData('bs.' + that.type)
      if (that.$tip) {
        that.$tip.detach()
      }
      that.$tip = null
      that.$arrow = null
      that.$viewport = null
      that.$element = null
    })
  }


  // TOOLTIP PLUGIN DEFINITION
  // =========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.tooltip')
      var options = typeof option == 'object' && option

      if (!data && /destroy|hide/.test(option)) return
      if (!data) $this.data('bs.tooltip', (data = new Tooltip(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.tooltip

  $.fn.tooltip             = Plugin
  $.fn.tooltip.Constructor = Tooltip


  // TOOLTIP NO CONFLICT
  // ===================

  $.fn.tooltip.noConflict = function () {
    $.fn.tooltip = old
    return this
  }

}(jQuery);

/* ========================================================================
 * Bootstrap: popover.js v3.3.7
 * http://getbootstrap.com/javascript/#popovers
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // POPOVER PUBLIC CLASS DEFINITION
  // ===============================

  var Popover = function (element, options) {
    this.init('popover', element, options)
  }

  if (!$.fn.tooltip) throw new Error('Popover requires tooltip.js')

  Popover.VERSION  = '3.3.7'

  Popover.DEFAULTS = $.extend({}, $.fn.tooltip.Constructor.DEFAULTS, {
    placement: 'right',
    trigger: 'click',
    content: '',
    template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
  })


  // NOTE: POPOVER EXTENDS tooltip.js
  // ================================

  Popover.prototype = $.extend({}, $.fn.tooltip.Constructor.prototype)

  Popover.prototype.constructor = Popover

  Popover.prototype.getDefaults = function () {
    return Popover.DEFAULTS
  }

  Popover.prototype.setContent = function () {
    var $tip    = this.tip()
    var title   = this.getTitle()
    var content = this.getContent()

    $tip.find('.popover-title')[this.options.html ? 'html' : 'text'](title)
    $tip.find('.popover-content').children().detach().end()[ // we use append for html objects to maintain js events
      this.options.html ? (typeof content == 'string' ? 'html' : 'append') : 'text'
    ](content)

    $tip.removeClass('fade top bottom left right in')

    // IE8 doesn't accept hiding via the `:empty` pseudo selector, we have to do
    // this manually by checking the contents.
    if (!$tip.find('.popover-title').html()) $tip.find('.popover-title').hide()
  }

  Popover.prototype.hasContent = function () {
    return this.getTitle() || this.getContent()
  }

  Popover.prototype.getContent = function () {
    var $e = this.$element
    var o  = this.options

    return $e.attr('data-content')
      || (typeof o.content == 'function' ?
            o.content.call($e[0]) :
            o.content)
  }

  Popover.prototype.arrow = function () {
    return (this.$arrow = this.$arrow || this.tip().find('.arrow'))
  }


  // POPOVER PLUGIN DEFINITION
  // =========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.popover')
      var options = typeof option == 'object' && option

      if (!data && /destroy|hide/.test(option)) return
      if (!data) $this.data('bs.popover', (data = new Popover(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.popover

  $.fn.popover             = Plugin
  $.fn.popover.Constructor = Popover


  // POPOVER NO CONFLICT
  // ===================

  $.fn.popover.noConflict = function () {
    $.fn.popover = old
    return this
  }

}(jQuery);

/* ========================================================================
 * Bootstrap: scrollspy.js v3.3.7
 * http://getbootstrap.com/javascript/#scrollspy
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // SCROLLSPY CLASS DEFINITION
  // ==========================

  function ScrollSpy(element, options) {
    this.$body          = $(document.body)
    this.$scrollElement = $(element).is(document.body) ? $(window) : $(element)
    this.options        = $.extend({}, ScrollSpy.DEFAULTS, options)
    this.selector       = (this.options.target || '') + ' .nav li > a'
    this.offsets        = []
    this.targets        = []
    this.activeTarget   = null
    this.scrollHeight   = 0

    this.$scrollElement.on('scroll.bs.scrollspy', $.proxy(this.process, this))
    this.refresh()
    this.process()
  }

  ScrollSpy.VERSION  = '3.3.7'

  ScrollSpy.DEFAULTS = {
    offset: 10
  }

  ScrollSpy.prototype.getScrollHeight = function () {
    return this.$scrollElement[0].scrollHeight || Math.max(this.$body[0].scrollHeight, document.documentElement.scrollHeight)
  }

  ScrollSpy.prototype.refresh = function () {
    var that          = this
    var offsetMethod  = 'offset'
    var offsetBase    = 0

    this.offsets      = []
    this.targets      = []
    this.scrollHeight = this.getScrollHeight()

    if (!$.isWindow(this.$scrollElement[0])) {
      offsetMethod = 'position'
      offsetBase   = this.$scrollElement.scrollTop()
    }

    this.$body
      .find(this.selector)
      .map(function () {
        var $el   = $(this)
        var href  = $el.data('target') || $el.attr('href')
        var $href = /^#./.test(href) && $(href)

        return ($href
          && $href.length
          && $href.is(':visible')
          && [[$href[offsetMethod]().top + offsetBase, href]]) || null
      })
      .sort(function (a, b) { return a[0] - b[0] })
      .each(function () {
        that.offsets.push(this[0])
        that.targets.push(this[1])
      })
  }

  ScrollSpy.prototype.process = function () {
    var scrollTop    = this.$scrollElement.scrollTop() + this.options.offset
    var scrollHeight = this.getScrollHeight()
    var maxScroll    = this.options.offset + scrollHeight - this.$scrollElement.height()
    var offsets      = this.offsets
    var targets      = this.targets
    var activeTarget = this.activeTarget
    var i

    if (this.scrollHeight != scrollHeight) {
      this.refresh()
    }

    if (scrollTop >= maxScroll) {
      return activeTarget != (i = targets[targets.length - 1]) && this.activate(i)
    }

    if (activeTarget && scrollTop < offsets[0]) {
      this.activeTarget = null
      return this.clear()
    }

    for (i = offsets.length; i--;) {
      activeTarget != targets[i]
        && scrollTop >= offsets[i]
        && (offsets[i + 1] === undefined || scrollTop < offsets[i + 1])
        && this.activate(targets[i])
    }
  }

  ScrollSpy.prototype.activate = function (target) {
    this.activeTarget = target

    this.clear()

    var selector = this.selector +
      '[data-target="' + target + '"],' +
      this.selector + '[href="' + target + '"]'

    var active = $(selector)
      .parents('li')
      .addClass('active')

    if (active.parent('.dropdown-menu').length) {
      active = active
        .closest('li.dropdown')
        .addClass('active')
    }

    active.trigger('activate.bs.scrollspy')
  }

  ScrollSpy.prototype.clear = function () {
    $(this.selector)
      .parentsUntil(this.options.target, '.active')
      .removeClass('active')
  }


  // SCROLLSPY PLUGIN DEFINITION
  // ===========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.scrollspy')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.scrollspy', (data = new ScrollSpy(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.scrollspy

  $.fn.scrollspy             = Plugin
  $.fn.scrollspy.Constructor = ScrollSpy


  // SCROLLSPY NO CONFLICT
  // =====================

  $.fn.scrollspy.noConflict = function () {
    $.fn.scrollspy = old
    return this
  }


  // SCROLLSPY DATA-API
  // ==================

  $(window).on('load.bs.scrollspy.data-api', function () {
    $('[data-spy="scroll"]').each(function () {
      var $spy = $(this)
      Plugin.call($spy, $spy.data())
    })
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: tab.js v3.3.7
 * http://getbootstrap.com/javascript/#tabs
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // TAB CLASS DEFINITION
  // ====================

  var Tab = function (element) {
    // jscs:disable requireDollarBeforejQueryAssignment
    this.element = $(element)
    // jscs:enable requireDollarBeforejQueryAssignment
  }

  Tab.VERSION = '3.3.7'

  Tab.TRANSITION_DURATION = 150

  Tab.prototype.show = function () {
    var $this    = this.element
    var $ul      = $this.closest('ul:not(.dropdown-menu)')
    var selector = $this.data('target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
    }

    if ($this.parent('li').hasClass('active')) return

    var $previous = $ul.find('.active:last a')
    var hideEvent = $.Event('hide.bs.tab', {
      relatedTarget: $this[0]
    })
    var showEvent = $.Event('show.bs.tab', {
      relatedTarget: $previous[0]
    })

    $previous.trigger(hideEvent)
    $this.trigger(showEvent)

    if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented()) return

    var $target = $(selector)

    this.activate($this.closest('li'), $ul)
    this.activate($target, $target.parent(), function () {
      $previous.trigger({
        type: 'hidden.bs.tab',
        relatedTarget: $this[0]
      })
      $this.trigger({
        type: 'shown.bs.tab',
        relatedTarget: $previous[0]
      })
    })
  }

  Tab.prototype.activate = function (element, container, callback) {
    var $active    = container.find('> .active')
    var transition = callback
      && $.support.transition
      && ($active.length && $active.hasClass('fade') || !!container.find('> .fade').length)

    function next() {
      $active
        .removeClass('active')
        .find('> .dropdown-menu > .active')
          .removeClass('active')
        .end()
        .find('[data-toggle="tab"]')
          .attr('aria-expanded', false)

      element
        .addClass('active')
        .find('[data-toggle="tab"]')
          .attr('aria-expanded', true)

      if (transition) {
        element[0].offsetWidth // reflow for transition
        element.addClass('in')
      } else {
        element.removeClass('fade')
      }

      if (element.parent('.dropdown-menu').length) {
        element
          .closest('li.dropdown')
            .addClass('active')
          .end()
          .find('[data-toggle="tab"]')
            .attr('aria-expanded', true)
      }

      callback && callback()
    }

    $active.length && transition ?
      $active
        .one('bsTransitionEnd', next)
        .emulateTransitionEnd(Tab.TRANSITION_DURATION) :
      next()

    $active.removeClass('in')
  }


  // TAB PLUGIN DEFINITION
  // =====================

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.tab')

      if (!data) $this.data('bs.tab', (data = new Tab(this)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.tab

  $.fn.tab             = Plugin
  $.fn.tab.Constructor = Tab


  // TAB NO CONFLICT
  // ===============

  $.fn.tab.noConflict = function () {
    $.fn.tab = old
    return this
  }


  // TAB DATA-API
  // ============

  var clickHandler = function (e) {
    e.preventDefault()
    Plugin.call($(this), 'show')
  }

  $(document)
    .on('click.bs.tab.data-api', '[data-toggle="tab"]', clickHandler)
    .on('click.bs.tab.data-api', '[data-toggle="pill"]', clickHandler)

}(jQuery);

/* ========================================================================
 * Bootstrap: affix.js v3.3.7
 * http://getbootstrap.com/javascript/#affix
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // AFFIX CLASS DEFINITION
  // ======================

  var Affix = function (element, options) {
    this.options = $.extend({}, Affix.DEFAULTS, options)

    this.$target = $(this.options.target)
      .on('scroll.bs.affix.data-api', $.proxy(this.checkPosition, this))
      .on('click.bs.affix.data-api',  $.proxy(this.checkPositionWithEventLoop, this))

    this.$element     = $(element)
    this.affixed      = null
    this.unpin        = null
    this.pinnedOffset = null

    this.checkPosition()
  }

  Affix.VERSION  = '3.3.7'

  Affix.RESET    = 'affix affix-top affix-bottom'

  Affix.DEFAULTS = {
    offset: 0,
    target: window
  }

  Affix.prototype.getState = function (scrollHeight, height, offsetTop, offsetBottom) {
    var scrollTop    = this.$target.scrollTop()
    var position     = this.$element.offset()
    var targetHeight = this.$target.height()

    if (offsetTop != null && this.affixed == 'top') return scrollTop < offsetTop ? 'top' : false

    if (this.affixed == 'bottom') {
      if (offsetTop != null) return (scrollTop + this.unpin <= position.top) ? false : 'bottom'
      return (scrollTop + targetHeight <= scrollHeight - offsetBottom) ? false : 'bottom'
    }

    var initializing   = this.affixed == null
    var colliderTop    = initializing ? scrollTop : position.top
    var colliderHeight = initializing ? targetHeight : height

    if (offsetTop != null && scrollTop <= offsetTop) return 'top'
    if (offsetBottom != null && (colliderTop + colliderHeight >= scrollHeight - offsetBottom)) return 'bottom'

    return false
  }

  Affix.prototype.getPinnedOffset = function () {
    if (this.pinnedOffset) return this.pinnedOffset
    this.$element.removeClass(Affix.RESET).addClass('affix')
    var scrollTop = this.$target.scrollTop()
    var position  = this.$element.offset()
    return (this.pinnedOffset = position.top - scrollTop)
  }

  Affix.prototype.checkPositionWithEventLoop = function () {
    setTimeout($.proxy(this.checkPosition, this), 1)
  }

  Affix.prototype.checkPosition = function () {
    if (!this.$element.is(':visible')) return

    var height       = this.$element.height()
    var offset       = this.options.offset
    var offsetTop    = offset.top
    var offsetBottom = offset.bottom
    var scrollHeight = Math.max($(document).height(), $(document.body).height())

    if (typeof offset != 'object')         offsetBottom = offsetTop = offset
    if (typeof offsetTop == 'function')    offsetTop    = offset.top(this.$element)
    if (typeof offsetBottom == 'function') offsetBottom = offset.bottom(this.$element)

    var affix = this.getState(scrollHeight, height, offsetTop, offsetBottom)

    if (this.affixed != affix) {
      if (this.unpin != null) this.$element.css('top', '')

      var affixType = 'affix' + (affix ? '-' + affix : '')
      var e         = $.Event(affixType + '.bs.affix')

      this.$element.trigger(e)

      if (e.isDefaultPrevented()) return

      this.affixed = affix
      this.unpin = affix == 'bottom' ? this.getPinnedOffset() : null

      this.$element
        .removeClass(Affix.RESET)
        .addClass(affixType)
        .trigger(affixType.replace('affix', 'affixed') + '.bs.affix')
    }

    if (affix == 'bottom') {
      this.$element.offset({
        top: scrollHeight - height - offsetBottom
      })
    }
  }


  // AFFIX PLUGIN DEFINITION
  // =======================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.affix')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.affix', (data = new Affix(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.affix

  $.fn.affix             = Plugin
  $.fn.affix.Constructor = Affix


  // AFFIX NO CONFLICT
  // =================

  $.fn.affix.noConflict = function () {
    $.fn.affix = old
    return this
  }


  // AFFIX DATA-API
  // ==============

  $(window).on('load', function () {
    $('[data-spy="affix"]').each(function () {
      var $spy = $(this)
      var data = $spy.data()

      data.offset = data.offset || {}

      if (data.offsetBottom != null) data.offset.bottom = data.offsetBottom
      if (data.offsetTop    != null) data.offset.top    = data.offsetTop

      Plugin.call($spy, data)
    })
  })

}(jQuery);

},{}],12:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && !isFinite(value)) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b)) {
    return a === b;
  }
  var aIsArgs = isArguments(a),
      bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  var ka = objectKeys(a),
      kb = objectKeys(b),
      key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":17}],13:[function(require,module,exports){

},{}],14:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],15:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],16:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],17:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":16,"_process":14,"inherits":15}],18:[function(require,module,exports){
/*!
  Copyright (c) 2016 Jed Watson.
  Licensed under the MIT License (MIT), see
  http://jedwatson.github.io/classnames
*/
/* global define */

(function () {
	'use strict';

	var hasOwn = {}.hasOwnProperty;

	function classNames () {
		var classes = [];

		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			if (!arg) continue;

			var argType = typeof arg;

			if (argType === 'string' || argType === 'number') {
				classes.push(arg);
			} else if (Array.isArray(arg)) {
				classes.push(classNames.apply(null, arg));
			} else if (argType === 'object') {
				for (var key in arg) {
					if (hasOwn.call(arg, key) && arg[key]) {
						classes.push(key);
					}
				}
			}
		}

		return classes.join(' ');
	}

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = classNames;
	} else if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {
		// register as 'classnames', consistent with npm package name
		define('classnames', [], function () {
			return classNames;
		});
	} else {
		window.classNames = classNames;
	}
}());

},{}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var isValidString = function isValidString(param) {
  return typeof param === 'string' && param.length > 0;
};

var startsWith = function startsWith(string, start) {
  return string[0] === start;
};

var isSelector = function isSelector(param) {
  return isValidString(param) && (startsWith(param, '.') || startsWith(param, '#'));
};

var node = function node(h) {
  return function (tagName) {
    return function (first) {
      for (var _len = arguments.length, rest = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        rest[_key - 1] = arguments[_key];
      }

      if (isSelector(first)) {
        return h.apply(undefined, [tagName + first].concat(rest));
      } else if (typeof first === 'undefined') {
        return h(tagName);
      } else {
        return h.apply(undefined, [tagName, first].concat(rest));
      }
    };
  };
};

var TAG_NAMES = ['a', 'abbr', 'acronym', 'address', 'applet', 'area', 'article', 'aside', 'audio', 'b', 'base', 'basefont', 'bdi', 'bdo', 'bgsound', 'big', 'blink', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'command', 'content', 'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'dir', 'div', 'dl', 'dt', 'element', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'image', 'img', 'input', 'ins', 'isindex', 'kbd', 'keygen', 'label', 'legend', 'li', 'link', 'listing', 'main', 'map', 'mark', 'marquee', 'math', 'menu', 'menuitem', 'meta', 'meter', 'multicol', 'nav', 'nextid', 'nobr', 'noembed', 'noframes', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture', 'plaintext', 'pre', 'progress', 'q', 'rb', 'rbc', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp', 'script', 'section', 'select', 'shadow', 'small', 'source', 'spacer', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'svg', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'tt', 'u', 'ul', 'var', 'video', 'wbr', 'xmp'];

exports['default'] = function (h) {
  var createTag = node(h);
  var exported = { TAG_NAMES: TAG_NAMES, isSelector: isSelector, createTag: createTag };
  TAG_NAMES.forEach(function (n) {
    exported[n] = createTag(n);
  });
  return exported;
};

module.exports = exports['default'];
},{}],20:[function(require,module,exports){
var split = require('browser-split')
var ClassList = require('class-list')

var w = typeof window === 'undefined' ? require('html-element') : window
var document = w.document
var Text = w.Text

function context () {

  var cleanupFuncs = []

  function h() {
    var args = [].slice.call(arguments), e = null
    function item (l) {
      var r
      function parseClass (string) {
        // Our minimal parser doesn’t understand escaping CSS special
        // characters like `#`. Don’t use them. More reading:
        // https://mathiasbynens.be/notes/css-escapes .

        var m = split(string, /([\.#]?[^\s#.]+)/)
        if(/^\.|#/.test(m[1]))
          e = document.createElement('div')
        forEach(m, function (v) {
          var s = v.substring(1,v.length)
          if(!v) return
          if(!e)
            e = document.createElement(v)
          else if (v[0] === '.')
            ClassList(e).add(s)
          else if (v[0] === '#')
            e.setAttribute('id', s)
        })
      }

      if(l == null)
        ;
      else if('string' === typeof l) {
        if(!e)
          parseClass(l)
        else
          e.appendChild(r = document.createTextNode(l))
      }
      else if('number' === typeof l
        || 'boolean' === typeof l
        || l instanceof Date
        || l instanceof RegExp ) {
          e.appendChild(r = document.createTextNode(l.toString()))
      }
      //there might be a better way to handle this...
      else if (isArray(l))
        forEach(l, item)
      else if(isNode(l))
        e.appendChild(r = l)
      else if(l instanceof Text)
        e.appendChild(r = l)
      else if ('object' === typeof l) {
        for (var k in l) {
          if('function' === typeof l[k]) {
            if(/^on\w+/.test(k)) {
              (function (k, l) { // capture k, l in the closure
                if (e.addEventListener){
                  e.addEventListener(k.substring(2), l[k], false)
                  cleanupFuncs.push(function(){
                    e.removeEventListener(k.substring(2), l[k], false)
                  })
                }else{
                  e.attachEvent(k, l[k])
                  cleanupFuncs.push(function(){
                    e.detachEvent(k, l[k])
                  })
                }
              })(k, l)
            } else {
              // observable
              e[k] = l[k]()
              cleanupFuncs.push(l[k](function (v) {
                e[k] = v
              }))
            }
          }
          else if(k === 'style') {
            if('string' === typeof l[k]) {
              e.style.cssText = l[k]
            }else{
              for (var s in l[k]) (function(s, v) {
                if('function' === typeof v) {
                  // observable
                  e.style.setProperty(s, v())
                  cleanupFuncs.push(v(function (val) {
                    e.style.setProperty(s, val)
                  }))
                } else
                  var match = l[k][s].match(/(.*)\W+!important\W*$/);
                  if (match) {
                    e.style.setProperty(s, match[1], 'important')
                  } else {
                    e.style.setProperty(s, l[k][s])
                  }
              })(s, l[k][s])
            }
          } else if(k === 'attrs') {
            for (var v in l[k]) {
              e.setAttribute(v, l[k][v])
            }
          }
          else if (k.substr(0, 5) === "data-") {
            e.setAttribute(k, l[k])
          } else {
            e[k] = l[k]
          }
        }
      } else if ('function' === typeof l) {
        //assume it's an observable!
        var v = l()
        e.appendChild(r = isNode(v) ? v : document.createTextNode(v))

        cleanupFuncs.push(l(function (v) {
          if(isNode(v) && r.parentElement)
            r.parentElement.replaceChild(v, r), r = v
          else
            r.textContent = v
        }))
      }

      return r
    }
    while(args.length)
      item(args.shift())

    return e
  }

  h.cleanup = function () {
    for (var i = 0; i < cleanupFuncs.length; i++){
      cleanupFuncs[i]()
    }
    cleanupFuncs.length = 0
  }

  return h
}

var h = module.exports = context()
h.context = context

function isNode (el) {
  return el && el.nodeName && el.nodeType
}

function forEach (arr, fn) {
  if (arr.forEach) return arr.forEach(fn)
  for (var i = 0; i < arr.length; i++) fn(arr[i], i)
}

function isArray (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]'
}



},{"browser-split":21,"class-list":22,"html-element":13}],21:[function(require,module,exports){
/*!
 * Cross-Browser Split 1.1.1
 * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
 * Available under the MIT License
 * ECMAScript compliant, uniform cross-browser split method
 */

/**
 * Splits a string into an array of strings using a regex or string separator. Matches of the
 * separator are not included in the result array. However, if `separator` is a regex that contains
 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
 * cross-browser.
 * @param {String} str String to split.
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 * @example
 *
 * // Basic use
 * split('a b c d', ' ');
 * // -> ['a', 'b', 'c', 'd']
 *
 * // With limit
 * split('a b c d', ' ', 2);
 * // -> ['a', 'b']
 *
 * // Backreferences in result array
 * split('..word1 word2..', /([a-z]+)(\d+)/i);
 * // -> ['..', 'word', '1', ' ', 'word', '2', '..']
 */
module.exports = (function split(undef) {

  var nativeSplit = String.prototype.split,
    compliantExecNpcg = /()??/.exec("")[1] === undef,
    // NPCG: nonparticipating capturing group
    self;

  self = function(str, separator, limit) {
    // If `separator` is not a regex, use `nativeSplit`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
      return nativeSplit.call(str, separator, limit);
    }
    var output = [],
      flags = (separator.ignoreCase ? "i" : "") + (separator.multiline ? "m" : "") + (separator.extended ? "x" : "") + // Proposed for ES6
      (separator.sticky ? "y" : ""),
      // Firefox 3+
      lastLastIndex = 0,
      // Make `global` and avoid `lastIndex` issues by working with a copy
      separator = new RegExp(separator.source, flags + "g"),
      separator2, match, lastIndex, lastLength;
    str += ""; // Type-convert
    if (!compliantExecNpcg) {
      // Doesn't need flags gy, but they don't hurt
      separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
    }
    /* Values for `limit`, per the spec:
     * If undefined: 4294967295 // Math.pow(2, 32) - 1
     * If 0, Infinity, or NaN: 0
     * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
     * If negative number: 4294967296 - Math.floor(Math.abs(limit))
     * If other: Type-convert, then use the above rules
     */
    limit = limit === undef ? -1 >>> 0 : // Math.pow(2, 32) - 1
    limit >>> 0; // ToUint32(limit)
    while (match = separator.exec(str)) {
      // `separator.lastIndex` is not reliable cross-browser
      lastIndex = match.index + match[0].length;
      if (lastIndex > lastLastIndex) {
        output.push(str.slice(lastLastIndex, match.index));
        // Fix browsers whose `exec` methods don't consistently return `undefined` for
        // nonparticipating capturing groups
        if (!compliantExecNpcg && match.length > 1) {
          match[0].replace(separator2, function() {
            for (var i = 1; i < arguments.length - 2; i++) {
              if (arguments[i] === undef) {
                match[i] = undef;
              }
            }
          });
        }
        if (match.length > 1 && match.index < str.length) {
          Array.prototype.push.apply(output, match.slice(1));
        }
        lastLength = match[0].length;
        lastLastIndex = lastIndex;
        if (output.length >= limit) {
          break;
        }
      }
      if (separator.lastIndex === match.index) {
        separator.lastIndex++; // Avoid an infinite loop
      }
    }
    if (lastLastIndex === str.length) {
      if (lastLength || !separator.test("")) {
        output.push("");
      }
    } else {
      output.push(str.slice(lastLastIndex));
    }
    return output.length > limit ? output.slice(0, limit) : output;
  };

  return self;
})();

},{}],22:[function(require,module,exports){
// contains, add, remove, toggle
var indexof = require('indexof')

module.exports = ClassList

function ClassList(elem) {
    var cl = elem.classList

    if (cl) {
        return cl
    }

    var classList = {
        add: add
        , remove: remove
        , contains: contains
        , toggle: toggle
        , toString: $toString
        , length: 0
        , item: item
    }

    return classList

    function add(token) {
        var list = getTokens()
        if (indexof(list, token) > -1) {
            return
        }
        list.push(token)
        setTokens(list)
    }

    function remove(token) {
        var list = getTokens()
            , index = indexof(list, token)

        if (index === -1) {
            return
        }

        list.splice(index, 1)
        setTokens(list)
    }

    function contains(token) {
        return indexof(getTokens(), token) > -1
    }

    function toggle(token) {
        if (contains(token)) {
            remove(token)
            return false
        } else {
            add(token)
            return true
        }
    }

    function $toString() {
        return elem.className
    }

    function item(index) {
        var tokens = getTokens()
        return tokens[index] || null
    }

    function getTokens() {
        var className = elem.className

        return filter(className.split(" "), isTruthy)
    }

    function setTokens(list) {
        var length = list.length

        elem.className = list.join(" ")
        classList.length = length

        for (var i = 0; i < list.length; i++) {
            classList[i] = list[i]
        }

        delete list[length]
    }
}

function filter (arr, fn) {
    var ret = []
    for (var i = 0; i < arr.length; i++) {
        if (fn(arr[i])) ret.push(arr[i])
    }
    return ret
}

function isTruthy(value) {
    return !!value
}

},{"indexof":23}],23:[function(require,module,exports){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],24:[function(require,module,exports){
/*!
 * jQuery JavaScript Library v3.1.1
 * https://jquery.com/
 *
 * Includes Sizzle.js
 * https://sizzlejs.com/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2016-09-22T22:30Z
 */
( function( global, factory ) {

	"use strict";

	if ( typeof module === "object" && typeof module.exports === "object" ) {

		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
} )( typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Edge <= 12 - 13+, Firefox <=18 - 45+, IE 10 - 11, Safari 5.1 - 9+, iOS 6 - 9.1
// throw exceptions when non-strict code (e.g., ASP.NET 4.5) accesses strict mode
// arguments.callee.caller (trac-13335). But as of jQuery 3.0 (2016), strict mode should be common
// enough that all such attempts are guarded in a try block.
"use strict";

var arr = [];

var document = window.document;

var getProto = Object.getPrototypeOf;

var slice = arr.slice;

var concat = arr.concat;

var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var fnToString = hasOwn.toString;

var ObjectFunctionString = fnToString.call( Object );

var support = {};



	function DOMEval( code, doc ) {
		doc = doc || document;

		var script = doc.createElement( "script" );

		script.text = code;
		doc.head.appendChild( script ).parentNode.removeChild( script );
	}
/* global Symbol */
// Defining this global in .eslintrc.json would create a danger of using the global
// unguarded in another place, it seems safer to define global only for this module



var
	version = "3.1.1",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {

		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	},

	// Support: Android <=4.0 only
	// Make sure we trim BOM and NBSP
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([a-z])/g,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return letter.toUpperCase();
	};

jQuery.fn = jQuery.prototype = {

	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {

		// Return all the elements in a clean array
		if ( num == null ) {
			return slice.call( this );
		}

		// Return just the one element from the set
		return num < 0 ? this[ num + this.length ] : this[ num ];
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	each: function( callback ) {
		return jQuery.each( this, callback );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map( this, function( elem, i ) {
			return callback.call( elem, i, elem );
		} ) );
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[ j ] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor();
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[ 0 ] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// Skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction( target ) ) {
		target = {};
	}

	// Extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {

		// Only deal with non-null/undefined values
		if ( ( options = arguments[ i ] ) != null ) {

			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
					( copyIsArray = jQuery.isArray( copy ) ) ) ) {

					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray( src ) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject( src ) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend( {

	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	isFunction: function( obj ) {
		return jQuery.type( obj ) === "function";
	},

	isArray: Array.isArray,

	isWindow: function( obj ) {
		return obj != null && obj === obj.window;
	},

	isNumeric: function( obj ) {

		// As of jQuery 3.0, isNumeric is limited to
		// strings and numbers (primitives or objects)
		// that can be coerced to finite numbers (gh-2662)
		var type = jQuery.type( obj );
		return ( type === "number" || type === "string" ) &&

			// parseFloat NaNs numeric-cast false positives ("")
			// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
			// subtraction forces infinities to NaN
			!isNaN( obj - parseFloat( obj ) );
	},

	isPlainObject: function( obj ) {
		var proto, Ctor;

		// Detect obvious negatives
		// Use toString instead of jQuery.type to catch host objects
		if ( !obj || toString.call( obj ) !== "[object Object]" ) {
			return false;
		}

		proto = getProto( obj );

		// Objects with no prototype (e.g., `Object.create( null )`) are plain
		if ( !proto ) {
			return true;
		}

		// Objects with prototype are plain iff they were constructed by a global Object function
		Ctor = hasOwn.call( proto, "constructor" ) && proto.constructor;
		return typeof Ctor === "function" && fnToString.call( Ctor ) === ObjectFunctionString;
	},

	isEmptyObject: function( obj ) {

		/* eslint-disable no-unused-vars */
		// See https://github.com/eslint/eslint/issues/6125
		var name;

		for ( name in obj ) {
			return false;
		}
		return true;
	},

	type: function( obj ) {
		if ( obj == null ) {
			return obj + "";
		}

		// Support: Android <=2.3 only (functionish RegExp)
		return typeof obj === "object" || typeof obj === "function" ?
			class2type[ toString.call( obj ) ] || "object" :
			typeof obj;
	},

	// Evaluates a script in a global context
	globalEval: function( code ) {
		DOMEval( code );
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Support: IE <=9 - 11, Edge 12 - 13
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	},

	each: function( obj, callback ) {
		var length, i = 0;

		if ( isArrayLike( obj ) ) {
			length = obj.length;
			for ( ; i < length; i++ ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		} else {
			for ( i in obj ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		}

		return obj;
	},

	// Support: Android <=4.0 only
	trim: function( text ) {
		return text == null ?
			"" :
			( text + "" ).replace( rtrim, "" );
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArrayLike( Object( arr ) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
					[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	// Support: Android <=4.0 only, PhantomJS 1 only
	// push.apply(_, arraylike) throws on ancient WebKit
	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var length, value,
			i = 0,
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArrayLike( elems ) ) {
			length = elems.length;
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var tmp, args, proxy;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || jQuery.guid++;

		return proxy;
	},

	now: Date.now,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
} );

if ( typeof Symbol === "function" ) {
	jQuery.fn[ Symbol.iterator ] = arr[ Symbol.iterator ];
}

// Populate the class2type map
jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
function( i, name ) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
} );

function isArrayLike( obj ) {

	// Support: real iOS 8.2 only (not reproducible in simulator)
	// `in` check used to prevent JIT error (gh-2145)
	// hasOwn isn't used here due to false negatives
	// regarding Nodelist length in IE
	var length = !!obj && "length" in obj && obj.length,
		type = jQuery.type( obj );

	if ( type === "function" || jQuery.isWindow( obj ) ) {
		return false;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v2.3.3
 * https://sizzlejs.com/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2016-08-08
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + 1 * new Date(),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf as it's faster than native
	// https://jsperf.com/thor-indexof-vs-for/5
	indexOf = function( list, elem ) {
		var i = 0,
			len = list.length;
		for ( ; i < len; i++ ) {
			if ( list[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",

	// http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+",

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +
		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +
		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
		"*\\]",

	pseudos = ":(" + identifier + ")(?:\\((" +
		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rwhitespace = new RegExp( whitespace + "+", "g" ),
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + identifier + ")" ),
		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,

	// CSS escapes
	// http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox<24
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	},

	// CSS string/identifier serialization
	// https://drafts.csswg.org/cssom/#common-serializing-idioms
	rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
	fcssescape = function( ch, asCodePoint ) {
		if ( asCodePoint ) {

			// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
			if ( ch === "\0" ) {
				return "\uFFFD";
			}

			// Control characters and (dependent upon position) numbers get escaped as code points
			return ch.slice( 0, -1 ) + "\\" + ch.charCodeAt( ch.length - 1 ).toString( 16 ) + " ";
		}

		// Other potentially-special ASCII characters get backslash-escaped
		return "\\" + ch;
	},

	// Used for iframes
	// See setDocument()
	// Removing the function wrapper causes a "Permission Denied"
	// error in IE
	unloadHandler = function() {
		setDocument();
	},

	disabledAncestor = addCombinator(
		function( elem ) {
			return elem.disabled === true && ("form" in elem || "label" in elem);
		},
		{ dir: "parentNode", next: "legend" }
	);

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var m, i, elem, nid, match, groups, newSelector,
		newContext = context && context.ownerDocument,

		// nodeType defaults to 9, since context defaults to document
		nodeType = context ? context.nodeType : 9;

	results = results || [];

	// Return early from calls with invalid selector or context
	if ( typeof selector !== "string" || !selector ||
		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

		return results;
	}

	// Try to shortcut find operations (as opposed to filters) in HTML documents
	if ( !seed ) {

		if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
			setDocument( context );
		}
		context = context || document;

		if ( documentIsHTML ) {

			// If the selector is sufficiently simple, try using a "get*By*" DOM method
			// (excepting DocumentFragment context, where the methods don't exist)
			if ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {

				// ID selector
				if ( (m = match[1]) ) {

					// Document context
					if ( nodeType === 9 ) {
						if ( (elem = context.getElementById( m )) ) {

							// Support: IE, Opera, Webkit
							// TODO: identify versions
							// getElementById can match elements by name instead of ID
							if ( elem.id === m ) {
								results.push( elem );
								return results;
							}
						} else {
							return results;
						}

					// Element context
					} else {

						// Support: IE, Opera, Webkit
						// TODO: identify versions
						// getElementById can match elements by name instead of ID
						if ( newContext && (elem = newContext.getElementById( m )) &&
							contains( context, elem ) &&
							elem.id === m ) {

							results.push( elem );
							return results;
						}
					}

				// Type selector
				} else if ( match[2] ) {
					push.apply( results, context.getElementsByTagName( selector ) );
					return results;

				// Class selector
				} else if ( (m = match[3]) && support.getElementsByClassName &&
					context.getElementsByClassName ) {

					push.apply( results, context.getElementsByClassName( m ) );
					return results;
				}
			}

			// Take advantage of querySelectorAll
			if ( support.qsa &&
				!compilerCache[ selector + " " ] &&
				(!rbuggyQSA || !rbuggyQSA.test( selector )) ) {

				if ( nodeType !== 1 ) {
					newContext = context;
					newSelector = selector;

				// qSA looks outside Element context, which is not what we want
				// Thanks to Andrew Dupont for this workaround technique
				// Support: IE <=8
				// Exclude object elements
				} else if ( context.nodeName.toLowerCase() !== "object" ) {

					// Capture the context ID, setting it first if necessary
					if ( (nid = context.getAttribute( "id" )) ) {
						nid = nid.replace( rcssescape, fcssescape );
					} else {
						context.setAttribute( "id", (nid = expando) );
					}

					// Prefix every selector in the list
					groups = tokenize( selector );
					i = groups.length;
					while ( i-- ) {
						groups[i] = "#" + nid + " " + toSelector( groups[i] );
					}
					newSelector = groups.join( "," );

					// Expand context for sibling selectors
					newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
						context;
				}

				if ( newSelector ) {
					try {
						push.apply( results,
							newContext.querySelectorAll( newSelector )
						);
						return results;
					} catch ( qsaError ) {
					} finally {
						if ( nid === expando ) {
							context.removeAttribute( "id" );
						}
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {function(string, object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created element and returns a boolean result
 */
function assert( fn ) {
	var el = document.createElement("fieldset");

	try {
		return !!fn( el );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( el.parentNode ) {
			el.parentNode.removeChild( el );
		}
		// release memory in IE
		el = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = arr.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			a.sourceIndex - b.sourceIndex;

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for :enabled/:disabled
 * @param {Boolean} disabled true for :disabled; false for :enabled
 */
function createDisabledPseudo( disabled ) {

	// Known :disabled false positives: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
	return function( elem ) {

		// Only certain elements can match :enabled or :disabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-enabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-disabled
		if ( "form" in elem ) {

			// Check for inherited disabledness on relevant non-disabled elements:
			// * listed form-associated elements in a disabled fieldset
			//   https://html.spec.whatwg.org/multipage/forms.html#category-listed
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-fe-disabled
			// * option elements in a disabled optgroup
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-option-disabled
			// All such elements have a "form" property.
			if ( elem.parentNode && elem.disabled === false ) {

				// Option elements defer to a parent optgroup if present
				if ( "label" in elem ) {
					if ( "label" in elem.parentNode ) {
						return elem.parentNode.disabled === disabled;
					} else {
						return elem.disabled === disabled;
					}
				}

				// Support: IE 6 - 11
				// Use the isDisabled shortcut property to check for disabled fieldset ancestors
				return elem.isDisabled === disabled ||

					// Where there is no isDisabled, check manually
					/* jshint -W018 */
					elem.isDisabled !== !disabled &&
						disabledAncestor( elem ) === disabled;
			}

			return elem.disabled === disabled;

		// Try to winnow out elements that can't be disabled before trusting the disabled property.
		// Some victims get caught in our net (label, legend, menu, track), but it shouldn't
		// even exist on them, let alone have a boolean value.
		} else if ( "label" in elem ) {
			return elem.disabled === disabled;
		}

		// Remaining elements are neither :enabled nor :disabled
		return false;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare, subWindow,
		doc = node ? node.ownerDocument || node : preferredDoc;

	// Return early if doc is invalid or already selected
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Update global variables
	document = doc;
	docElem = document.documentElement;
	documentIsHTML = !isXML( document );

	// Support: IE 9-11, Edge
	// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
	if ( preferredDoc !== document &&
		(subWindow = document.defaultView) && subWindow.top !== subWindow ) {

		// Support: IE 11, Edge
		if ( subWindow.addEventListener ) {
			subWindow.addEventListener( "unload", unloadHandler, false );

		// Support: IE 9 - 10 only
		} else if ( subWindow.attachEvent ) {
			subWindow.attachEvent( "onunload", unloadHandler );
		}
	}

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties
	// (excepting IE8 booleans)
	support.attributes = assert(function( el ) {
		el.className = "i";
		return !el.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( el ) {
		el.appendChild( document.createComment("") );
		return !el.getElementsByTagName("*").length;
	});

	// Support: IE<9
	support.getElementsByClassName = rnative.test( document.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programmatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( el ) {
		docElem.appendChild( el ).id = expando;
		return !document.getElementsByName || !document.getElementsByName( expando ).length;
	});

	// ID filter and find
	if ( support.getById ) {
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var elem = context.getElementById( id );
				return elem ? [ elem ] : [];
			}
		};
	} else {
		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== "undefined" &&
					elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};

		// Support: IE 6 - 7 only
		// getElementById is not reliable as a find shortcut
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var node, i, elems,
					elem = context.getElementById( id );

				if ( elem ) {

					// Verify the id attribute
					node = elem.getAttributeNode("id");
					if ( node && node.value === id ) {
						return [ elem ];
					}

					// Fall back on getElementsByName
					elems = context.getElementsByName( id );
					i = 0;
					while ( (elem = elems[i++]) ) {
						node = elem.getAttributeNode("id");
						if ( node && node.value === id ) {
							return [ elem ];
						}
					}
				}

				return [];
			}
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( tag );

			// DocumentFragment nodes don't have gEBTN
			} else if ( support.qsa ) {
				return context.querySelectorAll( tag );
			}
		} :

		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See https://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( document.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( el ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// https://bugs.jquery.com/ticket/12359
			docElem.appendChild( el ).innerHTML = "<a id='" + expando + "'></a>" +
				"<select id='" + expando + "-\r\\' msallowcapture=''>" +
				"<option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( el.querySelectorAll("[msallowcapture^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !el.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
			if ( !el.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
				rbuggyQSA.push("~=");
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !el.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}

			// Support: Safari 8+, iOS 8+
			// https://bugs.webkit.org/show_bug.cgi?id=136851
			// In-page `selector#id sibling-combinator selector` fails
			if ( !el.querySelectorAll( "a#" + expando + "+*" ).length ) {
				rbuggyQSA.push(".#.+[+~]");
			}
		});

		assert(function( el ) {
			el.innerHTML = "<a href='' disabled='disabled'></a>" +
				"<select disabled='disabled'><option/></select>";

			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = document.createElement("input");
			input.setAttribute( "type", "hidden" );
			el.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( el.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( el.querySelectorAll(":enabled").length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: IE9-11+
			// IE's :disabled selector does not pick up the children of disabled fieldsets
			docElem.appendChild( el ).disabled = true;
			if ( el.querySelectorAll(":disabled").length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			el.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( el ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( el, "*" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( el, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully self-exclusive
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === document || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === document || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === document ? -1 :
				b === document ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return document;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	if ( support.matchesSelector && documentIsHTML &&
		!compilerCache[ expr + " " ] &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch (e) {}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.escape = function( sel ) {
	return (sel + "").replace( rcssescape, fcssescape );
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[6] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] ) {
				match[2] = match[4] || match[5] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, uniqueCache, outerCache, node, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType,
						diff = false;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) {

										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {

							// Seek `elem` from a previously-cached index

							// ...in a gzip-friendly way
							node = parent;
							outerCache = node[ expando ] || (node[ expando ] = {});

							// Support: IE <9 only
							// Defend against cloned attroperties (jQuery gh-1709)
							uniqueCache = outerCache[ node.uniqueID ] ||
								(outerCache[ node.uniqueID ] = {});

							cache = uniqueCache[ type ] || [];
							nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
							diff = nodeIndex && cache[ 2 ];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						} else {
							// Use previously-cached element index if available
							if ( useCache ) {
								// ...in a gzip-friendly way
								node = elem;
								outerCache = node[ expando ] || (node[ expando ] = {});

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[ node.uniqueID ] ||
									(outerCache[ node.uniqueID ] = {});

								cache = uniqueCache[ type ] || [];
								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
								diff = nodeIndex;
							}

							// xml :nth-child(...)
							// or :nth-last-child(...) or :nth(-last)?-of-type(...)
							if ( diff === false ) {
								// Use the same loop as above to seek `elem` from the start
								while ( (node = ++nodeIndex && node && node[ dir ] ||
									(diff = nodeIndex = 0) || start.pop()) ) {

									if ( ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) &&
										++diff ) {

										// Cache the index of each encountered element
										if ( useCache ) {
											outerCache = node[ expando ] || (node[ expando ] = {});

											// Support: IE <9 only
											// Defend against cloned attroperties (jQuery gh-1709)
											uniqueCache = outerCache[ node.uniqueID ] ||
												(outerCache[ node.uniqueID ] = {});

											uniqueCache[ type ] = [ dirruns, diff ];
										}

										if ( node === elem ) {
											break;
										}
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					// Don't keep the element (issue #299)
					input[0] = null;
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": createDisabledPseudo( false ),
		"disabled": createDisabledPseudo( true ),

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		skip = combinator.next,
		key = skip || dir,
		checkNonElements = base && key === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
			return false;
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, uniqueCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});

						// Support: IE <9 only
						// Defend against cloned attroperties (jQuery gh-1709)
						uniqueCache = outerCache[ elem.uniqueID ] || (outerCache[ elem.uniqueID ] = {});

						if ( skip && skip === elem.nodeName.toLowerCase() ) {
							elem = elem[ dir ] || elem;
						} else if ( (oldCache = uniqueCache[ key ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							uniqueCache[ key ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
			return false;
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
			// Avoid hanging onto element (issue #299)
			checkContext = null;
			return ret;
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context === document || context || outermost;
			}

			// Add elements passing elementMatchers directly to results
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					if ( !context && elem.ownerDocument !== document ) {
						setDocument( elem );
						xml = !documentIsHTML;
					}
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context || document, xml) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// `i` is now the count of elements visited above, and adding it to `matchedCount`
			// makes the latter nonnegative.
			matchedCount += i;

			// Apply set filters to unmatched elements
			// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
			// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
			// no element matchers and no seed.
			// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
			// case, which will result in a "00" `matchedCount` that differs from `i` but is also
			// numerically zero.
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( (selector = compiled.selector || selector) );

	results = results || [];

	// Try to minimize operations if there is only one selector in the list and no seed
	// (the latter of which guarantees us context)
	if ( match.length === 1 ) {

		// Reduce context if the leading compound selector is an ID
		tokens = match[0] = match[0].slice( 0 );
		if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
				context.nodeType === 9 && documentIsHTML && Expr.relative[ tokens[1].type ] ) {

			context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[i];

			// Abort if we hit a combinator
			if ( Expr.relative[ (type = token.type) ] ) {
				break;
			}
			if ( (find = Expr.find[ type ]) ) {
				// Search, expanding context for leading sibling combinators
				if ( (seed = find(
					token.matches[0].replace( runescape, funescape ),
					rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
				)) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( el ) {
	// Should return 1, but returns 4 (following)
	return el.compareDocumentPosition( document.createElement("fieldset") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( el ) {
	el.innerHTML = "<a href='#'></a>";
	return el.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( el ) {
	el.innerHTML = "<input/>";
	el.firstChild.setAttribute( "value", "" );
	return el.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( el ) {
	return el.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

return Sizzle;

})( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;

// Deprecated
jQuery.expr[ ":" ] = jQuery.expr.pseudos;
jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;
jQuery.escapeSelector = Sizzle.escape;




var dir = function( elem, dir, until ) {
	var matched = [],
		truncate = until !== undefined;

	while ( ( elem = elem[ dir ] ) && elem.nodeType !== 9 ) {
		if ( elem.nodeType === 1 ) {
			if ( truncate && jQuery( elem ).is( until ) ) {
				break;
			}
			matched.push( elem );
		}
	}
	return matched;
};


var siblings = function( n, elem ) {
	var matched = [];

	for ( ; n; n = n.nextSibling ) {
		if ( n.nodeType === 1 && n !== elem ) {
			matched.push( n );
		}
	}

	return matched;
};


var rneedsContext = jQuery.expr.match.needsContext;

var rsingleTag = ( /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i );



var risSimple = /^.[^:#\[\.,]*$/;

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			return !!qualifier.call( elem, i, elem ) !== not;
		} );
	}

	// Single element
	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		} );
	}

	// Arraylike of elements (jQuery, arguments, Array)
	if ( typeof qualifier !== "string" ) {
		return jQuery.grep( elements, function( elem ) {
			return ( indexOf.call( qualifier, elem ) > -1 ) !== not;
		} );
	}

	// Simple selector that can be filtered directly, removing non-Elements
	if ( risSimple.test( qualifier ) ) {
		return jQuery.filter( qualifier, elements, not );
	}

	// Complex selector, compare the two sets, removing non-Elements
	qualifier = jQuery.filter( qualifier, elements );
	return jQuery.grep( elements, function( elem ) {
		return ( indexOf.call( qualifier, elem ) > -1 ) !== not && elem.nodeType === 1;
	} );
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	if ( elems.length === 1 && elem.nodeType === 1 ) {
		return jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [];
	}

	return jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
		return elem.nodeType === 1;
	} ) );
};

jQuery.fn.extend( {
	find: function( selector ) {
		var i, ret,
			len = this.length,
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter( function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			} ) );
		}

		ret = this.pushStack( [] );

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		return len > 1 ? jQuery.uniqueSort( ret ) : ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow( this, selector || [], false ) );
	},
	not: function( selector ) {
		return this.pushStack( winnow( this, selector || [], true ) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
} );


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	// Shortcut simple #id case for speed
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,

	init = jQuery.fn.init = function( selector, context, root ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Method init() accepts an alternate rootjQuery
		// so migrate can support jQuery.sub (gh-2101)
		root = root || rootjQuery;

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[ 0 ] === "<" &&
				selector[ selector.length - 1 ] === ">" &&
				selector.length >= 3 ) {

				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && ( match[ 1 ] || !context ) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[ 1 ] ) {
					context = context instanceof jQuery ? context[ 0 ] : context;

					// Option to run scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[ 1 ],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[ 1 ] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {

							// Properties of context are called as methods if possible
							if ( jQuery.isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[ 2 ] );

					if ( elem ) {

						// Inject the element directly into the jQuery object
						this[ 0 ] = elem;
						this.length = 1;
					}
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || root ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this[ 0 ] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return root.ready !== undefined ?
				root.ready( selector ) :

				// Execute immediately if ready is not present
				selector( jQuery );
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,

	// Methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend( {
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter( function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[ i ] ) ) {
					return true;
				}
			}
		} );
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			targets = typeof selectors !== "string" && jQuery( selectors );

		// Positional selectors never match, since there's no _selection_ context
		if ( !rneedsContext.test( selectors ) ) {
			for ( ; i < l; i++ ) {
				for ( cur = this[ i ]; cur && cur !== context; cur = cur.parentNode ) {

					// Always skip document fragments
					if ( cur.nodeType < 11 && ( targets ?
						targets.index( cur ) > -1 :

						// Don't pass non-elements to Sizzle
						cur.nodeType === 1 &&
							jQuery.find.matchesSelector( cur, selectors ) ) ) {

						matched.push( cur );
						break;
					}
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.uniqueSort( matched ) : matched );
	},

	// Determine the position of an element within the set
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// Index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.uniqueSort(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter( selector )
		);
	}
} );

function sibling( cur, dir ) {
	while ( ( cur = cur[ dir ] ) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each( {
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return siblings( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return siblings( elem.firstChild );
	},
	contents: function( elem ) {
		return elem.contentDocument || jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {

			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.uniqueSort( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
} );
var rnothtmlwhite = ( /[^\x20\t\r\n\f]+/g );



// Convert String-formatted options into Object-formatted ones
function createOptions( options ) {
	var object = {};
	jQuery.each( options.match( rnothtmlwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	} );
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		createOptions( options ) :
		jQuery.extend( {}, options );

	var // Flag to know if list is currently firing
		firing,

		// Last fire value for non-forgettable lists
		memory,

		// Flag to know if list was already fired
		fired,

		// Flag to prevent firing
		locked,

		// Actual callback list
		list = [],

		// Queue of execution data for repeatable lists
		queue = [],

		// Index of currently firing callback (modified by add/remove as needed)
		firingIndex = -1,

		// Fire callbacks
		fire = function() {

			// Enforce single-firing
			locked = options.once;

			// Execute callbacks for all pending executions,
			// respecting firingIndex overrides and runtime changes
			fired = firing = true;
			for ( ; queue.length; firingIndex = -1 ) {
				memory = queue.shift();
				while ( ++firingIndex < list.length ) {

					// Run callback and check for early termination
					if ( list[ firingIndex ].apply( memory[ 0 ], memory[ 1 ] ) === false &&
						options.stopOnFalse ) {

						// Jump to end and forget the data so .add doesn't re-fire
						firingIndex = list.length;
						memory = false;
					}
				}
			}

			// Forget the data if we're done with it
			if ( !options.memory ) {
				memory = false;
			}

			firing = false;

			// Clean up if we're done firing for good
			if ( locked ) {

				// Keep an empty list if we have data for future add calls
				if ( memory ) {
					list = [];

				// Otherwise, this object is spent
				} else {
					list = "";
				}
			}
		},

		// Actual Callbacks object
		self = {

			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {

					// If we have memory from a past run, we should fire after adding
					if ( memory && !firing ) {
						firingIndex = list.length - 1;
						queue.push( memory );
					}

					( function add( args ) {
						jQuery.each( args, function( _, arg ) {
							if ( jQuery.isFunction( arg ) ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && jQuery.type( arg ) !== "string" ) {

								// Inspect recursively
								add( arg );
							}
						} );
					} )( arguments );

					if ( memory && !firing ) {
						fire();
					}
				}
				return this;
			},

			// Remove a callback from the list
			remove: function() {
				jQuery.each( arguments, function( _, arg ) {
					var index;
					while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
						list.splice( index, 1 );

						// Handle firing indexes
						if ( index <= firingIndex ) {
							firingIndex--;
						}
					}
				} );
				return this;
			},

			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ?
					jQuery.inArray( fn, list ) > -1 :
					list.length > 0;
			},

			// Remove all callbacks from the list
			empty: function() {
				if ( list ) {
					list = [];
				}
				return this;
			},

			// Disable .fire and .add
			// Abort any current/pending executions
			// Clear all callbacks and values
			disable: function() {
				locked = queue = [];
				list = memory = "";
				return this;
			},
			disabled: function() {
				return !list;
			},

			// Disable .fire
			// Also disable .add unless we have memory (since it would have no effect)
			// Abort any pending executions
			lock: function() {
				locked = queue = [];
				if ( !memory && !firing ) {
					list = memory = "";
				}
				return this;
			},
			locked: function() {
				return !!locked;
			},

			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( !locked ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					queue.push( args );
					if ( !firing ) {
						fire();
					}
				}
				return this;
			},

			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},

			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


function Identity( v ) {
	return v;
}
function Thrower( ex ) {
	throw ex;
}

function adoptValue( value, resolve, reject ) {
	var method;

	try {

		// Check for promise aspect first to privilege synchronous behavior
		if ( value && jQuery.isFunction( ( method = value.promise ) ) ) {
			method.call( value ).done( resolve ).fail( reject );

		// Other thenables
		} else if ( value && jQuery.isFunction( ( method = value.then ) ) ) {
			method.call( value, resolve, reject );

		// Other non-thenables
		} else {

			// Support: Android 4.0 only
			// Strict mode functions invoked without .call/.apply get global-object context
			resolve.call( undefined, value );
		}

	// For Promises/A+, convert exceptions into rejections
	// Since jQuery.when doesn't unwrap thenables, we can skip the extra checks appearing in
	// Deferred#then to conditionally suppress rejection.
	} catch ( value ) {

		// Support: Android 4.0 only
		// Strict mode functions invoked without .call/.apply get global-object context
		reject.call( undefined, value );
	}
}

jQuery.extend( {

	Deferred: function( func ) {
		var tuples = [

				// action, add listener, callbacks,
				// ... .then handlers, argument index, [final state]
				[ "notify", "progress", jQuery.Callbacks( "memory" ),
					jQuery.Callbacks( "memory" ), 2 ],
				[ "resolve", "done", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 0, "resolved" ],
				[ "reject", "fail", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 1, "rejected" ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				"catch": function( fn ) {
					return promise.then( null, fn );
				},

				// Keep pipe for back-compat
				pipe: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;

					return jQuery.Deferred( function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {

							// Map tuples (progress, done, fail) to arguments (done, fail, progress)
							var fn = jQuery.isFunction( fns[ tuple[ 4 ] ] ) && fns[ tuple[ 4 ] ];

							// deferred.progress(function() { bind to newDefer or newDefer.notify })
							// deferred.done(function() { bind to newDefer or newDefer.resolve })
							// deferred.fail(function() { bind to newDefer or newDefer.reject })
							deferred[ tuple[ 1 ] ]( function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && jQuery.isFunction( returned.promise ) ) {
									returned.promise()
										.progress( newDefer.notify )
										.done( newDefer.resolve )
										.fail( newDefer.reject );
								} else {
									newDefer[ tuple[ 0 ] + "With" ](
										this,
										fn ? [ returned ] : arguments
									);
								}
							} );
						} );
						fns = null;
					} ).promise();
				},
				then: function( onFulfilled, onRejected, onProgress ) {
					var maxDepth = 0;
					function resolve( depth, deferred, handler, special ) {
						return function() {
							var that = this,
								args = arguments,
								mightThrow = function() {
									var returned, then;

									// Support: Promises/A+ section 2.3.3.3.3
									// https://promisesaplus.com/#point-59
									// Ignore double-resolution attempts
									if ( depth < maxDepth ) {
										return;
									}

									returned = handler.apply( that, args );

									// Support: Promises/A+ section 2.3.1
									// https://promisesaplus.com/#point-48
									if ( returned === deferred.promise() ) {
										throw new TypeError( "Thenable self-resolution" );
									}

									// Support: Promises/A+ sections 2.3.3.1, 3.5
									// https://promisesaplus.com/#point-54
									// https://promisesaplus.com/#point-75
									// Retrieve `then` only once
									then = returned &&

										// Support: Promises/A+ section 2.3.4
										// https://promisesaplus.com/#point-64
										// Only check objects and functions for thenability
										( typeof returned === "object" ||
											typeof returned === "function" ) &&
										returned.then;

									// Handle a returned thenable
									if ( jQuery.isFunction( then ) ) {

										// Special processors (notify) just wait for resolution
										if ( special ) {
											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special )
											);

										// Normal processors (resolve) also hook into progress
										} else {

											// ...and disregard older resolution values
											maxDepth++;

											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special ),
												resolve( maxDepth, deferred, Identity,
													deferred.notifyWith )
											);
										}

									// Handle all other returned values
									} else {

										// Only substitute handlers pass on context
										// and multiple values (non-spec behavior)
										if ( handler !== Identity ) {
											that = undefined;
											args = [ returned ];
										}

										// Process the value(s)
										// Default process is resolve
										( special || deferred.resolveWith )( that, args );
									}
								},

								// Only normal processors (resolve) catch and reject exceptions
								process = special ?
									mightThrow :
									function() {
										try {
											mightThrow();
										} catch ( e ) {

											if ( jQuery.Deferred.exceptionHook ) {
												jQuery.Deferred.exceptionHook( e,
													process.stackTrace );
											}

											// Support: Promises/A+ section 2.3.3.3.4.1
											// https://promisesaplus.com/#point-61
											// Ignore post-resolution exceptions
											if ( depth + 1 >= maxDepth ) {

												// Only substitute handlers pass on context
												// and multiple values (non-spec behavior)
												if ( handler !== Thrower ) {
													that = undefined;
													args = [ e ];
												}

												deferred.rejectWith( that, args );
											}
										}
									};

							// Support: Promises/A+ section 2.3.3.3.1
							// https://promisesaplus.com/#point-57
							// Re-resolve promises immediately to dodge false rejection from
							// subsequent errors
							if ( depth ) {
								process();
							} else {

								// Call an optional hook to record the stack, in case of exception
								// since it's otherwise lost when execution goes async
								if ( jQuery.Deferred.getStackHook ) {
									process.stackTrace = jQuery.Deferred.getStackHook();
								}
								window.setTimeout( process );
							}
						};
					}

					return jQuery.Deferred( function( newDefer ) {

						// progress_handlers.add( ... )
						tuples[ 0 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onProgress ) ?
									onProgress :
									Identity,
								newDefer.notifyWith
							)
						);

						// fulfilled_handlers.add( ... )
						tuples[ 1 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onFulfilled ) ?
									onFulfilled :
									Identity
							)
						);

						// rejected_handlers.add( ... )
						tuples[ 2 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onRejected ) ?
									onRejected :
									Thrower
							)
						);
					} ).promise();
				},

				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 5 ];

			// promise.progress = list.add
			// promise.done = list.add
			// promise.fail = list.add
			promise[ tuple[ 1 ] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(
					function() {

						// state = "resolved" (i.e., fulfilled)
						// state = "rejected"
						state = stateString;
					},

					// rejected_callbacks.disable
					// fulfilled_callbacks.disable
					tuples[ 3 - i ][ 2 ].disable,

					// progress_callbacks.lock
					tuples[ 0 ][ 2 ].lock
				);
			}

			// progress_handlers.fire
			// fulfilled_handlers.fire
			// rejected_handlers.fire
			list.add( tuple[ 3 ].fire );

			// deferred.notify = function() { deferred.notifyWith(...) }
			// deferred.resolve = function() { deferred.resolveWith(...) }
			// deferred.reject = function() { deferred.rejectWith(...) }
			deferred[ tuple[ 0 ] ] = function() {
				deferred[ tuple[ 0 ] + "With" ]( this === deferred ? undefined : this, arguments );
				return this;
			};

			// deferred.notifyWith = list.fireWith
			// deferred.resolveWith = list.fireWith
			// deferred.rejectWith = list.fireWith
			deferred[ tuple[ 0 ] + "With" ] = list.fireWith;
		} );

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( singleValue ) {
		var

			// count of uncompleted subordinates
			remaining = arguments.length,

			// count of unprocessed arguments
			i = remaining,

			// subordinate fulfillment data
			resolveContexts = Array( i ),
			resolveValues = slice.call( arguments ),

			// the master Deferred
			master = jQuery.Deferred(),

			// subordinate callback factory
			updateFunc = function( i ) {
				return function( value ) {
					resolveContexts[ i ] = this;
					resolveValues[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( !( --remaining ) ) {
						master.resolveWith( resolveContexts, resolveValues );
					}
				};
			};

		// Single- and empty arguments are adopted like Promise.resolve
		if ( remaining <= 1 ) {
			adoptValue( singleValue, master.done( updateFunc( i ) ).resolve, master.reject );

			// Use .then() to unwrap secondary thenables (cf. gh-3000)
			if ( master.state() === "pending" ||
				jQuery.isFunction( resolveValues[ i ] && resolveValues[ i ].then ) ) {

				return master.then();
			}
		}

		// Multiple arguments are aggregated like Promise.all array elements
		while ( i-- ) {
			adoptValue( resolveValues[ i ], updateFunc( i ), master.reject );
		}

		return master.promise();
	}
} );


// These usually indicate a programmer mistake during development,
// warn about them ASAP rather than swallowing them by default.
var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;

jQuery.Deferred.exceptionHook = function( error, stack ) {

	// Support: IE 8 - 9 only
	// Console exists when dev tools are open, which can happen at any time
	if ( window.console && window.console.warn && error && rerrorNames.test( error.name ) ) {
		window.console.warn( "jQuery.Deferred exception: " + error.message, error.stack, stack );
	}
};




jQuery.readyException = function( error ) {
	window.setTimeout( function() {
		throw error;
	} );
};




// The deferred used on DOM ready
var readyList = jQuery.Deferred();

jQuery.fn.ready = function( fn ) {

	readyList
		.then( fn )

		// Wrap jQuery.readyException in a function so that the lookup
		// happens at the time of error handling instead of callback
		// registration.
		.catch( function( error ) {
			jQuery.readyException( error );
		} );

	return this;
};

jQuery.extend( {

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );
	}
} );

jQuery.ready.then = readyList.then;

// The ready event handler and self cleanup method
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed );
	window.removeEventListener( "load", completed );
	jQuery.ready();
}

// Catch cases where $(document).ready() is called
// after the browser event has already occurred.
// Support: IE <=9 - 10 only
// Older IE sometimes signals "interactive" too soon
if ( document.readyState === "complete" ||
	( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {

	// Handle it asynchronously to allow scripts the opportunity to delay ready
	window.setTimeout( jQuery.ready );

} else {

	// Use the handy event callback
	document.addEventListener( "DOMContentLoaded", completed );

	// A fallback to window.onload, that will always work
	window.addEventListener( "load", completed );
}




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( jQuery.type( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			access( elems, fn, i, key[ i ], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !jQuery.isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {

			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn(
					elems[ i ], key, raw ?
					value :
					value.call( elems[ i ], i, fn( elems[ i ], key ) )
				);
			}
		}
	}

	if ( chainable ) {
		return elems;
	}

	// Gets
	if ( bulk ) {
		return fn.call( elems );
	}

	return len ? fn( elems[ 0 ], key ) : emptyGet;
};
var acceptData = function( owner ) {

	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};




function Data() {
	this.expando = jQuery.expando + Data.uid++;
}

Data.uid = 1;

Data.prototype = {

	cache: function( owner ) {

		// Check if the owner object already has a cache
		var value = owner[ this.expando ];

		// If not, create one
		if ( !value ) {
			value = {};

			// We can accept data for non-element nodes in modern browsers,
			// but we should not, see #8335.
			// Always return an empty object.
			if ( acceptData( owner ) ) {

				// If it is a node unlikely to be stringify-ed or looped over
				// use plain assignment
				if ( owner.nodeType ) {
					owner[ this.expando ] = value;

				// Otherwise secure it in a non-enumerable property
				// configurable must be true to allow the property to be
				// deleted when data is removed
				} else {
					Object.defineProperty( owner, this.expando, {
						value: value,
						configurable: true
					} );
				}
			}
		}

		return value;
	},
	set: function( owner, data, value ) {
		var prop,
			cache = this.cache( owner );

		// Handle: [ owner, key, value ] args
		// Always use camelCase key (gh-2257)
		if ( typeof data === "string" ) {
			cache[ jQuery.camelCase( data ) ] = value;

		// Handle: [ owner, { properties } ] args
		} else {

			// Copy the properties one-by-one to the cache object
			for ( prop in data ) {
				cache[ jQuery.camelCase( prop ) ] = data[ prop ];
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		return key === undefined ?
			this.cache( owner ) :

			// Always use camelCase key (gh-2257)
			owner[ this.expando ] && owner[ this.expando ][ jQuery.camelCase( key ) ];
	},
	access: function( owner, key, value ) {

		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				( ( key && typeof key === "string" ) && value === undefined ) ) {

			return this.get( owner, key );
		}

		// When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i,
			cache = owner[ this.expando ];

		if ( cache === undefined ) {
			return;
		}

		if ( key !== undefined ) {

			// Support array or space separated string of keys
			if ( jQuery.isArray( key ) ) {

				// If key is an array of keys...
				// We always set camelCase keys, so remove that.
				key = key.map( jQuery.camelCase );
			} else {
				key = jQuery.camelCase( key );

				// If a key with the spaces exists, use it.
				// Otherwise, create an array by matching non-whitespace
				key = key in cache ?
					[ key ] :
					( key.match( rnothtmlwhite ) || [] );
			}

			i = key.length;

			while ( i-- ) {
				delete cache[ key[ i ] ];
			}
		}

		// Remove the expando if there's no more data
		if ( key === undefined || jQuery.isEmptyObject( cache ) ) {

			// Support: Chrome <=35 - 45
			// Webkit & Blink performance suffers when deleting properties
			// from DOM nodes, so set to undefined instead
			// https://bugs.chromium.org/p/chromium/issues/detail?id=378607 (bug restricted)
			if ( owner.nodeType ) {
				owner[ this.expando ] = undefined;
			} else {
				delete owner[ this.expando ];
			}
		}
	},
	hasData: function( owner ) {
		var cache = owner[ this.expando ];
		return cache !== undefined && !jQuery.isEmptyObject( cache );
	}
};
var dataPriv = new Data();

var dataUser = new Data();



//	Implementation Summary
//
//	1. Enforce API surface and semantic compatibility with 1.9.x branch
//	2. Improve the module's maintainability by reducing the storage
//		paths to a single mechanism.
//	3. Use the same single mechanism to support "private" and "user" data.
//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
//	5. Avoid exposing implementation details on user objects (eg. expando properties)
//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /[A-Z]/g;

function getData( data ) {
	if ( data === "true" ) {
		return true;
	}

	if ( data === "false" ) {
		return false;
	}

	if ( data === "null" ) {
		return null;
	}

	// Only convert to a number if it doesn't change the string
	if ( data === +data + "" ) {
		return +data;
	}

	if ( rbrace.test( data ) ) {
		return JSON.parse( data );
	}

	return data;
}

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$&" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = getData( data );
			} catch ( e ) {}

			// Make sure we set the data so it isn't changed later
			dataUser.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend( {
	hasData: function( elem ) {
		return dataUser.hasData( elem ) || dataPriv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return dataUser.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		dataUser.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to dataPriv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return dataPriv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		dataPriv.remove( elem, name );
	}
} );

jQuery.fn.extend( {
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = dataUser.get( elem );

				if ( elem.nodeType === 1 && !dataPriv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {

						// Support: IE 11 only
						// The attrs elements can be null (#14894)
						if ( attrs[ i ] ) {
							name = attrs[ i ].name;
							if ( name.indexOf( "data-" ) === 0 ) {
								name = jQuery.camelCase( name.slice( 5 ) );
								dataAttr( elem, name, data[ name ] );
							}
						}
					}
					dataPriv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each( function() {
				dataUser.set( this, key );
			} );
		}

		return access( this, function( value ) {
			var data;

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {

				// Attempt to get data from the cache
				// The key will always be camelCased in Data
				data = dataUser.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each( function() {

				// We always store the camelCased key
				dataUser.set( this, key, value );
			} );
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each( function() {
			dataUser.remove( this, key );
		} );
	}
} );


jQuery.extend( {
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = dataPriv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || jQuery.isArray( data ) ) {
					queue = dataPriv.access( elem, type, jQuery.makeArray( data ) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// Clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// Not public - generate a queueHooks object, or return the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return dataPriv.get( elem, key ) || dataPriv.access( elem, key, {
			empty: jQuery.Callbacks( "once memory" ).add( function() {
				dataPriv.remove( elem, [ type + "queue", key ] );
			} )
		} );
	}
} );

jQuery.fn.extend( {
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[ 0 ], type );
		}

		return data === undefined ?
			this :
			this.each( function() {
				var queue = jQuery.queue( this, type, data );

				// Ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[ 0 ] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			} );
	},
	dequeue: function( type ) {
		return this.each( function() {
			jQuery.dequeue( this, type );
		} );
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},

	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = dataPriv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
} );
var pnum = ( /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/ ).source;

var rcssNum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" );


var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var isHiddenWithinTree = function( elem, el ) {

		// isHiddenWithinTree might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;

		// Inline style trumps all
		return elem.style.display === "none" ||
			elem.style.display === "" &&

			// Otherwise, check computed style
			// Support: Firefox <=43 - 45
			// Disconnected elements can have computed display: none, so first confirm that elem is
			// in the document.
			jQuery.contains( elem.ownerDocument, elem ) &&

			jQuery.css( elem, "display" ) === "none";
	};

var swap = function( elem, options, callback, args ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.apply( elem, args || [] );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};




function adjustCSS( elem, prop, valueParts, tween ) {
	var adjusted,
		scale = 1,
		maxIterations = 20,
		currentValue = tween ?
			function() {
				return tween.cur();
			} :
			function() {
				return jQuery.css( elem, prop, "" );
			},
		initial = currentValue(),
		unit = valueParts && valueParts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

		// Starting value computation is required for potential unit mismatches
		initialInUnit = ( jQuery.cssNumber[ prop ] || unit !== "px" && +initial ) &&
			rcssNum.exec( jQuery.css( elem, prop ) );

	if ( initialInUnit && initialInUnit[ 3 ] !== unit ) {

		// Trust units reported by jQuery.css
		unit = unit || initialInUnit[ 3 ];

		// Make sure we update the tween properties later on
		valueParts = valueParts || [];

		// Iteratively approximate from a nonzero starting point
		initialInUnit = +initial || 1;

		do {

			// If previous iteration zeroed out, double until we get *something*.
			// Use string for doubling so we don't accidentally see scale as unchanged below
			scale = scale || ".5";

			// Adjust and apply
			initialInUnit = initialInUnit / scale;
			jQuery.style( elem, prop, initialInUnit + unit );

		// Update scale, tolerating zero or NaN from tween.cur()
		// Break the loop if scale is unchanged or perfect, or if we've just had enough.
		} while (
			scale !== ( scale = currentValue() / initial ) && scale !== 1 && --maxIterations
		);
	}

	if ( valueParts ) {
		initialInUnit = +initialInUnit || +initial || 0;

		// Apply relative offset (+=/-=) if specified
		adjusted = valueParts[ 1 ] ?
			initialInUnit + ( valueParts[ 1 ] + 1 ) * valueParts[ 2 ] :
			+valueParts[ 2 ];
		if ( tween ) {
			tween.unit = unit;
			tween.start = initialInUnit;
			tween.end = adjusted;
		}
	}
	return adjusted;
}


var defaultDisplayMap = {};

function getDefaultDisplay( elem ) {
	var temp,
		doc = elem.ownerDocument,
		nodeName = elem.nodeName,
		display = defaultDisplayMap[ nodeName ];

	if ( display ) {
		return display;
	}

	temp = doc.body.appendChild( doc.createElement( nodeName ) );
	display = jQuery.css( temp, "display" );

	temp.parentNode.removeChild( temp );

	if ( display === "none" ) {
		display = "block";
	}
	defaultDisplayMap[ nodeName ] = display;

	return display;
}

function showHide( elements, show ) {
	var display, elem,
		values = [],
		index = 0,
		length = elements.length;

	// Determine new display value for elements that need to change
	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		display = elem.style.display;
		if ( show ) {

			// Since we force visibility upon cascade-hidden elements, an immediate (and slow)
			// check is required in this first loop unless we have a nonempty display value (either
			// inline or about-to-be-restored)
			if ( display === "none" ) {
				values[ index ] = dataPriv.get( elem, "display" ) || null;
				if ( !values[ index ] ) {
					elem.style.display = "";
				}
			}
			if ( elem.style.display === "" && isHiddenWithinTree( elem ) ) {
				values[ index ] = getDefaultDisplay( elem );
			}
		} else {
			if ( display !== "none" ) {
				values[ index ] = "none";

				// Remember what we're overwriting
				dataPriv.set( elem, "display", display );
			}
		}
	}

	// Set the display of the elements in a second loop to avoid constant reflow
	for ( index = 0; index < length; index++ ) {
		if ( values[ index ] != null ) {
			elements[ index ].style.display = values[ index ];
		}
	}

	return elements;
}

jQuery.fn.extend( {
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each( function() {
			if ( isHiddenWithinTree( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		} );
	}
} );
var rcheckableType = ( /^(?:checkbox|radio)$/i );

var rtagName = ( /<([a-z][^\/\0>\x20\t\r\n\f]+)/i );

var rscriptType = ( /^$|\/(?:java|ecma)script/i );



// We have to close these tags to support XHTML (#13200)
var wrapMap = {

	// Support: IE <=9 only
	option: [ 1, "<select multiple='multiple'>", "</select>" ],

	// XHTML parsers do not magically insert elements in the
	// same way that tag soup parsers do. So we cannot shorten
	// this by omitting <tbody> or other required elements.
	thead: [ 1, "<table>", "</table>" ],
	col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
	tr: [ 2, "<table><tbody>", "</tbody></table>" ],
	td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

	_default: [ 0, "", "" ]
};

// Support: IE <=9 only
wrapMap.optgroup = wrapMap.option;

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;


function getAll( context, tag ) {

	// Support: IE <=9 - 11 only
	// Use typeof to avoid zero-argument method invocation on host objects (#15151)
	var ret;

	if ( typeof context.getElementsByTagName !== "undefined" ) {
		ret = context.getElementsByTagName( tag || "*" );

	} else if ( typeof context.querySelectorAll !== "undefined" ) {
		ret = context.querySelectorAll( tag || "*" );

	} else {
		ret = [];
	}

	if ( tag === undefined || tag && jQuery.nodeName( context, tag ) ) {
		return jQuery.merge( [ context ], ret );
	}

	return ret;
}


// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		dataPriv.set(
			elems[ i ],
			"globalEval",
			!refElements || dataPriv.get( refElements[ i ], "globalEval" )
		);
	}
}


var rhtml = /<|&#?\w+;/;

function buildFragment( elems, context, scripts, selection, ignored ) {
	var elem, tmp, tag, wrap, contains, j,
		fragment = context.createDocumentFragment(),
		nodes = [],
		i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		elem = elems[ i ];

		if ( elem || elem === 0 ) {

			// Add nodes directly
			if ( jQuery.type( elem ) === "object" ) {

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

			// Convert non-html into a text node
			} else if ( !rhtml.test( elem ) ) {
				nodes.push( context.createTextNode( elem ) );

			// Convert html into DOM nodes
			} else {
				tmp = tmp || fragment.appendChild( context.createElement( "div" ) );

				// Deserialize a standard representation
				tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
				wrap = wrapMap[ tag ] || wrapMap._default;
				tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];

				// Descend through wrappers to the right content
				j = wrap[ 0 ];
				while ( j-- ) {
					tmp = tmp.lastChild;
				}

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, tmp.childNodes );

				// Remember the top-level container
				tmp = fragment.firstChild;

				// Ensure the created nodes are orphaned (#12392)
				tmp.textContent = "";
			}
		}
	}

	// Remove wrapper from fragment
	fragment.textContent = "";

	i = 0;
	while ( ( elem = nodes[ i++ ] ) ) {

		// Skip elements already in the context collection (trac-4087)
		if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
			if ( ignored ) {
				ignored.push( elem );
			}
			continue;
		}

		contains = jQuery.contains( elem.ownerDocument, elem );

		// Append to fragment
		tmp = getAll( fragment.appendChild( elem ), "script" );

		// Preserve script evaluation history
		if ( contains ) {
			setGlobalEval( tmp );
		}

		// Capture executables
		if ( scripts ) {
			j = 0;
			while ( ( elem = tmp[ j++ ] ) ) {
				if ( rscriptType.test( elem.type || "" ) ) {
					scripts.push( elem );
				}
			}
		}
	}

	return fragment;
}


( function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) ),
		input = document.createElement( "input" );

	// Support: Android 4.0 - 4.3 only
	// Check state lost if the name is set (#11217)
	// Support: Windows Web Apps (WWA)
	// `name` and `type` must use .setAttribute for WWA (#14901)
	input.setAttribute( "type", "radio" );
	input.setAttribute( "checked", "checked" );
	input.setAttribute( "name", "t" );

	div.appendChild( input );

	// Support: Android <=4.1 only
	// Older WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE <=11 only
	// Make sure textarea (and checkbox) defaultValue is properly cloned
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
} )();
var documentElement = document.documentElement;



var
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

// Support: IE <=9 only
// See #13393 for more info
function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

function on( elem, types, selector, data, fn, one ) {
	var origFn, type;

	// Types can be a map of types/handlers
	if ( typeof types === "object" ) {

		// ( types-Object, selector, data )
		if ( typeof selector !== "string" ) {

			// ( types-Object, data )
			data = data || selector;
			selector = undefined;
		}
		for ( type in types ) {
			on( elem, type, selector, data, types[ type ], one );
		}
		return elem;
	}

	if ( data == null && fn == null ) {

		// ( types, fn )
		fn = selector;
		data = selector = undefined;
	} else if ( fn == null ) {
		if ( typeof selector === "string" ) {

			// ( types, selector, fn )
			fn = data;
			data = undefined;
		} else {

			// ( types, data, fn )
			fn = data;
			data = selector;
			selector = undefined;
		}
	}
	if ( fn === false ) {
		fn = returnFalse;
	} else if ( !fn ) {
		return elem;
	}

	if ( one === 1 ) {
		origFn = fn;
		fn = function( event ) {

			// Can use an empty set, since event contains the info
			jQuery().off( event );
			return origFn.apply( this, arguments );
		};

		// Use same guid so caller can remove using origFn
		fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
	}
	return elem.each( function() {
		jQuery.event.add( this, types, fn, data, selector );
	} );
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.get( elem );

		// Don't attach events to noData or text/comment nodes (but allow plain objects)
		if ( !elemData ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Ensure that invalid selectors throw exceptions at attach time
		// Evaluate against documentElement in case elem is a non-element node (e.g., document)
		if ( selector ) {
			jQuery.find.matchesSelector( documentElement, selector );
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !( events = elemData.events ) ) {
			events = elemData.events = {};
		}
		if ( !( eventHandle = elemData.handle ) ) {
			eventHandle = elemData.handle = function( e ) {

				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend( {
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join( "." )
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !( handlers = events[ type ] ) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup ||
					special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.hasData( elem ) && dataPriv.get( elem );

		if ( !elemData || !( events = elemData.events ) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[ 2 ] &&
				new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector ||
						selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown ||
					special.teardown.call( elem, namespaces, elemData.handle ) === false ) {

					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove data and the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			dataPriv.remove( elem, "handle events" );
		}
	},

	dispatch: function( nativeEvent ) {

		// Make a writable jQuery.Event from the native event object
		var event = jQuery.event.fix( nativeEvent );

		var i, j, ret, matched, handleObj, handlerQueue,
			args = new Array( arguments.length ),
			handlers = ( dataPriv.get( this, "events" ) || {} )[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[ 0 ] = event;

		for ( i = 1; i < arguments.length; i++ ) {
			args[ i ] = arguments[ i ];
		}

		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( ( matched = handlerQueue[ i++ ] ) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( ( handleObj = matched.handlers[ j++ ] ) &&
				!event.isImmediatePropagationStopped() ) {

				// Triggered event must either 1) have no namespace, or 2) have namespace(s)
				// a subset or equal to those in the bound event (both can have no namespace).
				if ( !event.rnamespace || event.rnamespace.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( ( jQuery.event.special[ handleObj.origType ] || {} ).handle ||
						handleObj.handler ).apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( ( event.result = ret ) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, handleObj, sel, matchedHandlers, matchedSelectors,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		if ( delegateCount &&

			// Support: IE <=9
			// Black-hole SVG <use> instance trees (trac-13180)
			cur.nodeType &&

			// Support: Firefox <=42
			// Suppress spec-violating clicks indicating a non-primary pointer button (trac-3861)
			// https://www.w3.org/TR/DOM-Level-3-Events/#event-type-click
			// Support: IE 11 only
			// ...but not arrow key "clicks" of radio inputs, which can have `button` -1 (gh-2343)
			!( event.type === "click" && event.button >= 1 ) ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't check non-elements (#13208)
				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.nodeType === 1 && !( event.type === "click" && cur.disabled === true ) ) {
					matchedHandlers = [];
					matchedSelectors = {};
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matchedSelectors[ sel ] === undefined ) {
							matchedSelectors[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) > -1 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matchedSelectors[ sel ] ) {
							matchedHandlers.push( handleObj );
						}
					}
					if ( matchedHandlers.length ) {
						handlerQueue.push( { elem: cur, handlers: matchedHandlers } );
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		cur = this;
		if ( delegateCount < handlers.length ) {
			handlerQueue.push( { elem: cur, handlers: handlers.slice( delegateCount ) } );
		}

		return handlerQueue;
	},

	addProp: function( name, hook ) {
		Object.defineProperty( jQuery.Event.prototype, name, {
			enumerable: true,
			configurable: true,

			get: jQuery.isFunction( hook ) ?
				function() {
					if ( this.originalEvent ) {
							return hook( this.originalEvent );
					}
				} :
				function() {
					if ( this.originalEvent ) {
							return this.originalEvent[ name ];
					}
				},

			set: function( value ) {
				Object.defineProperty( this, name, {
					enumerable: true,
					configurable: true,
					writable: true,
					value: value
				} );
			}
		} );
	},

	fix: function( originalEvent ) {
		return originalEvent[ jQuery.expando ] ?
			originalEvent :
			new jQuery.Event( originalEvent );
	},

	special: {
		load: {

			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		focus: {

			// Fire native event if possible so blur/focus sequence is correct
			trigger: function() {
				if ( this !== safeActiveElement() && this.focus ) {
					this.focus();
					return false;
				}
			},
			delegateType: "focusin"
		},
		blur: {
			trigger: function() {
				if ( this === safeActiveElement() && this.blur ) {
					this.blur();
					return false;
				}
			},
			delegateType: "focusout"
		},
		click: {

			// For checkbox, fire native event so checked state will be right
			trigger: function() {
				if ( this.type === "checkbox" && this.click && jQuery.nodeName( this, "input" ) ) {
					this.click();
					return false;
				}
			},

			// For cross-browser consistency, don't fire native .click() on links
			_default: function( event ) {
				return jQuery.nodeName( event.target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined && event.originalEvent ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	}
};

jQuery.removeEvent = function( elem, type, handle ) {

	// This "if" is needed for plain objects
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle );
	}
};

jQuery.Event = function( src, props ) {

	// Allow instantiation without the 'new' keyword
	if ( !( this instanceof jQuery.Event ) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&

				// Support: Android <=2.3 only
				src.returnValue === false ?
			returnTrue :
			returnFalse;

		// Create target properties
		// Support: Safari <=6 - 7 only
		// Target should not be a text node (#504, #13143)
		this.target = ( src.target && src.target.nodeType === 3 ) ?
			src.target.parentNode :
			src.target;

		this.currentTarget = src.currentTarget;
		this.relatedTarget = src.relatedTarget;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	constructor: jQuery.Event,
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,
	isSimulated: false,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e && !this.isSimulated ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		var e = this.originalEvent;

		this.isImmediatePropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopImmediatePropagation();
		}

		this.stopPropagation();
	}
};

// Includes all common event props including KeyEvent and MouseEvent specific props
jQuery.each( {
	altKey: true,
	bubbles: true,
	cancelable: true,
	changedTouches: true,
	ctrlKey: true,
	detail: true,
	eventPhase: true,
	metaKey: true,
	pageX: true,
	pageY: true,
	shiftKey: true,
	view: true,
	"char": true,
	charCode: true,
	key: true,
	keyCode: true,
	button: true,
	buttons: true,
	clientX: true,
	clientY: true,
	offsetX: true,
	offsetY: true,
	pointerId: true,
	pointerType: true,
	screenX: true,
	screenY: true,
	targetTouches: true,
	toElement: true,
	touches: true,

	which: function( event ) {
		var button = event.button;

		// Add which for key events
		if ( event.which == null && rkeyEvent.test( event.type ) ) {
			return event.charCode != null ? event.charCode : event.keyCode;
		}

		// Add which for click: 1 === left; 2 === middle; 3 === right
		if ( !event.which && button !== undefined && rmouseEvent.test( event.type ) ) {
			if ( button & 1 ) {
				return 1;
			}

			if ( button & 2 ) {
				return 3;
			}

			if ( button & 4 ) {
				return 2;
			}

			return 0;
		}

		return event.which;
	}
}, jQuery.event.addProp );

// Create mouseenter/leave events using mouseover/out and event-time checks
// so that event delegation works in jQuery.
// Do the same for pointerenter/pointerleave and pointerover/pointerout
//
// Support: Safari 7 only
// Safari sends mouseenter too often; see:
// https://bugs.chromium.org/p/chromium/issues/detail?id=470258
// for the description of the bug (it existed in older Chrome versions as well).
jQuery.each( {
	mouseenter: "mouseover",
	mouseleave: "mouseout",
	pointerenter: "pointerover",
	pointerleave: "pointerout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mouseenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || ( related !== target && !jQuery.contains( target, related ) ) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
} );

jQuery.fn.extend( {

	on: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn );
	},
	one: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {

			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ?
					handleObj.origType + "." + handleObj.namespace :
					handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {

			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {

			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each( function() {
			jQuery.event.remove( this, types, fn, selector );
		} );
	}
} );


var

	/* eslint-disable max-len */

	// See https://github.com/eslint/eslint/issues/3229
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi,

	/* eslint-enable */

	// Support: IE <=10 - 11, Edge 12 - 13
	// In IE/Edge using regex groups here causes severe slowdowns.
	// See https://connect.microsoft.com/IE/feedback/details/1736512/
	rnoInnerhtml = /<script|<style|<link/i,

	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptTypeMasked = /^true\/(.*)/,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

function manipulationTarget( elem, content ) {
	if ( jQuery.nodeName( elem, "table" ) &&
		jQuery.nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ) {

		return elem.getElementsByTagName( "tbody" )[ 0 ] || elem;
	}

	return elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = ( elem.getAttribute( "type" ) !== null ) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	var match = rscriptTypeMasked.exec( elem.type );

	if ( match ) {
		elem.type = match[ 1 ];
	} else {
		elem.removeAttribute( "type" );
	}

	return elem;
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( dataPriv.hasData( src ) ) {
		pdataOld = dataPriv.access( src );
		pdataCur = dataPriv.set( dest, pdataOld );
		events = pdataOld.events;

		if ( events ) {
			delete pdataCur.handle;
			pdataCur.events = {};

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( dataUser.hasData( src ) ) {
		udataOld = dataUser.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		dataUser.set( dest, udataCur );
	}
}

// Fix IE bugs, see support tests
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

function domManip( collection, args, callback, ignored ) {

	// Flatten any nested arrays
	args = concat.apply( [], args );

	var fragment, first, scripts, hasScripts, node, doc,
		i = 0,
		l = collection.length,
		iNoClone = l - 1,
		value = args[ 0 ],
		isFunction = jQuery.isFunction( value );

	// We can't cloneNode fragments that contain checked, in WebKit
	if ( isFunction ||
			( l > 1 && typeof value === "string" &&
				!support.checkClone && rchecked.test( value ) ) ) {
		return collection.each( function( index ) {
			var self = collection.eq( index );
			if ( isFunction ) {
				args[ 0 ] = value.call( this, index, self.html() );
			}
			domManip( self, args, callback, ignored );
		} );
	}

	if ( l ) {
		fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
		first = fragment.firstChild;

		if ( fragment.childNodes.length === 1 ) {
			fragment = first;
		}

		// Require either new content or an interest in ignored elements to invoke the callback
		if ( first || ignored ) {
			scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
			hasScripts = scripts.length;

			// Use the original fragment for the last item
			// instead of the first because it can end up
			// being emptied incorrectly in certain situations (#8070).
			for ( ; i < l; i++ ) {
				node = fragment;

				if ( i !== iNoClone ) {
					node = jQuery.clone( node, true, true );

					// Keep references to cloned scripts for later restoration
					if ( hasScripts ) {

						// Support: Android <=4.0 only, PhantomJS 1 only
						// push.apply(_, arraylike) throws on ancient WebKit
						jQuery.merge( scripts, getAll( node, "script" ) );
					}
				}

				callback.call( collection[ i ], node, i );
			}

			if ( hasScripts ) {
				doc = scripts[ scripts.length - 1 ].ownerDocument;

				// Reenable scripts
				jQuery.map( scripts, restoreScript );

				// Evaluate executable scripts on first document insertion
				for ( i = 0; i < hasScripts; i++ ) {
					node = scripts[ i ];
					if ( rscriptType.test( node.type || "" ) &&
						!dataPriv.access( node, "globalEval" ) &&
						jQuery.contains( doc, node ) ) {

						if ( node.src ) {

							// Optional AJAX dependency, but won't run scripts if not present
							if ( jQuery._evalUrl ) {
								jQuery._evalUrl( node.src );
							}
						} else {
							DOMEval( node.textContent.replace( rcleanScript, "" ), doc );
						}
					}
				}
			}
		}
	}

	return collection;
}

function remove( elem, selector, keepData ) {
	var node,
		nodes = selector ? jQuery.filter( selector, elem ) : elem,
		i = 0;

	for ( ; ( node = nodes[ i ] ) != null; i++ ) {
		if ( !keepData && node.nodeType === 1 ) {
			jQuery.cleanData( getAll( node ) );
		}

		if ( node.parentNode ) {
			if ( keepData && jQuery.contains( node.ownerDocument, node ) ) {
				setGlobalEval( getAll( node, "script" ) );
			}
			node.parentNode.removeChild( node );
		}
	}

	return elem;
}

jQuery.extend( {
	htmlPrefilter: function( html ) {
		return html.replace( rxhtmlTag, "<$1></$2>" );
	},

	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = jQuery.contains( elem.ownerDocument, elem );

		// Fix IE cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: https://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	cleanData: function( elems ) {
		var data, elem, type,
			special = jQuery.event.special,
			i = 0;

		for ( ; ( elem = elems[ i ] ) !== undefined; i++ ) {
			if ( acceptData( elem ) ) {
				if ( ( data = elem[ dataPriv.expando ] ) ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataPriv.expando ] = undefined;
				}
				if ( elem[ dataUser.expando ] ) {

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataUser.expando ] = undefined;
				}
			}
		}
	}
} );

jQuery.fn.extend( {
	detach: function( selector ) {
		return remove( this, selector, true );
	},

	remove: function( selector ) {
		return remove( this, selector );
	},

	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each( function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				} );
		}, null, value, arguments.length );
	},

	append: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		} );
	},

	prepend: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		} );
	},

	before: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		} );
	},

	after: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		} );
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; ( elem = this[ i ] ) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		} );
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = jQuery.htmlPrefilter( value );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch ( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var ignored = [];

		// Make the changes, replacing each non-ignored context element with the new content
		return domManip( this, arguments, function( elem ) {
			var parent = this.parentNode;

			if ( jQuery.inArray( this, ignored ) < 0 ) {
				jQuery.cleanData( getAll( this ) );
				if ( parent ) {
					parent.replaceChild( elem, this );
				}
			}

		// Force callback invocation
		}, ignored );
	}
} );

jQuery.each( {
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: Android <=4.0 only, PhantomJS 1 only
			// .get() because push.apply(_, arraylike) throws on ancient WebKit
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
} );
var rmargin = ( /^margin/ );

var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

var getStyles = function( elem ) {

		// Support: IE <=11 only, Firefox <=30 (#15098, #14150)
		// IE throws on elements created in popups
		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
		var view = elem.ownerDocument.defaultView;

		if ( !view || !view.opener ) {
			view = window;
		}

		return view.getComputedStyle( elem );
	};



( function() {

	// Executing both pixelPosition & boxSizingReliable tests require only one layout
	// so they're executed at the same time to save the second computation.
	function computeStyleTests() {

		// This is a singleton, we need to execute it only once
		if ( !div ) {
			return;
		}

		div.style.cssText =
			"box-sizing:border-box;" +
			"position:relative;display:block;" +
			"margin:auto;border:1px;padding:1px;" +
			"top:1%;width:50%";
		div.innerHTML = "";
		documentElement.appendChild( container );

		var divStyle = window.getComputedStyle( div );
		pixelPositionVal = divStyle.top !== "1%";

		// Support: Android 4.0 - 4.3 only, Firefox <=3 - 44
		reliableMarginLeftVal = divStyle.marginLeft === "2px";
		boxSizingReliableVal = divStyle.width === "4px";

		// Support: Android 4.0 - 4.3 only
		// Some styles come back with percentage values, even though they shouldn't
		div.style.marginRight = "50%";
		pixelMarginRightVal = divStyle.marginRight === "4px";

		documentElement.removeChild( container );

		// Nullify the div so it wouldn't be stored in the memory and
		// it will also be a sign that checks already performed
		div = null;
	}

	var pixelPositionVal, boxSizingReliableVal, pixelMarginRightVal, reliableMarginLeftVal,
		container = document.createElement( "div" ),
		div = document.createElement( "div" );

	// Finish early in limited (non-browser) environments
	if ( !div.style ) {
		return;
	}

	// Support: IE <=9 - 11 only
	// Style of cloned element affects source element cloned (#8908)
	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	container.style.cssText = "border:0;width:8px;height:0;top:0;left:-9999px;" +
		"padding:0;margin-top:1px;position:absolute";
	container.appendChild( div );

	jQuery.extend( support, {
		pixelPosition: function() {
			computeStyleTests();
			return pixelPositionVal;
		},
		boxSizingReliable: function() {
			computeStyleTests();
			return boxSizingReliableVal;
		},
		pixelMarginRight: function() {
			computeStyleTests();
			return pixelMarginRightVal;
		},
		reliableMarginLeft: function() {
			computeStyleTests();
			return reliableMarginLeftVal;
		}
	} );
} )();


function curCSS( elem, name, computed ) {
	var width, minWidth, maxWidth, ret,
		style = elem.style;

	computed = computed || getStyles( elem );

	// Support: IE <=9 only
	// getPropertyValue is only needed for .css('filter') (#12537)
	if ( computed ) {
		ret = computed.getPropertyValue( name ) || computed[ name ];

		if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// A tribute to the "awesome hack by Dean Edwards"
		// Android Browser returns percentage for some values,
		// but width seems to be reliably pixels.
		// This is against the CSSOM draft spec:
		// https://drafts.csswg.org/cssom/#resolved-values
		if ( !support.pixelMarginRight() && rnumnonpx.test( ret ) && rmargin.test( name ) ) {

			// Remember the original values
			width = style.width;
			minWidth = style.minWidth;
			maxWidth = style.maxWidth;

			// Put in the new values to get a computed value out
			style.minWidth = style.maxWidth = style.width = ret;
			ret = computed.width;

			// Revert the changed values
			style.width = width;
			style.minWidth = minWidth;
			style.maxWidth = maxWidth;
		}
	}

	return ret !== undefined ?

		// Support: IE <=9 - 11 only
		// IE returns zIndex value as an integer.
		ret + "" :
		ret;
}


function addGetHookIf( conditionFn, hookFn ) {

	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			if ( conditionFn() ) {

				// Hook not needed (or it's not possible to use it due
				// to missing dependency), remove it.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.
			return ( this.get = hookFn ).apply( this, arguments );
		}
	};
}


var

	// Swappable if display is none or starts with table
	// except "table", "table-cell", or "table-caption"
	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: "0",
		fontWeight: "400"
	},

	cssPrefixes = [ "Webkit", "Moz", "ms" ],
	emptyStyle = document.createElement( "div" ).style;

// Return a css property mapped to a potentially vendor prefixed property
function vendorPropName( name ) {

	// Shortcut for names that are not vendor prefixed
	if ( name in emptyStyle ) {
		return name;
	}

	// Check for vendor prefixed names
	var capName = name[ 0 ].toUpperCase() + name.slice( 1 ),
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in emptyStyle ) {
			return name;
		}
	}
}

function setPositiveNumber( elem, value, subtract ) {

	// Any relative (+/-) values have already been
	// normalized at this point
	var matches = rcssNum.exec( value );
	return matches ?

		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 2 ] - ( subtract || 0 ) ) + ( matches[ 3 ] || "px" ) :
		value;
}

function augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {
	var i,
		val = 0;

	// If we already have the right measurement, avoid augmentation
	if ( extra === ( isBorderBox ? "border" : "content" ) ) {
		i = 4;

	// Otherwise initialize for horizontal or vertical properties
	} else {
		i = name === "width" ? 1 : 0;
	}

	for ( ; i < 4; i += 2 ) {

		// Both box models exclude margin, so add it if we want it
		if ( extra === "margin" ) {
			val += jQuery.css( elem, extra + cssExpand[ i ], true, styles );
		}

		if ( isBorderBox ) {

			// border-box includes padding, so remove it if we want content
			if ( extra === "content" ) {
				val -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// At this point, extra isn't border nor margin, so remove border
			if ( extra !== "margin" ) {
				val -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		} else {

			// At this point, extra isn't content, so add padding
			val += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// At this point, extra isn't content nor padding, so add border
			if ( extra !== "padding" ) {
				val += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	return val;
}

function getWidthOrHeight( elem, name, extra ) {

	// Start with offset property, which is equivalent to the border-box value
	var val,
		valueIsBorderBox = true,
		styles = getStyles( elem ),
		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

	// Support: IE <=11 only
	// Running getBoundingClientRect on a disconnected node
	// in IE throws an error.
	if ( elem.getClientRects().length ) {
		val = elem.getBoundingClientRect()[ name ];
	}

	// Some non-html elements return undefined for offsetWidth, so check for null/undefined
	// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
	// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
	if ( val <= 0 || val == null ) {

		// Fall back to computed then uncomputed css if necessary
		val = curCSS( elem, name, styles );
		if ( val < 0 || val == null ) {
			val = elem.style[ name ];
		}

		// Computed unit is not pixels. Stop here and return.
		if ( rnumnonpx.test( val ) ) {
			return val;
		}

		// Check for style in case a browser which returns unreliable values
		// for getComputedStyle silently falls back to the reliable elem.style
		valueIsBorderBox = isBorderBox &&
			( support.boxSizingReliable() || val === elem.style[ name ] );

		// Normalize "", auto, and prepare for extra
		val = parseFloat( val ) || 0;
	}

	// Use the active box-sizing model to add/subtract irrelevant styles
	return ( val +
		augmentWidthOrHeight(
			elem,
			name,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles
		)
	) + "px";
}

jQuery.extend( {

	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {

					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"animationIterationCount": true,
		"columnCount": true,
		"fillOpacity": true,
		"flexGrow": true,
		"flexShrink": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		"float": "cssFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {

		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = jQuery.camelCase( name ),
			style = elem.style;

		name = jQuery.cssProps[ origName ] ||
			( jQuery.cssProps[ origName ] = vendorPropName( origName ) || origName );

		// Gets hook for the prefixed version, then unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// Convert "+=" or "-=" to relative numbers (#7345)
			if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
				value = adjustCSS( elem, name, ret );

				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set (#7116)
			if ( value == null || value !== value ) {
				return;
			}

			// If a number was passed in, add the unit (except for certain CSS properties)
			if ( type === "number" ) {
				value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
			}

			// background-* props affect original clone's values
			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !( "set" in hooks ) ||
				( value = hooks.set( elem, value, extra ) ) !== undefined ) {

				style[ name ] = value;
			}

		} else {

			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks &&
				( ret = hooks.get( elem, false, extra ) ) !== undefined ) {

				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var val, num, hooks,
			origName = jQuery.camelCase( name );

		// Make sure that we're working with the right name
		name = jQuery.cssProps[ origName ] ||
			( jQuery.cssProps[ origName ] = vendorPropName( origName ) || origName );

		// Try prefixed name followed by the unprefixed name
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		// Convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Make numeric if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || isFinite( num ) ? num || 0 : val;
		}
		return val;
	}
} );

jQuery.each( [ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {

				// Certain elements can have dimension info if we invisibly show them
				// but it must have a current display style that would benefit
				return rdisplayswap.test( jQuery.css( elem, "display" ) ) &&

					// Support: Safari 8+
					// Table columns in Safari have non-zero offsetWidth & zero
					// getBoundingClientRect().width unless display is changed.
					// Support: IE <=11 only
					// Running getBoundingClientRect on a disconnected node
					// in IE throws an error.
					( !elem.getClientRects().length || !elem.getBoundingClientRect().width ) ?
						swap( elem, cssShow, function() {
							return getWidthOrHeight( elem, name, extra );
						} ) :
						getWidthOrHeight( elem, name, extra );
			}
		},

		set: function( elem, value, extra ) {
			var matches,
				styles = extra && getStyles( elem ),
				subtract = extra && augmentWidthOrHeight(
					elem,
					name,
					extra,
					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
					styles
				);

			// Convert to pixels if value adjustment is needed
			if ( subtract && ( matches = rcssNum.exec( value ) ) &&
				( matches[ 3 ] || "px" ) !== "px" ) {

				elem.style[ name ] = value;
				value = jQuery.css( elem, name );
			}

			return setPositiveNumber( elem, value, subtract );
		}
	};
} );

jQuery.cssHooks.marginLeft = addGetHookIf( support.reliableMarginLeft,
	function( elem, computed ) {
		if ( computed ) {
			return ( parseFloat( curCSS( elem, "marginLeft" ) ) ||
				elem.getBoundingClientRect().left -
					swap( elem, { marginLeft: 0 }, function() {
						return elem.getBoundingClientRect().left;
					} )
				) + "px";
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each( {
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// Assumes a single number if not a string
				parts = typeof value === "string" ? value.split( " " ) : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( !rmargin.test( prefix ) ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
} );

jQuery.fn.extend( {
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( jQuery.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	}
} );


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || jQuery.easing._default;
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			// Use a property on the element directly when it is not a DOM element,
			// or when there is no matching style property that exists.
			if ( tween.elem.nodeType !== 1 ||
				tween.elem[ tween.prop ] != null && tween.elem.style[ tween.prop ] == null ) {
				return tween.elem[ tween.prop ];
			}

			// Passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails.
			// Simple values such as "10px" are parsed to Float;
			// complex values such as "rotate(1rad)" are returned as-is.
			result = jQuery.css( tween.elem, tween.prop, "" );

			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {

			// Use step hook for back compat.
			// Use cssHook if its there.
			// Use .style if available and use plain properties where available.
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.nodeType === 1 &&
				( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null ||
					jQuery.cssHooks[ tween.prop ] ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE <=9 only
// Panic based approach to setting things on disconnected nodes
Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	},
	_default: "swing"
};

jQuery.fx = Tween.prototype.init;

// Back compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, timerId,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rrun = /queueHooks$/;

function raf() {
	if ( timerId ) {
		window.requestAnimationFrame( raf );
		jQuery.fx.tick();
	}
}

// Animations created synchronously will run synchronously
function createFxNow() {
	window.setTimeout( function() {
		fxNow = undefined;
	} );
	return ( fxNow = jQuery.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		i = 0,
		attrs = { height: type };

	// If we include width, step value is 1 to do all cssExpand values,
	// otherwise step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( Animation.tweeners[ prop ] || [] ).concat( Animation.tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( ( tween = collection[ index ].call( animation, prop, value ) ) ) {

			// We're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	var prop, value, toggle, hooks, oldfire, propTween, restoreDisplay, display,
		isBox = "width" in props || "height" in props,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHiddenWithinTree( elem ),
		dataShow = dataPriv.get( elem, "fxshow" );

	// Queue-skipping animations hijack the fx hooks
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always( function() {

			// Ensure the complete handler is called before this completes
			anim.always( function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			} );
		} );
	}

	// Detect show/hide animations
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.test( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// Pretend to be hidden if this is a "show" and
				// there is still data from a stopped show/hide
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;

				// Ignore all other no-op show/hide data
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
		}
	}

	// Bail out if this is a no-op like .hide().hide()
	propTween = !jQuery.isEmptyObject( props );
	if ( !propTween && jQuery.isEmptyObject( orig ) ) {
		return;
	}

	// Restrict "overflow" and "display" styles during box animations
	if ( isBox && elem.nodeType === 1 ) {

		// Support: IE <=9 - 11, Edge 12 - 13
		// Record all 3 overflow attributes because IE does not infer the shorthand
		// from identically-valued overflowX and overflowY
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Identify a display type, preferring old show/hide data over the CSS cascade
		restoreDisplay = dataShow && dataShow.display;
		if ( restoreDisplay == null ) {
			restoreDisplay = dataPriv.get( elem, "display" );
		}
		display = jQuery.css( elem, "display" );
		if ( display === "none" ) {
			if ( restoreDisplay ) {
				display = restoreDisplay;
			} else {

				// Get nonempty value(s) by temporarily forcing visibility
				showHide( [ elem ], true );
				restoreDisplay = elem.style.display || restoreDisplay;
				display = jQuery.css( elem, "display" );
				showHide( [ elem ] );
			}
		}

		// Animate inline elements as inline-block
		if ( display === "inline" || display === "inline-block" && restoreDisplay != null ) {
			if ( jQuery.css( elem, "float" ) === "none" ) {

				// Restore the original display value at the end of pure show/hide animations
				if ( !propTween ) {
					anim.done( function() {
						style.display = restoreDisplay;
					} );
					if ( restoreDisplay == null ) {
						display = style.display;
						restoreDisplay = display === "none" ? "" : display;
					}
				}
				style.display = "inline-block";
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		anim.always( function() {
			style.overflow = opts.overflow[ 0 ];
			style.overflowX = opts.overflow[ 1 ];
			style.overflowY = opts.overflow[ 2 ];
		} );
	}

	// Implement show/hide animations
	propTween = false;
	for ( prop in orig ) {

		// General show/hide setup for this element animation
		if ( !propTween ) {
			if ( dataShow ) {
				if ( "hidden" in dataShow ) {
					hidden = dataShow.hidden;
				}
			} else {
				dataShow = dataPriv.access( elem, "fxshow", { display: restoreDisplay } );
			}

			// Store hidden/visible for toggle so `.stop().toggle()` "reverses"
			if ( toggle ) {
				dataShow.hidden = !hidden;
			}

			// Show elements before animating them
			if ( hidden ) {
				showHide( [ elem ], true );
			}

			/* eslint-disable no-loop-func */

			anim.done( function() {

			/* eslint-enable no-loop-func */

				// The final step of a "hide" animation is actually hiding the element
				if ( !hidden ) {
					showHide( [ elem ] );
				}
				dataPriv.remove( elem, "fxshow" );
				for ( prop in orig ) {
					jQuery.style( elem, prop, orig[ prop ] );
				}
			} );
		}

		// Per-property setup
		propTween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );
		if ( !( prop in dataShow ) ) {
			dataShow[ prop ] = propTween.start;
			if ( hidden ) {
				propTween.end = propTween.start;
				propTween.start = 0;
			}
		}
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = jQuery.camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( jQuery.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// Not quite $.extend, this won't overwrite existing keys.
			// Reusing 'index' because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = Animation.prefilters.length,
		deferred = jQuery.Deferred().always( function() {

			// Don't match elem in the :animated selector
			delete tick.elem;
		} ),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),

				// Support: Android 2.3 only
				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ] );

			if ( percent < 1 && length ) {
				return remaining;
			} else {
				deferred.resolveWith( elem, [ animation ] );
				return false;
			}
		},
		animation = deferred.promise( {
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, {
				specialEasing: {},
				easing: jQuery.easing._default
			}, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,

					// If we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// Resolve when we played the last frame; otherwise, reject
				if ( gotoEnd ) {
					deferred.notifyWith( elem, [ animation, 1, 0 ] );
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		} ),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length; index++ ) {
		result = Animation.prefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			if ( jQuery.isFunction( result.stop ) ) {
				jQuery._queueHooks( animation.elem, animation.opts.queue ).stop =
					jQuery.proxy( result.stop, result );
			}
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( jQuery.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		} )
	);

	// attach callbacks from options
	return animation.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );
}

jQuery.Animation = jQuery.extend( Animation, {

	tweeners: {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value );
			adjustCSS( tween.elem, prop, rcssNum.exec( value ), tween );
			return tween;
		} ]
	},

	tweener: function( props, callback ) {
		if ( jQuery.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.match( rnothtmlwhite );
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length; index++ ) {
			prop = props[ index ];
			Animation.tweeners[ prop ] = Animation.tweeners[ prop ] || [];
			Animation.tweeners[ prop ].unshift( callback );
		}
	},

	prefilters: [ defaultPrefilter ],

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			Animation.prefilters.unshift( callback );
		} else {
			Animation.prefilters.push( callback );
		}
	}
} );

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			jQuery.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
	};

	// Go to the end state if fx are off or if document is hidden
	if ( jQuery.fx.off || document.hidden ) {
		opt.duration = 0;

	} else {
		if ( typeof opt.duration !== "number" ) {
			if ( opt.duration in jQuery.fx.speeds ) {
				opt.duration = jQuery.fx.speeds[ opt.duration ];

			} else {
				opt.duration = jQuery.fx.speeds._default;
			}
		}
	}

	// Normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( jQuery.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend( {
	fadeTo: function( speed, to, easing, callback ) {

		// Show any hidden elements after setting opacity to 0
		return this.filter( isHiddenWithinTree ).css( "opacity", 0 ).show()

			// Animate to the value specified
			.end().animate( { opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {

				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || dataPriv.get( this, "finish" ) ) {
					anim.stop( true );
				}
			};
			doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each( function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = dataPriv.get( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this &&
					( type == null || timers[ index ].queue === type ) ) {

					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// Start the next in the queue if the last step wasn't forced.
			// Timers currently will call their complete callbacks, which
			// will dequeue but only if they were gotoEnd.
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		} );
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each( function() {
			var index,
				data = dataPriv.get( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// Enable finishing flag on private data
			data.finish = true;

			// Empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// Look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// Look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// Turn off finishing flag
			delete data.finish;
		} );
	}
} );

jQuery.each( [ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
} );

// Generate shortcuts for custom animations
jQuery.each( {
	slideDown: genFx( "show" ),
	slideUp: genFx( "hide" ),
	slideToggle: genFx( "toggle" ),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
} );

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		i = 0,
		timers = jQuery.timers;

	fxNow = jQuery.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];

		// Checks the timer has not already been removed
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	if ( timer() ) {
		jQuery.fx.start();
	} else {
		jQuery.timers.pop();
	}
};

jQuery.fx.interval = 13;
jQuery.fx.start = function() {
	if ( !timerId ) {
		timerId = window.requestAnimationFrame ?
			window.requestAnimationFrame( raf ) :
			window.setInterval( jQuery.fx.tick, jQuery.fx.interval );
	}
};

jQuery.fx.stop = function() {
	if ( window.cancelAnimationFrame ) {
		window.cancelAnimationFrame( timerId );
	} else {
		window.clearInterval( timerId );
	}

	timerId = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,

	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// https://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = window.setTimeout( next, time );
		hooks.stop = function() {
			window.clearTimeout( timeout );
		};
	} );
};


( function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: Android <=4.3 only
	// Default value for a checkbox should be "on"
	support.checkOn = input.value !== "";

	// Support: IE <=11 only
	// Must access selectedIndex to make default options select
	support.optSelected = opt.selected;

	// Support: IE <=11 only
	// An input loses its value after becoming a radio
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
} )();


var boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend( {
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each( function() {
			jQuery.removeAttr( this, name );
		} );
	}
} );

jQuery.extend( {
	attr: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set attributes on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		// Attribute hooks are determined by the lowercase version
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			hooks = jQuery.attrHooks[ name.toLowerCase() ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
		}

		if ( value !== undefined ) {
			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;
			}

			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			elem.setAttribute( name, value + "" );
			return value;
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		ret = jQuery.find.attr( elem, name );

		// Non-existent attributes return null, we normalize to undefined
		return ret == null ? undefined : ret;
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					jQuery.nodeName( elem, "input" ) ) {
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	},

	removeAttr: function( elem, value ) {
		var name,
			i = 0,

			// Attribute names can contain non-HTML whitespace characters
			// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
			attrNames = value && value.match( rnothtmlwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( ( name = attrNames[ i++ ] ) ) {
				elem.removeAttribute( name );
			}
		}
	}
} );

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {

			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};

jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle,
			lowercaseName = name.toLowerCase();

		if ( !isXML ) {

			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ lowercaseName ];
			attrHandle[ lowercaseName ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				lowercaseName :
				null;
			attrHandle[ lowercaseName ] = handle;
		}
		return ret;
	};
} );




var rfocusable = /^(?:input|select|textarea|button)$/i,
	rclickable = /^(?:a|area)$/i;

jQuery.fn.extend( {
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each( function() {
			delete this[ jQuery.propFix[ name ] || name ];
		} );
	}
} );

jQuery.extend( {
	prop: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set properties on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {

			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			return ( elem[ name ] = value );
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		return elem[ name ];
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {

				// Support: IE <=9 - 11 only
				// elem.tabIndex doesn't always return the
				// correct value when it hasn't been explicitly set
				// https://web.archive.org/web/20141116233347/http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				// Use proper attribute retrieval(#12072)
				var tabindex = jQuery.find.attr( elem, "tabindex" );

				if ( tabindex ) {
					return parseInt( tabindex, 10 );
				}

				if (
					rfocusable.test( elem.nodeName ) ||
					rclickable.test( elem.nodeName ) &&
					elem.href
				) {
					return 0;
				}

				return -1;
			}
		}
	},

	propFix: {
		"for": "htmlFor",
		"class": "className"
	}
} );

// Support: IE <=11 only
// Accessing the selectedIndex property
// forces the browser to respect setting selected
// on the option
// The getter ensures a default option is selected
// when in an optgroup
// eslint rule "no-unused-expressions" is disabled for this code
// since it considers such accessions noop
if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		},
		set: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent ) {
				parent.selectedIndex;

				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
		}
	};
}

jQuery.each( [
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
} );




	// Strip and collapse whitespace according to HTML spec
	// https://html.spec.whatwg.org/multipage/infrastructure.html#strip-and-collapse-whitespace
	function stripAndCollapse( value ) {
		var tokens = value.match( rnothtmlwhite ) || [];
		return tokens.join( " " );
	}


function getClass( elem ) {
	return elem.getAttribute && elem.getAttribute( "class" ) || "";
}

jQuery.fn.extend( {
	addClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( jQuery.isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		if ( typeof value === "string" && value ) {
			classes = value.match( rnothtmlwhite ) || [];

			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( jQuery.isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		if ( !arguments.length ) {
			return this.attr( "class", "" );
		}

		if ( typeof value === "string" && value ) {
			classes = value.match( rnothtmlwhite ) || [];

			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );

				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {

						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value;

		if ( typeof stateVal === "boolean" && type === "string" ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( jQuery.isFunction( value ) ) {
			return this.each( function( i ) {
				jQuery( this ).toggleClass(
					value.call( this, i, getClass( this ), stateVal ),
					stateVal
				);
			} );
		}

		return this.each( function() {
			var className, i, self, classNames;

			if ( type === "string" ) {

				// Toggle individual class names
				i = 0;
				self = jQuery( this );
				classNames = value.match( rnothtmlwhite ) || [];

				while ( ( className = classNames[ i++ ] ) ) {

					// Check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( value === undefined || type === "boolean" ) {
				className = getClass( this );
				if ( className ) {

					// Store className if set
					dataPriv.set( this, "__className__", className );
				}

				// If the element has a class name or if we're passed `false`,
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				if ( this.setAttribute ) {
					this.setAttribute( "class",
						className || value === false ?
						"" :
						dataPriv.get( this, "__className__" ) || ""
					);
				}
			}
		} );
	},

	hasClass: function( selector ) {
		var className, elem,
			i = 0;

		className = " " + selector + " ";
		while ( ( elem = this[ i++ ] ) ) {
			if ( elem.nodeType === 1 &&
				( " " + stripAndCollapse( getClass( elem ) ) + " " ).indexOf( className ) > -1 ) {
					return true;
			}
		}

		return false;
	}
} );




var rreturn = /\r/g;

jQuery.fn.extend( {
	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[ 0 ];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] ||
					jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks &&
					"get" in hooks &&
					( ret = hooks.get( elem, "value" ) ) !== undefined
				) {
					return ret;
				}

				ret = elem.value;

				// Handle most common string cases
				if ( typeof ret === "string" ) {
					return ret.replace( rreturn, "" );
				}

				// Handle cases where value is null/undef or number
				return ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each( function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				} );
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !( "set" in hooks ) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		} );
	}
} );

jQuery.extend( {
	valHooks: {
		option: {
			get: function( elem ) {

				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :

					// Support: IE <=10 - 11 only
					// option.text throws exceptions (#14686, #14858)
					// Strip and collapse whitespace
					// https://html.spec.whatwg.org/#strip-and-collapse-whitespace
					stripAndCollapse( jQuery.text( elem ) );
			}
		},
		select: {
			get: function( elem ) {
				var value, option, i,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one",
					values = one ? null : [],
					max = one ? index + 1 : options.length;

				if ( index < 0 ) {
					i = max;

				} else {
					i = one ? index : 0;
				}

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// Support: IE <=9 only
					// IE8-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&

							// Don't return options that are disabled or in a disabled optgroup
							!option.disabled &&
							( !option.parentNode.disabled ||
								!jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];

					/* eslint-disable no-cond-assign */

					if ( option.selected =
						jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1
					) {
						optionSet = true;
					}

					/* eslint-enable no-cond-assign */
				}

				// Force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
} );

// Radios and checkboxes getter/setter
jQuery.each( [ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery( elem ).val(), value ) > -1 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			return elem.getAttribute( "value" ) === null ? "on" : elem.value;
		};
	}
} );




// Return jQuery for attributes-only inclusion


var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/;

jQuery.extend( jQuery.event, {

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split( "." ) : [];

		cur = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf( "." ) > -1 ) {

			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split( "." );
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf( ":" ) < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join( "." );
		event.rnamespace = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === ( elem.ownerDocument || document ) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( ( cur = eventPath[ i++ ] ) && !event.isPropagationStopped() ) {

			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( dataPriv.get( cur, "events" ) || {} )[ event.type ] &&
				dataPriv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( ( !special._default ||
				special._default.apply( eventPath.pop(), data ) === false ) &&
				acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && jQuery.isFunction( elem[ type ] ) && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					elem[ type ]();
					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	// Piggyback on a donor event to simulate a different one
	// Used only for `focus(in | out)` events
	simulate: function( type, elem, event ) {
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true
			}
		);

		jQuery.event.trigger( e, null, elem );
	}

} );

jQuery.fn.extend( {

	trigger: function( type, data ) {
		return this.each( function() {
			jQuery.event.trigger( type, data, this );
		} );
	},
	triggerHandler: function( type, data ) {
		var elem = this[ 0 ];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
} );


jQuery.each( ( "blur focus focusin focusout resize scroll click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup contextmenu" ).split( " " ),
	function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
} );

jQuery.fn.extend( {
	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	}
} );




support.focusin = "onfocusin" in window;


// Support: Firefox <=44
// Firefox doesn't have focus(in | out) events
// Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
//
// Support: Chrome <=48 - 49, Safari <=9.0 - 9.1
// focus(in | out) events fire after focus & blur events,
// which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
// Related ticket - https://bugs.chromium.org/p/chromium/issues/detail?id=449857
if ( !support.focusin ) {
	jQuery.each( { focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
			jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ) );
		};

		jQuery.event.special[ fix ] = {
			setup: function() {
				var doc = this.ownerDocument || this,
					attaches = dataPriv.access( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				dataPriv.access( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this,
					attaches = dataPriv.access( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					dataPriv.remove( doc, fix );

				} else {
					dataPriv.access( doc, fix, attaches );
				}
			}
		};
	} );
}
var location = window.location;

var nonce = jQuery.now();

var rquery = ( /\?/ );



// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml;
	if ( !data || typeof data !== "string" ) {
		return null;
	}

	// Support: IE 9 - 11 only
	// IE throws on parseFromString with invalid input.
	try {
		xml = ( new window.DOMParser() ).parseFromString( data, "text/xml" );
	} catch ( e ) {
		xml = undefined;
	}

	if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
		jQuery.error( "Invalid XML: " + data );
	}
	return xml;
};


var
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( jQuery.isArray( obj ) ) {

		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {

				// Treat each array item as a scalar.
				add( prefix, v );

			} else {

				// Item is non-scalar (array or object), encode its numeric index.
				buildParams(
					prefix + "[" + ( typeof v === "object" && v != null ? i : "" ) + "]",
					v,
					traditional,
					add
				);
			}
		} );

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {

		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {

		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, valueOrFunction ) {

			// If value is a function, invoke it and use its return value
			var value = jQuery.isFunction( valueOrFunction ) ?
				valueOrFunction() :
				valueOrFunction;

			s[ s.length ] = encodeURIComponent( key ) + "=" +
				encodeURIComponent( value == null ? "" : value );
		};

	// If an array was passed in, assume that it is an array of form elements.
	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {

		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		} );

	} else {

		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" );
};

jQuery.fn.extend( {
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map( function() {

			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		} )
		.filter( function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		} )
		.map( function( i, elem ) {
			var val = jQuery( this ).val();

			if ( val == null ) {
				return null;
			}

			if ( jQuery.isArray( val ) ) {
				return jQuery.map( val, function( val ) {
					return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
				} );
			}

			return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		} ).get();
	}
} );


var
	r20 = /%20/g,
	rhash = /#.*$/,
	rantiCache = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,

	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat( "*" ),

	// Anchor tag for parsing the document origin
	originAnchor = document.createElement( "a" );
	originAnchor.href = location.href;

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnothtmlwhite ) || [];

		if ( jQuery.isFunction( func ) ) {

			// For each dataType in the dataTypeExpression
			while ( ( dataType = dataTypes[ i++ ] ) ) {

				// Prepend if requested
				if ( dataType[ 0 ] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					( structure[ dataType ] = structure[ dataType ] || [] ).unshift( func );

				// Otherwise append
				} else {
					( structure[ dataType ] = structure[ dataType ] || [] ).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" &&
				!seekingTransport && !inspected[ dataTypeOrTransport ] ) {

				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		} );
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "Content-Type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {

		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[ 0 ] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}

		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},

		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

			// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {

								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s.throws ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return {
								state: "parsererror",
								error: conv ? e : "No conversion from " + prev + " to " + current
							};
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend( {

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: location.href,
		type: "GET",
		isLocal: rlocalProtocol.test( location.protocol ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",

		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /\bxml\b/,
			html: /\bhtml/,
			json: /\bjson\b/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": JSON.parse,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var transport,

			// URL without anti-cache param
			cacheURL,

			// Response headers
			responseHeadersString,
			responseHeaders,

			// timeout handle
			timeoutTimer,

			// Url cleanup var
			urlAnchor,

			// Request state (becomes false upon send and true upon completion)
			completed,

			// To know if global events are to be dispatched
			fireGlobals,

			// Loop variable
			i,

			// uncached part of the url
			uncached,

			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),

			// Callbacks context
			callbackContext = s.context || s,

			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context &&
				( callbackContext.nodeType || callbackContext.jquery ) ?
					jQuery( callbackContext ) :
					jQuery.event,

			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),

			// Status-dependent callbacks
			statusCode = s.statusCode || {},

			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},

			// Default abort message
			strAbort = "canceled",

			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( completed ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[ 1 ].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match == null ? null : match;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return completed ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( completed == null ) {
						name = requestHeadersNames[ name.toLowerCase() ] =
							requestHeadersNames[ name.toLowerCase() ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( completed == null ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( completed ) {

							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						} else {

							// Lazy-add the new callbacks in a way that preserves old ones
							for ( code in map ) {
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR );

		// Add protocol if not provided (prefilters might expect it)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || location.href ) + "" )
			.replace( rprotocol, location.protocol + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = ( s.dataType || "*" ).toLowerCase().match( rnothtmlwhite ) || [ "" ];

		// A cross-domain request is in order when the origin doesn't match the current origin.
		if ( s.crossDomain == null ) {
			urlAnchor = document.createElement( "a" );

			// Support: IE <=8 - 11, Edge 12 - 13
			// IE throws exception on accessing the href property if url is malformed,
			// e.g. http://example.com:80x/
			try {
				urlAnchor.href = s.url;

				// Support: IE <=8 - 11 only
				// Anchor's host property isn't correctly set when s.url is relative
				urlAnchor.href = urlAnchor.href;
				s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !==
					urlAnchor.protocol + "//" + urlAnchor.host;
			} catch ( e ) {

				// If there is an error parsing the URL, assume it is crossDomain,
				// it can be rejected by the transport if it is invalid
				s.crossDomain = true;
			}
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( completed ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
		fireGlobals = jQuery.event && s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		// Remove hash to simplify url manipulation
		cacheURL = s.url.replace( rhash, "" );

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// Remember the hash so we can put it back
			uncached = s.url.slice( cacheURL.length );

			// If data is available, append data to url
			if ( s.data ) {
				cacheURL += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data;

				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add or update anti-cache param if needed
			if ( s.cache === false ) {
				cacheURL = cacheURL.replace( rantiCache, "$1" );
				uncached = ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + ( nonce++ ) + uncached;
			}

			// Put hash and anti-cache on the URL that will be requested (gh-1732)
			s.url = cacheURL + uncached;

		// Change '%20' to '+' if this is encoded form body content (gh-2658)
		} else if ( s.data && s.processData &&
			( s.contentType || "" ).indexOf( "application/x-www-form-urlencoded" ) === 0 ) {
			s.data = s.data.replace( r20, "+" );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[ 0 ] ] ?
				s.accepts[ s.dataTypes[ 0 ] ] +
					( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend &&
			( s.beforeSend.call( callbackContext, jqXHR, s ) === false || completed ) ) {

			// Abort if not done already and return
			return jqXHR.abort();
		}

		// Aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		completeDeferred.add( s.complete );
		jqXHR.done( s.success );
		jqXHR.fail( s.error );

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}

			// If request was aborted inside ajaxSend, stop there
			if ( completed ) {
				return jqXHR;
			}

			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = window.setTimeout( function() {
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				completed = false;
				transport.send( requestHeaders, done );
			} catch ( e ) {

				// Rethrow post-completion exceptions
				if ( completed ) {
					throw e;
				}

				// Propagate others as results
				done( -1, e );
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Ignore repeat invocations
			if ( completed ) {
				return;
			}

			completed = true;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				window.clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader( "Last-Modified" );
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader( "etag" );
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {

				// Extract error from statusText and normalize for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );

				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
} );

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {

		// Shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		// The url can be an options object (which then must have .url)
		return jQuery.ajax( jQuery.extend( {
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		}, jQuery.isPlainObject( url ) && url ) );
	};
} );


jQuery._evalUrl = function( url ) {
	return jQuery.ajax( {
		url: url,

		// Make this explicit, since user can override this through ajaxSetup (#11264)
		type: "GET",
		dataType: "script",
		cache: true,
		async: false,
		global: false,
		"throws": true
	} );
};


jQuery.fn.extend( {
	wrapAll: function( html ) {
		var wrap;

		if ( this[ 0 ] ) {
			if ( jQuery.isFunction( html ) ) {
				html = html.call( this[ 0 ] );
			}

			// The elements to wrap the target around
			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

			if ( this[ 0 ].parentNode ) {
				wrap.insertBefore( this[ 0 ] );
			}

			wrap.map( function() {
				var elem = this;

				while ( elem.firstElementChild ) {
					elem = elem.firstElementChild;
				}

				return elem;
			} ).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each( function( i ) {
				jQuery( this ).wrapInner( html.call( this, i ) );
			} );
		}

		return this.each( function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		} );
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each( function( i ) {
			jQuery( this ).wrapAll( isFunction ? html.call( this, i ) : html );
		} );
	},

	unwrap: function( selector ) {
		this.parent( selector ).not( "body" ).each( function() {
			jQuery( this ).replaceWith( this.childNodes );
		} );
		return this;
	}
} );


jQuery.expr.pseudos.hidden = function( elem ) {
	return !jQuery.expr.pseudos.visible( elem );
};
jQuery.expr.pseudos.visible = function( elem ) {
	return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
};




jQuery.ajaxSettings.xhr = function() {
	try {
		return new window.XMLHttpRequest();
	} catch ( e ) {}
};

var xhrSuccessStatus = {

		// File protocol always yields status code 0, assume 200
		0: 200,

		// Support: IE <=9 only
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport( function( options ) {
	var callback, errorCallback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr();

				xhr.open(
					options.type,
					options.url,
					options.async,
					options.username,
					options.password
				);

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers[ "X-Requested-With" ] ) {
					headers[ "X-Requested-With" ] = "XMLHttpRequest";
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							callback = errorCallback = xhr.onload =
								xhr.onerror = xhr.onabort = xhr.onreadystatechange = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {

								// Support: IE <=9 only
								// On a manual native abort, IE9 throws
								// errors on any property access that is not readyState
								if ( typeof xhr.status !== "number" ) {
									complete( 0, "error" );
								} else {
									complete(

										// File: protocol always yields status 0; see #8605, #14207
										xhr.status,
										xhr.statusText
									);
								}
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,

									// Support: IE <=9 only
									// IE9 has no XHR2 but throws on binary (trac-11426)
									// For XHR2 non-text, let the caller handle it (gh-2498)
									( xhr.responseType || "text" ) !== "text"  ||
									typeof xhr.responseText !== "string" ?
										{ binary: xhr.response } :
										{ text: xhr.responseText },
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				errorCallback = xhr.onerror = callback( "error" );

				// Support: IE 9 only
				// Use onreadystatechange to replace onabort
				// to handle uncaught aborts
				if ( xhr.onabort !== undefined ) {
					xhr.onabort = errorCallback;
				} else {
					xhr.onreadystatechange = function() {

						// Check readyState before timeout as it changes
						if ( xhr.readyState === 4 ) {

							// Allow onerror to be called first,
							// but that will not handle a native abort
							// Also, save errorCallback to a variable
							// as xhr.onerror cannot be accessed
							window.setTimeout( function() {
								if ( callback ) {
									errorCallback();
								}
							} );
						}
					};
				}

				// Create the abort callback
				callback = callback( "abort" );

				try {

					// Do send the request (this may raise an exception)
					xhr.send( options.hasContent && options.data || null );
				} catch ( e ) {

					// #14683: Only rethrow if this hasn't been notified as an error yet
					if ( callback ) {
						throw e;
					}
				}
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




// Prevent auto-execution of scripts when no explicit dataType was provided (See gh-2432)
jQuery.ajaxPrefilter( function( s ) {
	if ( s.crossDomain ) {
		s.contents.script = false;
	}
} );

// Install script dataType
jQuery.ajaxSetup( {
	accepts: {
		script: "text/javascript, application/javascript, " +
			"application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /\b(?:java|ecma)script\b/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
} );

// Handle cache's special case and crossDomain
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
	}
} );

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function( s ) {

	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {
		var script, callback;
		return {
			send: function( _, complete ) {
				script = jQuery( "<script>" ).prop( {
					charset: s.scriptCharset,
					src: s.url
				} ).on(
					"load error",
					callback = function( evt ) {
						script.remove();
						callback = null;
						if ( evt ) {
							complete( evt.type === "error" ? 404 : 200, evt.type );
						}
					}
				);

				// Use native DOM manipulation to avoid our domManip AJAX trickery
				document.head.appendChild( script[ 0 ] );
			},
			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup( {
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
} );

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" &&
				( s.contentType || "" )
					.indexOf( "application/x-www-form-urlencoded" ) === 0 &&
				rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters[ "script json" ] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// Force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always( function() {

			// If previous value didn't exist - remove it
			if ( overwritten === undefined ) {
				jQuery( window ).removeProp( callbackName );

			// Otherwise restore preexisting value
			} else {
				window[ callbackName ] = overwritten;
			}

			// Save back as free
			if ( s[ callbackName ] ) {

				// Make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// Save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		} );

		// Delegate to script
		return "script";
	}
} );




// Support: Safari 8 only
// In Safari 8 documents created via document.implementation.createHTMLDocument
// collapse sibling forms: the second one becomes a child of the first one.
// Because of that, this security measure has to be disabled in Safari 8.
// https://bugs.webkit.org/show_bug.cgi?id=137337
support.createHTMLDocument = ( function() {
	var body = document.implementation.createHTMLDocument( "" ).body;
	body.innerHTML = "<form></form><form></form>";
	return body.childNodes.length === 2;
} )();


// Argument "data" should be string of html
// context (optional): If specified, the fragment will be created in this context,
// defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( typeof data !== "string" ) {
		return [];
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}

	var base, parsed, scripts;

	if ( !context ) {

		// Stop scripts or inline event handlers from being executed immediately
		// by using document.implementation
		if ( support.createHTMLDocument ) {
			context = document.implementation.createHTMLDocument( "" );

			// Set the base href for the created document
			// so any parsed elements with URLs
			// are based on the document's URL (gh-2965)
			base = context.createElement( "base" );
			base.href = document.location.href;
			context.head.appendChild( base );
		} else {
			context = document;
		}
	}

	parsed = rsingleTag.exec( data );
	scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[ 1 ] ) ];
	}

	parsed = buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	var selector, type, response,
		self = this,
		off = url.indexOf( " " );

	if ( off > -1 ) {
		selector = stripAndCollapse( url.slice( off ) );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( jQuery.isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax( {
			url: url,

			// If "type" variable is undefined, then "GET" method will be used.
			// Make value of this field explicit since
			// user can override it through ajaxSetup method
			type: type || "GET",
			dataType: "html",
			data: params
		} ).done( function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery( "<div>" ).append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		// If the request succeeds, this function gets "data", "status", "jqXHR"
		// but they are ignored because response was set above.
		// If it fails, this function gets "jqXHR", "status", "error"
		} ).always( callback && function( jqXHR, status ) {
			self.each( function() {
				callback.apply( this, response || [ jqXHR.responseText, status, jqXHR ] );
			} );
		} );
	}

	return this;
};




// Attach a bunch of functions for handling common AJAX events
jQuery.each( [
	"ajaxStart",
	"ajaxStop",
	"ajaxComplete",
	"ajaxError",
	"ajaxSuccess",
	"ajaxSend"
], function( i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
} );




jQuery.expr.pseudos.animated = function( elem ) {
	return jQuery.grep( jQuery.timers, function( fn ) {
		return elem === fn.elem;
	} ).length;
};




/**
 * Gets a window from an element
 */
function getWindow( elem ) {
	return jQuery.isWindow( elem ) ? elem : elem.nodeType === 9 && elem.defaultView;
}

jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// Set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			( curCSSTop + curCSSLeft ).indexOf( "auto" ) > -1;

		// Need to be able to calculate position if either
		// top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;

		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {

			// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
			options = options.call( elem, i, jQuery.extend( {}, curOffset ) );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );

		} else {
			curElem.css( props );
		}
	}
};

jQuery.fn.extend( {
	offset: function( options ) {

		// Preserve chaining for setter
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each( function( i ) {
					jQuery.offset.setOffset( this, options, i );
				} );
		}

		var docElem, win, rect, doc,
			elem = this[ 0 ];

		if ( !elem ) {
			return;
		}

		// Support: IE <=11 only
		// Running getBoundingClientRect on a
		// disconnected node in IE throws an error
		if ( !elem.getClientRects().length ) {
			return { top: 0, left: 0 };
		}

		rect = elem.getBoundingClientRect();

		// Make sure element is not hidden (display: none)
		if ( rect.width || rect.height ) {
			doc = elem.ownerDocument;
			win = getWindow( doc );
			docElem = doc.documentElement;

			return {
				top: rect.top + win.pageYOffset - docElem.clientTop,
				left: rect.left + win.pageXOffset - docElem.clientLeft
			};
		}

		// Return zeros for disconnected and hidden elements (gh-2310)
		return rect;
	},

	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset,
			elem = this[ 0 ],
			parentOffset = { top: 0, left: 0 };

		// Fixed elements are offset from window (parentOffset = {top:0, left: 0},
		// because it is its only offset parent
		if ( jQuery.css( elem, "position" ) === "fixed" ) {

			// Assume getBoundingClientRect is there when computed position is fixed
			offset = elem.getBoundingClientRect();

		} else {

			// Get *real* offsetParent
			offsetParent = this.offsetParent();

			// Get correct offsets
			offset = this.offset();
			if ( !jQuery.nodeName( offsetParent[ 0 ], "html" ) ) {
				parentOffset = offsetParent.offset();
			}

			// Add offsetParent borders
			parentOffset = {
				top: parentOffset.top + jQuery.css( offsetParent[ 0 ], "borderTopWidth", true ),
				left: parentOffset.left + jQuery.css( offsetParent[ 0 ], "borderLeftWidth", true )
			};
		}

		// Subtract parent offsets and element margins
		return {
			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
		};
	},

	// This method will return documentElement in the following cases:
	// 1) For the element inside the iframe without offsetParent, this method will return
	//    documentElement of the parent window
	// 2) For the hidden or detached element
	// 3) For body or html element, i.e. in case of the html node - it will return itself
	//
	// but those exceptions were never presented as a real life use-cases
	// and might be considered as more preferable results.
	//
	// This logic, however, is not guaranteed and can change at any point in the future
	offsetParent: function() {
		return this.map( function() {
			var offsetParent = this.offsetParent;

			while ( offsetParent && jQuery.css( offsetParent, "position" ) === "static" ) {
				offsetParent = offsetParent.offsetParent;
			}

			return offsetParent || documentElement;
		} );
	}
} );

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = "pageYOffset" === prop;

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {
			var win = getWindow( elem );

			if ( val === undefined ) {
				return win ? win[ prop ] : elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : win.pageXOffset,
					top ? val : win.pageYOffset
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length );
	};
} );

// Support: Safari <=7 - 9.1, Chrome <=37 - 49
// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// Blink bug: https://bugs.chromium.org/p/chromium/issues/detail?id=589347
// getComputedStyle returns percent when specified for top/left/bottom/right;
// rather than make the css module depend on the offset module, just check for it here
jQuery.each( [ "top", "left" ], function( i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );

				// If curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
} );


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name },
		function( defaultExtra, funcName ) {

		// Margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( jQuery.isWindow( elem ) ) {

					// $( window ).outerWidth/Height return w/h including scrollbars (gh-1729)
					return funcName.indexOf( "outer" ) === 0 ?
						elem[ "inner" + name ] :
						elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
					// whichever is greatest
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?

					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable );
		};
	} );
} );


jQuery.fn.extend( {

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {

		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ?
			this.off( selector, "**" ) :
			this.off( types, selector || "**", fn );
	}
} );

jQuery.parseJSON = JSON.parse;




// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.

// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	} );
}




var

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in AMD
// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( !noGlobal ) {
	window.jQuery = window.$ = jQuery;
}





return jQuery;
} );

},{}],25:[function(require,module,exports){
/**
 * Sinon core utilities. For internal use only.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
var sinon = (function () { // eslint-disable-line no-unused-vars
    "use strict";

    var sinonModule;
    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports, module) {
        sinonModule = module.exports = require("./sinon/util/core");
        require("./sinon/extend");
        require("./sinon/walk");
        require("./sinon/typeOf");
        require("./sinon/times_in_words");
        require("./sinon/spy");
        require("./sinon/call");
        require("./sinon/behavior");
        require("./sinon/stub");
        require("./sinon/mock");
        require("./sinon/collection");
        require("./sinon/assert");
        require("./sinon/sandbox");
        require("./sinon/test");
        require("./sinon/test_case");
        require("./sinon/match");
        require("./sinon/format");
        require("./sinon/log_error");
    }

    if (isAMD) {
        define(loadDependencies);
    } else if (isNode) {
        loadDependencies(require, module.exports, module);
        sinonModule = module.exports;
    } else {
        sinonModule = {};
    }

    return sinonModule;
}());

},{"./sinon/assert":26,"./sinon/behavior":27,"./sinon/call":28,"./sinon/collection":29,"./sinon/extend":30,"./sinon/format":31,"./sinon/log_error":32,"./sinon/match":33,"./sinon/mock":34,"./sinon/sandbox":35,"./sinon/spy":36,"./sinon/stub":37,"./sinon/test":38,"./sinon/test_case":39,"./sinon/times_in_words":40,"./sinon/typeOf":41,"./sinon/util/core":42,"./sinon/walk":49}],26:[function(require,module,exports){
(function (global){
/**
 * @depend times_in_words.js
 * @depend util/core.js
 * @depend match.js
 * @depend format.js
 */
/**
 * Assertions matching the test spy retrieval interface.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
(function (sinonGlobal, global) {
    "use strict";

    var slice = Array.prototype.slice;

    function makeApi(sinon) {
        var assert;

        function verifyIsStub() {
            var method;

            for (var i = 0, l = arguments.length; i < l; ++i) {
                method = arguments[i];

                if (!method) {
                    assert.fail("fake is not a spy");
                }

                if (method.proxy && method.proxy.isSinonProxy) {
                    verifyIsStub(method.proxy);
                } else {
                    if (typeof method !== "function") {
                        assert.fail(method + " is not a function");
                    }

                    if (typeof method.getCall !== "function") {
                        assert.fail(method + " is not stubbed");
                    }
                }

            }
        }

        function verifyIsValidAssertion(assertionMethod, assertionArgs) {
            switch (assertionMethod) {
                case "notCalled":
                case "called":
                case "calledOnce":
                case "calledTwice":
                case "calledThrice":
                    if (assertionArgs.length !== 0) {
                        assert.fail(assertionMethod +
                                    " takes 1 argument but was called with " +
                                    (assertionArgs.length + 1) + " arguments");
                    }
                    break;
                default:
                    break;
            }
        }

        function failAssertion(object, msg) {
            object = object || global;
            var failMethod = object.fail || assert.fail;
            failMethod.call(object, msg);
        }

        function mirrorPropAsAssertion(name, method, message) {
            if (arguments.length === 2) {
                message = method;
                method = name;
            }

            assert[name] = function (fake) {
                verifyIsStub(fake);

                var args = slice.call(arguments, 1);
                verifyIsValidAssertion(name, args);

                var failed = false;

                if (typeof method === "function") {
                    failed = !method(fake);
                } else {
                    failed = typeof fake[method] === "function" ?
                        !fake[method].apply(fake, args) : !fake[method];
                }

                if (failed) {
                    failAssertion(this, (fake.printf || fake.proxy.printf).apply(fake, [message].concat(args)));
                } else {
                    assert.pass(name);
                }
            };
        }

        function exposedName(prefix, prop) {
            return !prefix || /^fail/.test(prop) ? prop :
                prefix + prop.slice(0, 1).toUpperCase() + prop.slice(1);
        }

        assert = {
            failException: "AssertError",

            fail: function fail(message) {
                var error = new Error(message);
                error.name = this.failException || assert.failException;

                throw error;
            },

            pass: function pass() {},

            callOrder: function assertCallOrder() {
                verifyIsStub.apply(null, arguments);
                var expected = "";
                var actual = "";

                if (!sinon.calledInOrder(arguments)) {
                    try {
                        expected = [].join.call(arguments, ", ");
                        var calls = slice.call(arguments);
                        var i = calls.length;
                        while (i) {
                            if (!calls[--i].called) {
                                calls.splice(i, 1);
                            }
                        }
                        actual = sinon.orderByFirstCall(calls).join(", ");
                    } catch (e) {
                        // If this fails, we'll just fall back to the blank string
                    }

                    failAssertion(this, "expected " + expected + " to be " +
                                "called in order but were called as " + actual);
                } else {
                    assert.pass("callOrder");
                }
            },

            callCount: function assertCallCount(method, count) {
                verifyIsStub(method);

                if (method.callCount !== count) {
                    var msg = "expected %n to be called " + sinon.timesInWords(count) +
                        " but was called %c%C";
                    failAssertion(this, method.printf(msg));
                } else {
                    assert.pass("callCount");
                }
            },

            expose: function expose(target, options) {
                if (!target) {
                    throw new TypeError("target is null or undefined");
                }

                var o = options || {};
                var prefix = typeof o.prefix === "undefined" && "assert" || o.prefix;
                var includeFail = typeof o.includeFail === "undefined" || !!o.includeFail;

                for (var method in this) {
                    if (method !== "expose" && (includeFail || !/^(fail)/.test(method))) {
                        target[exposedName(prefix, method)] = this[method];
                    }
                }

                return target;
            },

            match: function match(actual, expectation) {
                var matcher = sinon.match(expectation);
                if (matcher.test(actual)) {
                    assert.pass("match");
                } else {
                    var formatted = [
                        "expected value to match",
                        "    expected = " + sinon.format(expectation),
                        "    actual = " + sinon.format(actual)
                    ];

                    failAssertion(this, formatted.join("\n"));
                }
            }
        };

        mirrorPropAsAssertion("called", "expected %n to have been called at least once but was never called");
        mirrorPropAsAssertion("notCalled", function (spy) {
            return !spy.called;
        }, "expected %n to not have been called but was called %c%C");
        mirrorPropAsAssertion("calledOnce", "expected %n to be called once but was called %c%C");
        mirrorPropAsAssertion("calledTwice", "expected %n to be called twice but was called %c%C");
        mirrorPropAsAssertion("calledThrice", "expected %n to be called thrice but was called %c%C");
        mirrorPropAsAssertion("calledOn", "expected %n to be called with %1 as this but was called with %t");
        mirrorPropAsAssertion(
            "alwaysCalledOn",
            "expected %n to always be called with %1 as this but was called with %t"
        );
        mirrorPropAsAssertion("calledWithNew", "expected %n to be called with new");
        mirrorPropAsAssertion("alwaysCalledWithNew", "expected %n to always be called with new");
        mirrorPropAsAssertion("calledWith", "expected %n to be called with arguments %*%C");
        mirrorPropAsAssertion("calledWithMatch", "expected %n to be called with match %*%C");
        mirrorPropAsAssertion("alwaysCalledWith", "expected %n to always be called with arguments %*%C");
        mirrorPropAsAssertion("alwaysCalledWithMatch", "expected %n to always be called with match %*%C");
        mirrorPropAsAssertion("calledWithExactly", "expected %n to be called with exact arguments %*%C");
        mirrorPropAsAssertion("alwaysCalledWithExactly", "expected %n to always be called with exact arguments %*%C");
        mirrorPropAsAssertion("neverCalledWith", "expected %n to never be called with arguments %*%C");
        mirrorPropAsAssertion("neverCalledWithMatch", "expected %n to never be called with match %*%C");
        mirrorPropAsAssertion("threw", "%n did not throw exception%C");
        mirrorPropAsAssertion("alwaysThrew", "%n did not always throw exception%C");

        sinon.assert = assert;
        return assert;
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports, module) {
        var sinon = require("./util/core");
        require("./match");
        require("./format");
        module.exports = makeApi(sinon);
    }

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon, // eslint-disable-line no-undef
    typeof global !== "undefined" ? global : self
));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./format":31,"./match":33,"./util/core":42}],27:[function(require,module,exports){
(function (process){
/**
 * @depend util/core.js
 * @depend extend.js
 */
/**
 * Stub behavior
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @author Tim Fischbach (mail@timfischbach.de)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
(function (sinonGlobal) {
    "use strict";

    var slice = Array.prototype.slice;
    var join = Array.prototype.join;
    var useLeftMostCallback = -1;
    var useRightMostCallback = -2;

    var nextTick = (function () {
        if (typeof process === "object" && typeof process.nextTick === "function") {
            return process.nextTick;
        }

        if (typeof setImmediate === "function") {
            return setImmediate;
        }

        return function (callback) {
            setTimeout(callback, 0);
        };
    })();

    function throwsException(error, message) {
        if (typeof error === "string") {
            this.exception = new Error(message || "");
            this.exception.name = error;
        } else if (!error) {
            this.exception = new Error("Error");
        } else {
            this.exception = error;
        }

        return this;
    }

    function getCallback(behavior, args) {
        var callArgAt = behavior.callArgAt;

        if (callArgAt >= 0) {
            return args[callArgAt];
        }

        var argumentList;

        if (callArgAt === useLeftMostCallback) {
            argumentList = args;
        }

        if (callArgAt === useRightMostCallback) {
            argumentList = slice.call(args).reverse();
        }

        var callArgProp = behavior.callArgProp;

        for (var i = 0, l = argumentList.length; i < l; ++i) {
            if (!callArgProp && typeof argumentList[i] === "function") {
                return argumentList[i];
            }

            if (callArgProp && argumentList[i] &&
                typeof argumentList[i][callArgProp] === "function") {
                return argumentList[i][callArgProp];
            }
        }

        return null;
    }

    function makeApi(sinon) {
        function getCallbackError(behavior, func, args) {
            if (behavior.callArgAt < 0) {
                var msg;

                if (behavior.callArgProp) {
                    msg = sinon.functionName(behavior.stub) +
                        " expected to yield to '" + behavior.callArgProp +
                        "', but no object with such a property was passed.";
                } else {
                    msg = sinon.functionName(behavior.stub) +
                        " expected to yield, but no callback was passed.";
                }

                if (args.length > 0) {
                    msg += " Received [" + join.call(args, ", ") + "]";
                }

                return msg;
            }

            return "argument at index " + behavior.callArgAt + " is not a function: " + func;
        }

        function callCallback(behavior, args) {
            if (typeof behavior.callArgAt === "number") {
                var func = getCallback(behavior, args);

                if (typeof func !== "function") {
                    throw new TypeError(getCallbackError(behavior, func, args));
                }

                if (behavior.callbackAsync) {
                    nextTick(function () {
                        func.apply(behavior.callbackContext, behavior.callbackArguments);
                    });
                } else {
                    func.apply(behavior.callbackContext, behavior.callbackArguments);
                }
            }
        }

        var proto = {
            create: function create(stub) {
                var behavior = sinon.extend({}, sinon.behavior);
                delete behavior.create;
                behavior.stub = stub;

                return behavior;
            },

            isPresent: function isPresent() {
                return (typeof this.callArgAt === "number" ||
                        this.exception ||
                        typeof this.returnArgAt === "number" ||
                        this.returnThis ||
                        this.returnValueDefined);
            },

            invoke: function invoke(context, args) {
                callCallback(this, args);

                if (this.exception) {
                    throw this.exception;
                } else if (typeof this.returnArgAt === "number") {
                    return args[this.returnArgAt];
                } else if (this.returnThis) {
                    return context;
                }

                return this.returnValue;
            },

            onCall: function onCall(index) {
                return this.stub.onCall(index);
            },

            onFirstCall: function onFirstCall() {
                return this.stub.onFirstCall();
            },

            onSecondCall: function onSecondCall() {
                return this.stub.onSecondCall();
            },

            onThirdCall: function onThirdCall() {
                return this.stub.onThirdCall();
            },

            withArgs: function withArgs(/* arguments */) {
                throw new Error(
                    "Defining a stub by invoking \"stub.onCall(...).withArgs(...)\" " +
                    "is not supported. Use \"stub.withArgs(...).onCall(...)\" " +
                    "to define sequential behavior for calls with certain arguments."
                );
            },

            callsArg: function callsArg(pos) {
                if (typeof pos !== "number") {
                    throw new TypeError("argument index is not number");
                }

                this.callArgAt = pos;
                this.callbackArguments = [];
                this.callbackContext = undefined;
                this.callArgProp = undefined;
                this.callbackAsync = false;

                return this;
            },

            callsArgOn: function callsArgOn(pos, context) {
                if (typeof pos !== "number") {
                    throw new TypeError("argument index is not number");
                }
                if (typeof context !== "object") {
                    throw new TypeError("argument context is not an object");
                }

                this.callArgAt = pos;
                this.callbackArguments = [];
                this.callbackContext = context;
                this.callArgProp = undefined;
                this.callbackAsync = false;

                return this;
            },

            callsArgWith: function callsArgWith(pos) {
                if (typeof pos !== "number") {
                    throw new TypeError("argument index is not number");
                }

                this.callArgAt = pos;
                this.callbackArguments = slice.call(arguments, 1);
                this.callbackContext = undefined;
                this.callArgProp = undefined;
                this.callbackAsync = false;

                return this;
            },

            callsArgOnWith: function callsArgWith(pos, context) {
                if (typeof pos !== "number") {
                    throw new TypeError("argument index is not number");
                }
                if (typeof context !== "object") {
                    throw new TypeError("argument context is not an object");
                }

                this.callArgAt = pos;
                this.callbackArguments = slice.call(arguments, 2);
                this.callbackContext = context;
                this.callArgProp = undefined;
                this.callbackAsync = false;

                return this;
            },

            yields: function () {
                this.callArgAt = useLeftMostCallback;
                this.callbackArguments = slice.call(arguments, 0);
                this.callbackContext = undefined;
                this.callArgProp = undefined;
                this.callbackAsync = false;

                return this;
            },

            yieldsRight: function () {
                this.callArgAt = useRightMostCallback;
                this.callbackArguments = slice.call(arguments, 0);
                this.callbackContext = undefined;
                this.callArgProp = undefined;
                this.callbackAsync = false;

                return this;
            },

            yieldsOn: function (context) {
                if (typeof context !== "object") {
                    throw new TypeError("argument context is not an object");
                }

                this.callArgAt = useLeftMostCallback;
                this.callbackArguments = slice.call(arguments, 1);
                this.callbackContext = context;
                this.callArgProp = undefined;
                this.callbackAsync = false;

                return this;
            },

            yieldsTo: function (prop) {
                this.callArgAt = useLeftMostCallback;
                this.callbackArguments = slice.call(arguments, 1);
                this.callbackContext = undefined;
                this.callArgProp = prop;
                this.callbackAsync = false;

                return this;
            },

            yieldsToOn: function (prop, context) {
                if (typeof context !== "object") {
                    throw new TypeError("argument context is not an object");
                }

                this.callArgAt = useLeftMostCallback;
                this.callbackArguments = slice.call(arguments, 2);
                this.callbackContext = context;
                this.callArgProp = prop;
                this.callbackAsync = false;

                return this;
            },

            throws: throwsException,
            throwsException: throwsException,

            returns: function returns(value) {
                this.returnValue = value;
                this.returnValueDefined = true;
                this.exception = undefined;

                return this;
            },

            returnsArg: function returnsArg(pos) {
                if (typeof pos !== "number") {
                    throw new TypeError("argument index is not number");
                }

                this.returnArgAt = pos;

                return this;
            },

            returnsThis: function returnsThis() {
                this.returnThis = true;

                return this;
            }
        };

        function createAsyncVersion(syncFnName) {
            return function () {
                var result = this[syncFnName].apply(this, arguments);
                this.callbackAsync = true;
                return result;
            };
        }

        // create asynchronous versions of callsArg* and yields* methods
        for (var method in proto) {
            // need to avoid creating anotherasync versions of the newly added async methods
            if (proto.hasOwnProperty(method) && method.match(/^(callsArg|yields)/) && !method.match(/Async/)) {
                proto[method + "Async"] = createAsyncVersion(method);
            }
        }

        sinon.behavior = proto;
        return proto;
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports, module) {
        var sinon = require("./util/core");
        require("./extend");
        module.exports = makeApi(sinon);
    }

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon // eslint-disable-line no-undef
));

}).call(this,require('_process'))
},{"./extend":30,"./util/core":42,"_process":14}],28:[function(require,module,exports){
/**
  * @depend util/core.js
  * @depend match.js
  * @depend format.js
  */
/**
  * Spy calls
  *
  * @author Christian Johansen (christian@cjohansen.no)
  * @author Maximilian Antoni (mail@maxantoni.de)
  * @license BSD
  *
  * Copyright (c) 2010-2013 Christian Johansen
  * Copyright (c) 2013 Maximilian Antoni
  */
(function (sinonGlobal) {
    "use strict";

    var slice = Array.prototype.slice;

    function makeApi(sinon) {
        function throwYieldError(proxy, text, args) {
            var msg = sinon.functionName(proxy) + text;
            if (args.length) {
                msg += " Received [" + slice.call(args).join(", ") + "]";
            }
            throw new Error(msg);
        }

        var callProto = {
            calledOn: function calledOn(thisValue) {
                if (sinon.match && sinon.match.isMatcher(thisValue)) {
                    return thisValue.test(this.thisValue);
                }
                return this.thisValue === thisValue;
            },

            calledWith: function calledWith() {
                var l = arguments.length;
                if (l > this.args.length) {
                    return false;
                }
                for (var i = 0; i < l; i += 1) {
                    if (!sinon.deepEqual(arguments[i], this.args[i])) {
                        return false;
                    }
                }

                return true;
            },

            calledWithMatch: function calledWithMatch() {
                var l = arguments.length;
                if (l > this.args.length) {
                    return false;
                }
                for (var i = 0; i < l; i += 1) {
                    var actual = this.args[i];
                    var expectation = arguments[i];
                    if (!sinon.match || !sinon.match(expectation).test(actual)) {
                        return false;
                    }
                }
                return true;
            },

            calledWithExactly: function calledWithExactly() {
                return arguments.length === this.args.length &&
                    this.calledWith.apply(this, arguments);
            },

            notCalledWith: function notCalledWith() {
                return !this.calledWith.apply(this, arguments);
            },

            notCalledWithMatch: function notCalledWithMatch() {
                return !this.calledWithMatch.apply(this, arguments);
            },

            returned: function returned(value) {
                return sinon.deepEqual(value, this.returnValue);
            },

            threw: function threw(error) {
                if (typeof error === "undefined" || !this.exception) {
                    return !!this.exception;
                }

                return this.exception === error || this.exception.name === error;
            },

            calledWithNew: function calledWithNew() {
                return this.proxy.prototype && this.thisValue instanceof this.proxy;
            },

            calledBefore: function (other) {
                return this.callId < other.callId;
            },

            calledAfter: function (other) {
                return this.callId > other.callId;
            },

            callArg: function (pos) {
                this.args[pos]();
            },

            callArgOn: function (pos, thisValue) {
                this.args[pos].apply(thisValue);
            },

            callArgWith: function (pos) {
                this.callArgOnWith.apply(this, [pos, null].concat(slice.call(arguments, 1)));
            },

            callArgOnWith: function (pos, thisValue) {
                var args = slice.call(arguments, 2);
                this.args[pos].apply(thisValue, args);
            },

            "yield": function () {
                this.yieldOn.apply(this, [null].concat(slice.call(arguments, 0)));
            },

            yieldOn: function (thisValue) {
                var args = this.args;
                for (var i = 0, l = args.length; i < l; ++i) {
                    if (typeof args[i] === "function") {
                        args[i].apply(thisValue, slice.call(arguments, 1));
                        return;
                    }
                }
                throwYieldError(this.proxy, " cannot yield since no callback was passed.", args);
            },

            yieldTo: function (prop) {
                this.yieldToOn.apply(this, [prop, null].concat(slice.call(arguments, 1)));
            },

            yieldToOn: function (prop, thisValue) {
                var args = this.args;
                for (var i = 0, l = args.length; i < l; ++i) {
                    if (args[i] && typeof args[i][prop] === "function") {
                        args[i][prop].apply(thisValue, slice.call(arguments, 2));
                        return;
                    }
                }
                throwYieldError(this.proxy, " cannot yield to '" + prop +
                    "' since no callback was passed.", args);
            },

            getStackFrames: function () {
                // Omit the error message and the two top stack frames in sinon itself:
                return this.stack && this.stack.split("\n").slice(3);
            },

            toString: function () {
                var callStr = this.proxy ? this.proxy.toString() + "(" : "";
                var args = [];

                if (!this.args) {
                    return ":(";
                }

                for (var i = 0, l = this.args.length; i < l; ++i) {
                    args.push(sinon.format(this.args[i]));
                }

                callStr = callStr + args.join(", ") + ")";

                if (typeof this.returnValue !== "undefined") {
                    callStr += " => " + sinon.format(this.returnValue);
                }

                if (this.exception) {
                    callStr += " !" + this.exception.name;

                    if (this.exception.message) {
                        callStr += "(" + this.exception.message + ")";
                    }
                }
                if (this.stack) {
                    callStr += this.getStackFrames()[0].replace(/^\s*(?:at\s+|@)?/, " at ");

                }

                return callStr;
            }
        };

        callProto.invokeCallback = callProto.yield;

        function createSpyCall(spy, thisValue, args, returnValue, exception, id, stack) {
            if (typeof id !== "number") {
                throw new TypeError("Call id is not a number");
            }
            var proxyCall = sinon.create(callProto);
            proxyCall.proxy = spy;
            proxyCall.thisValue = thisValue;
            proxyCall.args = args;
            proxyCall.returnValue = returnValue;
            proxyCall.exception = exception;
            proxyCall.callId = id;
            proxyCall.stack = stack;

            return proxyCall;
        }
        createSpyCall.toString = callProto.toString; // used by mocks

        sinon.spyCall = createSpyCall;
        return createSpyCall;
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports, module) {
        var sinon = require("./util/core");
        require("./match");
        require("./format");
        module.exports = makeApi(sinon);
    }

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon // eslint-disable-line no-undef
));

},{"./format":31,"./match":33,"./util/core":42}],29:[function(require,module,exports){
/**
 * @depend util/core.js
 * @depend spy.js
 * @depend stub.js
 * @depend mock.js
 */
/**
 * Collections of stubs, spies and mocks.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
(function (sinonGlobal) {
    "use strict";

    var push = [].push;
    var hasOwnProperty = Object.prototype.hasOwnProperty;

    function getFakes(fakeCollection) {
        if (!fakeCollection.fakes) {
            fakeCollection.fakes = [];
        }

        return fakeCollection.fakes;
    }

    function each(fakeCollection, method) {
        var fakes = getFakes(fakeCollection);

        for (var i = 0, l = fakes.length; i < l; i += 1) {
            if (typeof fakes[i][method] === "function") {
                fakes[i][method]();
            }
        }
    }

    function compact(fakeCollection) {
        var fakes = getFakes(fakeCollection);
        var i = 0;
        while (i < fakes.length) {
            fakes.splice(i, 1);
        }
    }

    function makeApi(sinon) {
        var collection = {
            verify: function resolve() {
                each(this, "verify");
            },

            restore: function restore() {
                each(this, "restore");
                compact(this);
            },

            reset: function restore() {
                each(this, "reset");
            },

            verifyAndRestore: function verifyAndRestore() {
                var exception;

                try {
                    this.verify();
                } catch (e) {
                    exception = e;
                }

                this.restore();

                if (exception) {
                    throw exception;
                }
            },

            add: function add(fake) {
                push.call(getFakes(this), fake);
                return fake;
            },

            spy: function spy() {
                return this.add(sinon.spy.apply(sinon, arguments));
            },

            stub: function stub(object, property, value) {
                if (property) {
                    var original = object[property];

                    if (typeof original !== "function") {
                        if (!hasOwnProperty.call(object, property)) {
                            throw new TypeError("Cannot stub non-existent own property " + property);
                        }

                        object[property] = value;

                        return this.add({
                            restore: function () {
                                object[property] = original;
                            }
                        });
                    }
                }
                if (!property && !!object && typeof object === "object") {
                    var stubbedObj = sinon.stub.apply(sinon, arguments);

                    for (var prop in stubbedObj) {
                        if (typeof stubbedObj[prop] === "function") {
                            this.add(stubbedObj[prop]);
                        }
                    }

                    return stubbedObj;
                }

                return this.add(sinon.stub.apply(sinon, arguments));
            },

            mock: function mock() {
                return this.add(sinon.mock.apply(sinon, arguments));
            },

            inject: function inject(obj) {
                var col = this;

                obj.spy = function () {
                    return col.spy.apply(col, arguments);
                };

                obj.stub = function () {
                    return col.stub.apply(col, arguments);
                };

                obj.mock = function () {
                    return col.mock.apply(col, arguments);
                };

                return obj;
            }
        };

        sinon.collection = collection;
        return collection;
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports, module) {
        var sinon = require("./util/core");
        require("./mock");
        require("./spy");
        require("./stub");
        module.exports = makeApi(sinon);
    }

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon // eslint-disable-line no-undef
));

},{"./mock":34,"./spy":36,"./stub":37,"./util/core":42}],30:[function(require,module,exports){
/**
 * @depend util/core.js
 */
(function (sinonGlobal) {
    "use strict";

    function makeApi(sinon) {

        // Adapted from https://developer.mozilla.org/en/docs/ECMAScript_DontEnum_attribute#JScript_DontEnum_Bug
        var hasDontEnumBug = (function () {
            var obj = {
                constructor: function () {
                    return "0";
                },
                toString: function () {
                    return "1";
                },
                valueOf: function () {
                    return "2";
                },
                toLocaleString: function () {
                    return "3";
                },
                prototype: function () {
                    return "4";
                },
                isPrototypeOf: function () {
                    return "5";
                },
                propertyIsEnumerable: function () {
                    return "6";
                },
                hasOwnProperty: function () {
                    return "7";
                },
                length: function () {
                    return "8";
                },
                unique: function () {
                    return "9";
                }
            };

            var result = [];
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    result.push(obj[prop]());
                }
            }
            return result.join("") !== "0123456789";
        })();

        /* Public: Extend target in place with all (own) properties from sources in-order. Thus, last source will
         *         override properties in previous sources.
         *
         * target - The Object to extend
         * sources - Objects to copy properties from.
         *
         * Returns the extended target
         */
        function extend(target /*, sources */) {
            var sources = Array.prototype.slice.call(arguments, 1);
            var source, i, prop;

            for (i = 0; i < sources.length; i++) {
                source = sources[i];

                for (prop in source) {
                    if (source.hasOwnProperty(prop)) {
                        target[prop] = source[prop];
                    }
                }

                // Make sure we copy (own) toString method even when in JScript with DontEnum bug
                // See https://developer.mozilla.org/en/docs/ECMAScript_DontEnum_attribute#JScript_DontEnum_Bug
                if (hasDontEnumBug && source.hasOwnProperty("toString") && source.toString !== target.toString) {
                    target.toString = source.toString;
                }
            }

            return target;
        }

        sinon.extend = extend;
        return sinon.extend;
    }

    function loadDependencies(require, exports, module) {
        var sinon = require("./util/core");
        module.exports = makeApi(sinon);
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon // eslint-disable-line no-undef
));

},{"./util/core":42}],31:[function(require,module,exports){
/**
 * @depend util/core.js
 */
/**
 * Format functions
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2014 Christian Johansen
 */
(function (sinonGlobal, formatio) {
    "use strict";

    function makeApi(sinon) {
        function valueFormatter(value) {
            return "" + value;
        }

        function getFormatioFormatter() {
            var formatter = formatio.configure({
                    quoteStrings: false,
                    limitChildrenCount: 250
                });

            function format() {
                return formatter.ascii.apply(formatter, arguments);
            }

            return format;
        }

        function getNodeFormatter() {
            try {
                var util = require("util");
            } catch (e) {
                /* Node, but no util module - would be very old, but better safe than sorry */
            }

            function format(v) {
                var isObjectWithNativeToString = typeof v === "object" && v.toString === Object.prototype.toString;
                return isObjectWithNativeToString ? util.inspect(v) : v;
            }

            return util ? format : valueFormatter;
        }

        var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
        var formatter;

        if (isNode) {
            try {
                formatio = require("formatio");
            }
            catch (e) {} // eslint-disable-line no-empty
        }

        if (formatio) {
            formatter = getFormatioFormatter();
        } else if (isNode) {
            formatter = getNodeFormatter();
        } else {
            formatter = valueFormatter;
        }

        sinon.format = formatter;
        return sinon.format;
    }

    function loadDependencies(require, exports, module) {
        var sinon = require("./util/core");
        module.exports = makeApi(sinon);
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon, // eslint-disable-line no-undef
    typeof formatio === "object" && formatio // eslint-disable-line no-undef
));

},{"./util/core":42,"formatio":50,"util":17}],32:[function(require,module,exports){
/**
 * @depend util/core.js
 */
/**
 * Logs errors
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2014 Christian Johansen
 */
(function (sinonGlobal) {
    "use strict";

    // cache a reference to setTimeout, so that our reference won't be stubbed out
    // when using fake timers and errors will still get logged
    // https://github.com/cjohansen/Sinon.JS/issues/381
    var realSetTimeout = setTimeout;

    function makeApi(sinon) {

        function log() {}

        function logError(label, err) {
            var msg = label + " threw exception: ";

            function throwLoggedError() {
                err.message = msg + err.message;
                throw err;
            }

            sinon.log(msg + "[" + err.name + "] " + err.message);

            if (err.stack) {
                sinon.log(err.stack);
            }

            if (logError.useImmediateExceptions) {
                throwLoggedError();
            } else {
                logError.setTimeout(throwLoggedError, 0);
            }
        }

        // When set to true, any errors logged will be thrown immediately;
        // If set to false, the errors will be thrown in separate execution frame.
        logError.useImmediateExceptions = false;

        // wrap realSetTimeout with something we can stub in tests
        logError.setTimeout = function (func, timeout) {
            realSetTimeout(func, timeout);
        };

        var exports = {};
        exports.log = sinon.log = log;
        exports.logError = sinon.logError = logError;

        return exports;
    }

    function loadDependencies(require, exports, module) {
        var sinon = require("./util/core");
        module.exports = makeApi(sinon);
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon // eslint-disable-line no-undef
));

},{"./util/core":42}],33:[function(require,module,exports){
/**
 * @depend util/core.js
 * @depend typeOf.js
 */
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global module, require, sinon*/
/**
 * Match functions
 *
 * @author Maximilian Antoni (mail@maxantoni.de)
 * @license BSD
 *
 * Copyright (c) 2012 Maximilian Antoni
 */
(function (sinonGlobal) {
    "use strict";

    function makeApi(sinon) {
        function assertType(value, type, name) {
            var actual = sinon.typeOf(value);
            if (actual !== type) {
                throw new TypeError("Expected type of " + name + " to be " +
                    type + ", but was " + actual);
            }
        }

        var matcher = {
            toString: function () {
                return this.message;
            }
        };

        function isMatcher(object) {
            return matcher.isPrototypeOf(object);
        }

        function matchObject(expectation, actual) {
            if (actual === null || actual === undefined) {
                return false;
            }
            for (var key in expectation) {
                if (expectation.hasOwnProperty(key)) {
                    var exp = expectation[key];
                    var act = actual[key];
                    if (isMatcher(exp)) {
                        if (!exp.test(act)) {
                            return false;
                        }
                    } else if (sinon.typeOf(exp) === "object") {
                        if (!matchObject(exp, act)) {
                            return false;
                        }
                    } else if (!sinon.deepEqual(exp, act)) {
                        return false;
                    }
                }
            }
            return true;
        }

        function match(expectation, message) {
            var m = sinon.create(matcher);
            var type = sinon.typeOf(expectation);
            switch (type) {
            case "object":
                if (typeof expectation.test === "function") {
                    m.test = function (actual) {
                        return expectation.test(actual) === true;
                    };
                    m.message = "match(" + sinon.functionName(expectation.test) + ")";
                    return m;
                }
                var str = [];
                for (var key in expectation) {
                    if (expectation.hasOwnProperty(key)) {
                        str.push(key + ": " + expectation[key]);
                    }
                }
                m.test = function (actual) {
                    return matchObject(expectation, actual);
                };
                m.message = "match(" + str.join(", ") + ")";
                break;
            case "number":
                m.test = function (actual) {
                    // we need type coercion here
                    return expectation == actual; // eslint-disable-line eqeqeq
                };
                break;
            case "string":
                m.test = function (actual) {
                    if (typeof actual !== "string") {
                        return false;
                    }
                    return actual.indexOf(expectation) !== -1;
                };
                m.message = "match(\"" + expectation + "\")";
                break;
            case "regexp":
                m.test = function (actual) {
                    if (typeof actual !== "string") {
                        return false;
                    }
                    return expectation.test(actual);
                };
                break;
            case "function":
                m.test = expectation;
                if (message) {
                    m.message = message;
                } else {
                    m.message = "match(" + sinon.functionName(expectation) + ")";
                }
                break;
            default:
                m.test = function (actual) {
                    return sinon.deepEqual(expectation, actual);
                };
            }
            if (!m.message) {
                m.message = "match(" + expectation + ")";
            }
            return m;
        }

        matcher.or = function (m2) {
            if (!arguments.length) {
                throw new TypeError("Matcher expected");
            } else if (!isMatcher(m2)) {
                m2 = match(m2);
            }
            var m1 = this;
            var or = sinon.create(matcher);
            or.test = function (actual) {
                return m1.test(actual) || m2.test(actual);
            };
            or.message = m1.message + ".or(" + m2.message + ")";
            return or;
        };

        matcher.and = function (m2) {
            if (!arguments.length) {
                throw new TypeError("Matcher expected");
            } else if (!isMatcher(m2)) {
                m2 = match(m2);
            }
            var m1 = this;
            var and = sinon.create(matcher);
            and.test = function (actual) {
                return m1.test(actual) && m2.test(actual);
            };
            and.message = m1.message + ".and(" + m2.message + ")";
            return and;
        };

        match.isMatcher = isMatcher;

        match.any = match(function () {
            return true;
        }, "any");

        match.defined = match(function (actual) {
            return actual !== null && actual !== undefined;
        }, "defined");

        match.truthy = match(function (actual) {
            return !!actual;
        }, "truthy");

        match.falsy = match(function (actual) {
            return !actual;
        }, "falsy");

        match.same = function (expectation) {
            return match(function (actual) {
                return expectation === actual;
            }, "same(" + expectation + ")");
        };

        match.typeOf = function (type) {
            assertType(type, "string", "type");
            return match(function (actual) {
                return sinon.typeOf(actual) === type;
            }, "typeOf(\"" + type + "\")");
        };

        match.instanceOf = function (type) {
            assertType(type, "function", "type");
            return match(function (actual) {
                return actual instanceof type;
            }, "instanceOf(" + sinon.functionName(type) + ")");
        };

        function createPropertyMatcher(propertyTest, messagePrefix) {
            return function (property, value) {
                assertType(property, "string", "property");
                var onlyProperty = arguments.length === 1;
                var message = messagePrefix + "(\"" + property + "\"";
                if (!onlyProperty) {
                    message += ", " + value;
                }
                message += ")";
                return match(function (actual) {
                    if (actual === undefined || actual === null ||
                            !propertyTest(actual, property)) {
                        return false;
                    }
                    return onlyProperty || sinon.deepEqual(value, actual[property]);
                }, message);
            };
        }

        match.has = createPropertyMatcher(function (actual, property) {
            if (typeof actual === "object") {
                return property in actual;
            }
            return actual[property] !== undefined;
        }, "has");

        match.hasOwn = createPropertyMatcher(function (actual, property) {
            return actual.hasOwnProperty(property);
        }, "hasOwn");

        match.bool = match.typeOf("boolean");
        match.number = match.typeOf("number");
        match.string = match.typeOf("string");
        match.object = match.typeOf("object");
        match.func = match.typeOf("function");
        match.array = match.typeOf("array");
        match.regexp = match.typeOf("regexp");
        match.date = match.typeOf("date");

        sinon.match = match;
        return match;
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports, module) {
        var sinon = require("./util/core");
        require("./typeOf");
        module.exports = makeApi(sinon);
    }

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon // eslint-disable-line no-undef
));

},{"./typeOf":41,"./util/core":42}],34:[function(require,module,exports){
/**
 * @depend times_in_words.js
 * @depend util/core.js
 * @depend call.js
 * @depend extend.js
 * @depend match.js
 * @depend spy.js
 * @depend stub.js
 * @depend format.js
 */
/**
 * Mock functions.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
(function (sinonGlobal) {
    "use strict";

    function makeApi(sinon) {
        var push = [].push;
        var match = sinon.match;

        function mock(object) {
            // if (typeof console !== undefined && console.warn) {
            //     console.warn("mock will be removed from Sinon.JS v2.0");
            // }

            if (!object) {
                return sinon.expectation.create("Anonymous mock");
            }

            return mock.create(object);
        }

        function each(collection, callback) {
            if (!collection) {
                return;
            }

            for (var i = 0, l = collection.length; i < l; i += 1) {
                callback(collection[i]);
            }
        }

        function arrayEquals(arr1, arr2, compareLength) {
            if (compareLength && (arr1.length !== arr2.length)) {
                return false;
            }

            for (var i = 0, l = arr1.length; i < l; i++) {
                if (!sinon.deepEqual(arr1[i], arr2[i])) {
                    return false;
                }
            }
            return true;
        }

        sinon.extend(mock, {
            create: function create(object) {
                if (!object) {
                    throw new TypeError("object is null");
                }

                var mockObject = sinon.extend({}, mock);
                mockObject.object = object;
                delete mockObject.create;

                return mockObject;
            },

            expects: function expects(method) {
                if (!method) {
                    throw new TypeError("method is falsy");
                }

                if (!this.expectations) {
                    this.expectations = {};
                    this.proxies = [];
                }

                if (!this.expectations[method]) {
                    this.expectations[method] = [];
                    var mockObject = this;

                    sinon.wrapMethod(this.object, method, function () {
                        return mockObject.invokeMethod(method, this, arguments);
                    });

                    push.call(this.proxies, method);
                }

                var expectation = sinon.expectation.create(method);
                push.call(this.expectations[method], expectation);

                return expectation;
            },

            restore: function restore() {
                var object = this.object;

                each(this.proxies, function (proxy) {
                    if (typeof object[proxy].restore === "function") {
                        object[proxy].restore();
                    }
                });
            },

            verify: function verify() {
                var expectations = this.expectations || {};
                var messages = [];
                var met = [];

                each(this.proxies, function (proxy) {
                    each(expectations[proxy], function (expectation) {
                        if (!expectation.met()) {
                            push.call(messages, expectation.toString());
                        } else {
                            push.call(met, expectation.toString());
                        }
                    });
                });

                this.restore();

                if (messages.length > 0) {
                    sinon.expectation.fail(messages.concat(met).join("\n"));
                } else if (met.length > 0) {
                    sinon.expectation.pass(messages.concat(met).join("\n"));
                }

                return true;
            },

            invokeMethod: function invokeMethod(method, thisValue, args) {
                var expectations = this.expectations && this.expectations[method] ? this.expectations[method] : [];
                var expectationsWithMatchingArgs = [];
                var currentArgs = args || [];
                var i, available;

                for (i = 0; i < expectations.length; i += 1) {
                    var expectedArgs = expectations[i].expectedArguments || [];
                    if (arrayEquals(expectedArgs, currentArgs, expectations[i].expectsExactArgCount)) {
                        expectationsWithMatchingArgs.push(expectations[i]);
                    }
                }

                for (i = 0; i < expectationsWithMatchingArgs.length; i += 1) {
                    if (!expectationsWithMatchingArgs[i].met() &&
                        expectationsWithMatchingArgs[i].allowsCall(thisValue, args)) {
                        return expectationsWithMatchingArgs[i].apply(thisValue, args);
                    }
                }

                var messages = [];
                var exhausted = 0;

                for (i = 0; i < expectationsWithMatchingArgs.length; i += 1) {
                    if (expectationsWithMatchingArgs[i].allowsCall(thisValue, args)) {
                        available = available || expectationsWithMatchingArgs[i];
                    } else {
                        exhausted += 1;
                    }
                }

                if (available && exhausted === 0) {
                    return available.apply(thisValue, args);
                }

                for (i = 0; i < expectations.length; i += 1) {
                    push.call(messages, "    " + expectations[i].toString());
                }

                messages.unshift("Unexpected call: " + sinon.spyCall.toString.call({
                    proxy: method,
                    args: args
                }));

                sinon.expectation.fail(messages.join("\n"));
            }
        });

        var times = sinon.timesInWords;
        var slice = Array.prototype.slice;

        function callCountInWords(callCount) {
            if (callCount === 0) {
                return "never called";
            }

            return "called " + times(callCount);
        }

        function expectedCallCountInWords(expectation) {
            var min = expectation.minCalls;
            var max = expectation.maxCalls;

            if (typeof min === "number" && typeof max === "number") {
                var str = times(min);

                if (min !== max) {
                    str = "at least " + str + " and at most " + times(max);
                }

                return str;
            }

            if (typeof min === "number") {
                return "at least " + times(min);
            }

            return "at most " + times(max);
        }

        function receivedMinCalls(expectation) {
            var hasMinLimit = typeof expectation.minCalls === "number";
            return !hasMinLimit || expectation.callCount >= expectation.minCalls;
        }

        function receivedMaxCalls(expectation) {
            if (typeof expectation.maxCalls !== "number") {
                return false;
            }

            return expectation.callCount === expectation.maxCalls;
        }

        function verifyMatcher(possibleMatcher, arg) {
            var isMatcher = match && match.isMatcher(possibleMatcher);

            return isMatcher && possibleMatcher.test(arg) || true;
        }

        sinon.expectation = {
            minCalls: 1,
            maxCalls: 1,

            create: function create(methodName) {
                var expectation = sinon.extend(sinon.stub.create(), sinon.expectation);
                delete expectation.create;
                expectation.method = methodName;

                return expectation;
            },

            invoke: function invoke(func, thisValue, args) {
                this.verifyCallAllowed(thisValue, args);

                return sinon.spy.invoke.apply(this, arguments);
            },

            atLeast: function atLeast(num) {
                if (typeof num !== "number") {
                    throw new TypeError("'" + num + "' is not number");
                }

                if (!this.limitsSet) {
                    this.maxCalls = null;
                    this.limitsSet = true;
                }

                this.minCalls = num;

                return this;
            },

            atMost: function atMost(num) {
                if (typeof num !== "number") {
                    throw new TypeError("'" + num + "' is not number");
                }

                if (!this.limitsSet) {
                    this.minCalls = null;
                    this.limitsSet = true;
                }

                this.maxCalls = num;

                return this;
            },

            never: function never() {
                return this.exactly(0);
            },

            once: function once() {
                return this.exactly(1);
            },

            twice: function twice() {
                return this.exactly(2);
            },

            thrice: function thrice() {
                return this.exactly(3);
            },

            exactly: function exactly(num) {
                if (typeof num !== "number") {
                    throw new TypeError("'" + num + "' is not a number");
                }

                this.atLeast(num);
                return this.atMost(num);
            },

            met: function met() {
                return !this.failed && receivedMinCalls(this);
            },

            verifyCallAllowed: function verifyCallAllowed(thisValue, args) {
                if (receivedMaxCalls(this)) {
                    this.failed = true;
                    sinon.expectation.fail(this.method + " already called " + times(this.maxCalls));
                }

                if ("expectedThis" in this && this.expectedThis !== thisValue) {
                    sinon.expectation.fail(this.method + " called with " + thisValue + " as thisValue, expected " +
                        this.expectedThis);
                }

                if (!("expectedArguments" in this)) {
                    return;
                }

                if (!args) {
                    sinon.expectation.fail(this.method + " received no arguments, expected " +
                        sinon.format(this.expectedArguments));
                }

                if (args.length < this.expectedArguments.length) {
                    sinon.expectation.fail(this.method + " received too few arguments (" + sinon.format(args) +
                        "), expected " + sinon.format(this.expectedArguments));
                }

                if (this.expectsExactArgCount &&
                    args.length !== this.expectedArguments.length) {
                    sinon.expectation.fail(this.method + " received too many arguments (" + sinon.format(args) +
                        "), expected " + sinon.format(this.expectedArguments));
                }

                for (var i = 0, l = this.expectedArguments.length; i < l; i += 1) {

                    if (!verifyMatcher(this.expectedArguments[i], args[i])) {
                        sinon.expectation.fail(this.method + " received wrong arguments " + sinon.format(args) +
                            ", didn't match " + this.expectedArguments.toString());
                    }

                    if (!sinon.deepEqual(this.expectedArguments[i], args[i])) {
                        sinon.expectation.fail(this.method + " received wrong arguments " + sinon.format(args) +
                            ", expected " + sinon.format(this.expectedArguments));
                    }
                }
            },

            allowsCall: function allowsCall(thisValue, args) {
                if (this.met() && receivedMaxCalls(this)) {
                    return false;
                }

                if ("expectedThis" in this && this.expectedThis !== thisValue) {
                    return false;
                }

                if (!("expectedArguments" in this)) {
                    return true;
                }

                args = args || [];

                if (args.length < this.expectedArguments.length) {
                    return false;
                }

                if (this.expectsExactArgCount &&
                    args.length !== this.expectedArguments.length) {
                    return false;
                }

                for (var i = 0, l = this.expectedArguments.length; i < l; i += 1) {
                    if (!verifyMatcher(this.expectedArguments[i], args[i])) {
                        return false;
                    }

                    if (!sinon.deepEqual(this.expectedArguments[i], args[i])) {
                        return false;
                    }
                }

                return true;
            },

            withArgs: function withArgs() {
                this.expectedArguments = slice.call(arguments);
                return this;
            },

            withExactArgs: function withExactArgs() {
                this.withArgs.apply(this, arguments);
                this.expectsExactArgCount = true;
                return this;
            },

            on: function on(thisValue) {
                this.expectedThis = thisValue;
                return this;
            },

            toString: function () {
                var args = (this.expectedArguments || []).slice();

                if (!this.expectsExactArgCount) {
                    push.call(args, "[...]");
                }

                var callStr = sinon.spyCall.toString.call({
                    proxy: this.method || "anonymous mock expectation",
                    args: args
                });

                var message = callStr.replace(", [...", "[, ...") + " " +
                    expectedCallCountInWords(this);

                if (this.met()) {
                    return "Expectation met: " + message;
                }

                return "Expected " + message + " (" +
                    callCountInWords(this.callCount) + ")";
            },

            verify: function verify() {
                if (!this.met()) {
                    sinon.expectation.fail(this.toString());
                } else {
                    sinon.expectation.pass(this.toString());
                }

                return true;
            },

            pass: function pass(message) {
                sinon.assert.pass(message);
            },

            fail: function fail(message) {
                var exception = new Error(message);
                exception.name = "ExpectationError";

                throw exception;
            }
        };

        sinon.mock = mock;
        return mock;
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports, module) {
        var sinon = require("./util/core");
        require("./times_in_words");
        require("./call");
        require("./extend");
        require("./match");
        require("./spy");
        require("./stub");
        require("./format");

        module.exports = makeApi(sinon);
    }

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon // eslint-disable-line no-undef
));

},{"./call":28,"./extend":30,"./format":31,"./match":33,"./spy":36,"./stub":37,"./times_in_words":40,"./util/core":42}],35:[function(require,module,exports){
/**
 * @depend util/core.js
 * @depend extend.js
 * @depend collection.js
 * @depend util/fake_timers.js
 * @depend util/fake_server_with_clock.js
 */
/**
 * Manages fake collections as well as fake utilities such as Sinon's
 * timers and fake XHR implementation in one convenient object.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
(function (sinonGlobal) {
    "use strict";

    function makeApi(sinon) {
        var push = [].push;

        function exposeValue(sandbox, config, key, value) {
            if (!value) {
                return;
            }

            if (config.injectInto && !(key in config.injectInto)) {
                config.injectInto[key] = value;
                sandbox.injectedKeys.push(key);
            } else {
                push.call(sandbox.args, value);
            }
        }

        function prepareSandboxFromConfig(config) {
            var sandbox = sinon.create(sinon.sandbox);

            if (config.useFakeServer) {
                if (typeof config.useFakeServer === "object") {
                    sandbox.serverPrototype = config.useFakeServer;
                }

                sandbox.useFakeServer();
            }

            if (config.useFakeTimers) {
                if (typeof config.useFakeTimers === "object") {
                    sandbox.useFakeTimers.apply(sandbox, config.useFakeTimers);
                } else {
                    sandbox.useFakeTimers();
                }
            }

            return sandbox;
        }

        sinon.sandbox = sinon.extend(sinon.create(sinon.collection), {
            useFakeTimers: function useFakeTimers() {
                this.clock = sinon.useFakeTimers.apply(sinon, arguments);

                return this.add(this.clock);
            },

            serverPrototype: sinon.fakeServer,

            useFakeServer: function useFakeServer() {
                var proto = this.serverPrototype || sinon.fakeServer;

                if (!proto || !proto.create) {
                    return null;
                }

                this.server = proto.create();
                return this.add(this.server);
            },

            inject: function (obj) {
                sinon.collection.inject.call(this, obj);

                if (this.clock) {
                    obj.clock = this.clock;
                }

                if (this.server) {
                    obj.server = this.server;
                    obj.requests = this.server.requests;
                }

                obj.match = sinon.match;

                return obj;
            },

            restore: function () {
                if (arguments.length) {
                    throw new Error("sandbox.restore() does not take any parameters. Perhaps you meant stub.restore()");
                }

                sinon.collection.restore.apply(this, arguments);
                this.restoreContext();
            },

            restoreContext: function () {
                if (this.injectedKeys) {
                    for (var i = 0, j = this.injectedKeys.length; i < j; i++) {
                        delete this.injectInto[this.injectedKeys[i]];
                    }
                    this.injectedKeys = [];
                }
            },

            create: function (config) {
                if (!config) {
                    return sinon.create(sinon.sandbox);
                }

                var sandbox = prepareSandboxFromConfig(config);
                sandbox.args = sandbox.args || [];
                sandbox.injectedKeys = [];
                sandbox.injectInto = config.injectInto;
                var prop,
                    value;
                var exposed = sandbox.inject({});

                if (config.properties) {
                    for (var i = 0, l = config.properties.length; i < l; i++) {
                        prop = config.properties[i];
                        value = exposed[prop] || prop === "sandbox" && sandbox;
                        exposeValue(sandbox, config, prop, value);
                    }
                } else {
                    exposeValue(sandbox, config, "sandbox", value);
                }

                return sandbox;
            },

            match: sinon.match
        });

        sinon.sandbox.useFakeXMLHttpRequest = sinon.sandbox.useFakeServer;

        return sinon.sandbox;
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports, module) {
        var sinon = require("./util/core");
        require("./extend");
        require("./util/fake_server_with_clock");
        require("./util/fake_timers");
        require("./collection");
        module.exports = makeApi(sinon);
    }

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon // eslint-disable-line no-undef
));

},{"./collection":29,"./extend":30,"./util/core":42,"./util/fake_server_with_clock":45,"./util/fake_timers":46}],36:[function(require,module,exports){
/**
  * @depend times_in_words.js
  * @depend util/core.js
  * @depend extend.js
  * @depend call.js
  * @depend format.js
  */
/**
  * Spy functions
  *
  * @author Christian Johansen (christian@cjohansen.no)
  * @license BSD
  *
  * Copyright (c) 2010-2013 Christian Johansen
  */
(function (sinonGlobal) {
    "use strict";

    function makeApi(sinon) {
        var push = Array.prototype.push;
        var slice = Array.prototype.slice;
        var callId = 0;

        function spy(object, property, types) {
            if (!property && typeof object === "function") {
                return spy.create(object);
            }

            if (!object && !property) {
                return spy.create(function () { });
            }

            if (types) {
                // A new descriptor is needed here because we can only wrap functions
                // By passing the original descriptor we would end up trying to spy non-function properties
                var descriptor = {};
                var methodDesc = sinon.getPropertyDescriptor(object, property);

                for (var i = 0; i < types.length; i++) {
                    descriptor[types[i]] = spy.create(methodDesc[types[i]]);
                }
                return sinon.wrapMethod(object, property, descriptor);
            }

            return sinon.wrapMethod(object, property, spy.create(object[property]));
        }

        function matchingFake(fakes, args, strict) {
            if (!fakes) {
                return undefined;
            }

            for (var i = 0, l = fakes.length; i < l; i++) {
                if (fakes[i].matches(args, strict)) {
                    return fakes[i];
                }
            }
        }

        function incrementCallCount() {
            this.called = true;
            this.callCount += 1;
            this.notCalled = false;
            this.calledOnce = this.callCount === 1;
            this.calledTwice = this.callCount === 2;
            this.calledThrice = this.callCount === 3;
        }

        function createCallProperties() {
            this.firstCall = this.getCall(0);
            this.secondCall = this.getCall(1);
            this.thirdCall = this.getCall(2);
            this.lastCall = this.getCall(this.callCount - 1);
        }

        var vars = "a,b,c,d,e,f,g,h,i,j,k,l";
        function createProxy(func, proxyLength) {
            // Retain the function length:
            var p;
            if (proxyLength) {
                eval("p = (function proxy(" + vars.substring(0, proxyLength * 2 - 1) + // eslint-disable-line no-eval
                    ") { return p.invoke(func, this, slice.call(arguments)); });");
            } else {
                p = function proxy() {
                    return p.invoke(func, this, slice.call(arguments));
                };
            }
            p.isSinonProxy = true;
            return p;
        }

        var uuid = 0;

        // Public API
        var spyApi = {
            reset: function () {
                if (this.invoking) {
                    var err = new Error("Cannot reset Sinon function while invoking it. " +
                                        "Move the call to .reset outside of the callback.");
                    err.name = "InvalidResetException";
                    throw err;
                }

                this.called = false;
                this.notCalled = true;
                this.calledOnce = false;
                this.calledTwice = false;
                this.calledThrice = false;
                this.callCount = 0;
                this.firstCall = null;
                this.secondCall = null;
                this.thirdCall = null;
                this.lastCall = null;
                this.args = [];
                this.returnValues = [];
                this.thisValues = [];
                this.exceptions = [];
                this.callIds = [];
                this.stacks = [];
                if (this.fakes) {
                    for (var i = 0; i < this.fakes.length; i++) {
                        this.fakes[i].reset();
                    }
                }

                return this;
            },

            create: function create(func, spyLength) {
                var name;

                if (typeof func !== "function") {
                    func = function () { };
                } else {
                    name = sinon.functionName(func);
                }

                if (!spyLength) {
                    spyLength = func.length;
                }

                var proxy = createProxy(func, spyLength);

                sinon.extend(proxy, spy);
                delete proxy.create;
                sinon.extend(proxy, func);

                proxy.reset();
                proxy.prototype = func.prototype;
                proxy.displayName = name || "spy";
                proxy.toString = sinon.functionToString;
                proxy.instantiateFake = sinon.spy.create;
                proxy.id = "spy#" + uuid++;

                return proxy;
            },

            invoke: function invoke(func, thisValue, args) {
                var matching = matchingFake(this.fakes, args);
                var exception, returnValue;

                incrementCallCount.call(this);
                push.call(this.thisValues, thisValue);
                push.call(this.args, args);
                push.call(this.callIds, callId++);

                // Make call properties available from within the spied function:
                createCallProperties.call(this);

                try {
                    this.invoking = true;

                    if (matching) {
                        returnValue = matching.invoke(func, thisValue, args);
                    } else {
                        returnValue = (this.func || func).apply(thisValue, args);
                    }

                    var thisCall = this.getCall(this.callCount - 1);
                    if (thisCall.calledWithNew() && typeof returnValue !== "object") {
                        returnValue = thisValue;
                    }
                } catch (e) {
                    exception = e;
                } finally {
                    delete this.invoking;
                }

                push.call(this.exceptions, exception);
                push.call(this.returnValues, returnValue);
                push.call(this.stacks, new Error().stack);

                // Make return value and exception available in the calls:
                createCallProperties.call(this);

                if (exception !== undefined) {
                    throw exception;
                }

                return returnValue;
            },

            named: function named(name) {
                this.displayName = name;
                return this;
            },

            getCall: function getCall(i) {
                if (i < 0 || i >= this.callCount) {
                    return null;
                }

                return sinon.spyCall(this, this.thisValues[i], this.args[i],
                                        this.returnValues[i], this.exceptions[i],
                                        this.callIds[i], this.stacks[i]);
            },

            getCalls: function () {
                var calls = [];
                var i;

                for (i = 0; i < this.callCount; i++) {
                    calls.push(this.getCall(i));
                }

                return calls;
            },

            calledBefore: function calledBefore(spyFn) {
                if (!this.called) {
                    return false;
                }

                if (!spyFn.called) {
                    return true;
                }

                return this.callIds[0] < spyFn.callIds[spyFn.callIds.length - 1];
            },

            calledAfter: function calledAfter(spyFn) {
                if (!this.called || !spyFn.called) {
                    return false;
                }

                return this.callIds[this.callCount - 1] > spyFn.callIds[spyFn.callCount - 1];
            },

            withArgs: function () {
                var args = slice.call(arguments);

                if (this.fakes) {
                    var match = matchingFake(this.fakes, args, true);

                    if (match) {
                        return match;
                    }
                } else {
                    this.fakes = [];
                }

                var original = this;
                var fake = this.instantiateFake();
                fake.matchingAguments = args;
                fake.parent = this;
                push.call(this.fakes, fake);

                fake.withArgs = function () {
                    return original.withArgs.apply(original, arguments);
                };

                for (var i = 0; i < this.args.length; i++) {
                    if (fake.matches(this.args[i])) {
                        incrementCallCount.call(fake);
                        push.call(fake.thisValues, this.thisValues[i]);
                        push.call(fake.args, this.args[i]);
                        push.call(fake.returnValues, this.returnValues[i]);
                        push.call(fake.exceptions, this.exceptions[i]);
                        push.call(fake.callIds, this.callIds[i]);
                    }
                }
                createCallProperties.call(fake);

                return fake;
            },

            matches: function (args, strict) {
                var margs = this.matchingAguments;

                if (margs.length <= args.length &&
                    sinon.deepEqual(margs, args.slice(0, margs.length))) {
                    return !strict || margs.length === args.length;
                }
            },

            printf: function (format) {
                var spyInstance = this;
                var args = slice.call(arguments, 1);
                var formatter;

                return (format || "").replace(/%(.)/g, function (match, specifyer) {
                    formatter = spyApi.formatters[specifyer];

                    if (typeof formatter === "function") {
                        return formatter.call(null, spyInstance, args);
                    } else if (!isNaN(parseInt(specifyer, 10))) {
                        return sinon.format(args[specifyer - 1]);
                    }

                    return "%" + specifyer;
                });
            }
        };

        function delegateToCalls(method, matchAny, actual, notCalled) {
            spyApi[method] = function () {
                if (!this.called) {
                    if (notCalled) {
                        return notCalled.apply(this, arguments);
                    }
                    return false;
                }

                var currentCall;
                var matches = 0;

                for (var i = 0, l = this.callCount; i < l; i += 1) {
                    currentCall = this.getCall(i);

                    if (currentCall[actual || method].apply(currentCall, arguments)) {
                        matches += 1;

                        if (matchAny) {
                            return true;
                        }
                    }
                }

                return matches === this.callCount;
            };
        }

        delegateToCalls("calledOn", true);
        delegateToCalls("alwaysCalledOn", false, "calledOn");
        delegateToCalls("calledWith", true);
        delegateToCalls("calledWithMatch", true);
        delegateToCalls("alwaysCalledWith", false, "calledWith");
        delegateToCalls("alwaysCalledWithMatch", false, "calledWithMatch");
        delegateToCalls("calledWithExactly", true);
        delegateToCalls("alwaysCalledWithExactly", false, "calledWithExactly");
        delegateToCalls("neverCalledWith", false, "notCalledWith", function () {
            return true;
        });
        delegateToCalls("neverCalledWithMatch", false, "notCalledWithMatch", function () {
            return true;
        });
        delegateToCalls("threw", true);
        delegateToCalls("alwaysThrew", false, "threw");
        delegateToCalls("returned", true);
        delegateToCalls("alwaysReturned", false, "returned");
        delegateToCalls("calledWithNew", true);
        delegateToCalls("alwaysCalledWithNew", false, "calledWithNew");
        delegateToCalls("callArg", false, "callArgWith", function () {
            throw new Error(this.toString() + " cannot call arg since it was not yet invoked.");
        });
        spyApi.callArgWith = spyApi.callArg;
        delegateToCalls("callArgOn", false, "callArgOnWith", function () {
            throw new Error(this.toString() + " cannot call arg since it was not yet invoked.");
        });
        spyApi.callArgOnWith = spyApi.callArgOn;
        delegateToCalls("yield", false, "yield", function () {
            throw new Error(this.toString() + " cannot yield since it was not yet invoked.");
        });
        // "invokeCallback" is an alias for "yield" since "yield" is invalid in strict mode.
        spyApi.invokeCallback = spyApi.yield;
        delegateToCalls("yieldOn", false, "yieldOn", function () {
            throw new Error(this.toString() + " cannot yield since it was not yet invoked.");
        });
        delegateToCalls("yieldTo", false, "yieldTo", function (property) {
            throw new Error(this.toString() + " cannot yield to '" + property +
                "' since it was not yet invoked.");
        });
        delegateToCalls("yieldToOn", false, "yieldToOn", function (property) {
            throw new Error(this.toString() + " cannot yield to '" + property +
                "' since it was not yet invoked.");
        });

        spyApi.formatters = {
            c: function (spyInstance) {
                return sinon.timesInWords(spyInstance.callCount);
            },

            n: function (spyInstance) {
                return spyInstance.toString();
            },

            C: function (spyInstance) {
                var calls = [];

                for (var i = 0, l = spyInstance.callCount; i < l; ++i) {
                    var stringifiedCall = "    " + spyInstance.getCall(i).toString();
                    if (/\n/.test(calls[i - 1])) {
                        stringifiedCall = "\n" + stringifiedCall;
                    }
                    push.call(calls, stringifiedCall);
                }

                return calls.length > 0 ? "\n" + calls.join("\n") : "";
            },

            t: function (spyInstance) {
                var objects = [];

                for (var i = 0, l = spyInstance.callCount; i < l; ++i) {
                    push.call(objects, sinon.format(spyInstance.thisValues[i]));
                }

                return objects.join(", ");
            },

            "*": function (spyInstance, args) {
                var formatted = [];

                for (var i = 0, l = args.length; i < l; ++i) {
                    push.call(formatted, sinon.format(args[i]));
                }

                return formatted.join(", ");
            }
        };

        sinon.extend(spy, spyApi);

        spy.spyCall = sinon.spyCall;
        sinon.spy = spy;

        return spy;
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports, module) {
        var core = require("./util/core");
        require("./call");
        require("./extend");
        require("./times_in_words");
        require("./format");
        module.exports = makeApi(core);
    }

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon // eslint-disable-line no-undef
));

},{"./call":28,"./extend":30,"./format":31,"./times_in_words":40,"./util/core":42}],37:[function(require,module,exports){
/**
 * @depend util/core.js
 * @depend extend.js
 * @depend spy.js
 * @depend behavior.js
 * @depend walk.js
 */
/**
 * Stub functions
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
(function (sinonGlobal) {
    "use strict";

    function makeApi(sinon) {
        function stub(object, property, func) {
            if (!!func && typeof func !== "function" && typeof func !== "object") {
                throw new TypeError("Custom stub should be a function or a property descriptor");
            }

            var wrapper;

            if (func) {
                if (typeof func === "function") {
                    wrapper = sinon.spy && sinon.spy.create ? sinon.spy.create(func) : func;
                } else {
                    wrapper = func;
                    if (sinon.spy && sinon.spy.create) {
                        var types = sinon.objectKeys(wrapper);
                        for (var i = 0; i < types.length; i++) {
                            wrapper[types[i]] = sinon.spy.create(wrapper[types[i]]);
                        }
                    }
                }
            } else {
                var stubLength = 0;
                if (typeof object === "object" && typeof object[property] === "function") {
                    stubLength = object[property].length;
                }
                wrapper = stub.create(stubLength);
            }

            if (!object && typeof property === "undefined") {
                return sinon.stub.create();
            }

            if (typeof property === "undefined" && typeof object === "object") {
                sinon.walk(object || {}, function (value, prop, propOwner) {
                    // we don't want to stub things like toString(), valueOf(), etc. so we only stub if the object
                    // is not Object.prototype
                    if (
                        propOwner !== Object.prototype &&
                        prop !== "constructor" &&
                        typeof sinon.getPropertyDescriptor(propOwner, prop).value === "function"
                    ) {
                        stub(object, prop);
                    }
                });

                return object;
            }

            return sinon.wrapMethod(object, property, wrapper);
        }


        /*eslint-disable no-use-before-define*/
        function getParentBehaviour(stubInstance) {
            return (stubInstance.parent && getCurrentBehavior(stubInstance.parent));
        }

        function getDefaultBehavior(stubInstance) {
            return stubInstance.defaultBehavior ||
                    getParentBehaviour(stubInstance) ||
                    sinon.behavior.create(stubInstance);
        }

        function getCurrentBehavior(stubInstance) {
            var behavior = stubInstance.behaviors[stubInstance.callCount - 1];
            return behavior && behavior.isPresent() ? behavior : getDefaultBehavior(stubInstance);
        }
        /*eslint-enable no-use-before-define*/

        var uuid = 0;

        var proto = {
            create: function create(stubLength) {
                var functionStub = function () {
                    return getCurrentBehavior(functionStub).invoke(this, arguments);
                };

                functionStub.id = "stub#" + uuid++;
                var orig = functionStub;
                functionStub = sinon.spy.create(functionStub, stubLength);
                functionStub.func = orig;

                sinon.extend(functionStub, stub);
                functionStub.instantiateFake = sinon.stub.create;
                functionStub.displayName = "stub";
                functionStub.toString = sinon.functionToString;

                functionStub.defaultBehavior = null;
                functionStub.behaviors = [];

                return functionStub;
            },

            resetBehavior: function () {
                var i;

                this.defaultBehavior = null;
                this.behaviors = [];

                delete this.returnValue;
                delete this.returnArgAt;
                this.returnThis = false;

                if (this.fakes) {
                    for (i = 0; i < this.fakes.length; i++) {
                        this.fakes[i].resetBehavior();
                    }
                }
            },

            onCall: function onCall(index) {
                if (!this.behaviors[index]) {
                    this.behaviors[index] = sinon.behavior.create(this);
                }

                return this.behaviors[index];
            },

            onFirstCall: function onFirstCall() {
                return this.onCall(0);
            },

            onSecondCall: function onSecondCall() {
                return this.onCall(1);
            },

            onThirdCall: function onThirdCall() {
                return this.onCall(2);
            }
        };

        function createBehavior(behaviorMethod) {
            return function () {
                this.defaultBehavior = this.defaultBehavior || sinon.behavior.create(this);
                this.defaultBehavior[behaviorMethod].apply(this.defaultBehavior, arguments);
                return this;
            };
        }

        for (var method in sinon.behavior) {
            if (sinon.behavior.hasOwnProperty(method) &&
                !proto.hasOwnProperty(method) &&
                method !== "create" &&
                method !== "withArgs" &&
                method !== "invoke") {
                proto[method] = createBehavior(method);
            }
        }

        sinon.extend(stub, proto);
        sinon.stub = stub;

        return stub;
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports, module) {
        var core = require("./util/core");
        require("./behavior");
        require("./spy");
        require("./extend");
        module.exports = makeApi(core);
    }

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon // eslint-disable-line no-undef
));

},{"./behavior":27,"./extend":30,"./spy":36,"./util/core":42}],38:[function(require,module,exports){
/**
 * @depend util/core.js
 * @depend sandbox.js
 */
/**
 * Test function, sandboxes fakes
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
(function (sinonGlobal) {
    "use strict";

    function makeApi(sinon) {
        var slice = Array.prototype.slice;

        function test(callback) {
            var type = typeof callback;

            if (type !== "function") {
                throw new TypeError("sinon.test needs to wrap a test function, got " + type);
            }

            function sinonSandboxedTest() {
                var config = sinon.getConfig(sinon.config);
                config.injectInto = config.injectIntoThis && this || config.injectInto;
                var sandbox = sinon.sandbox.create(config);
                var args = slice.call(arguments);
                var oldDone = args.length && args[args.length - 1];
                var exception, result;

                if (typeof oldDone === "function") {
                    args[args.length - 1] = function sinonDone(res) {
                        if (res) {
                            sandbox.restore();
                        } else {
                            sandbox.verifyAndRestore();
                        }
                        oldDone(res);
                    };
                }

                try {
                    result = callback.apply(this, args.concat(sandbox.args));
                } catch (e) {
                    exception = e;
                }

                if (typeof exception !== "undefined") {
                    sandbox.restore();
                    throw exception;
                } else if (typeof oldDone !== "function") {
                    sandbox.verifyAndRestore();
                }

                return result;
            }

            if (callback.length) {
                return function sinonAsyncSandboxedTest(done) { // eslint-disable-line no-unused-vars
                    return sinonSandboxedTest.apply(this, arguments);
                };
            }

            return sinonSandboxedTest;
        }

        test.config = {
            injectIntoThis: true,
            injectInto: null,
            properties: ["spy", "stub", "mock", "clock", "server", "requests"],
            useFakeTimers: true,
            useFakeServer: true
        };

        sinon.test = test;
        return test;
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports, module) {
        var core = require("./util/core");
        require("./sandbox");
        module.exports = makeApi(core);
    }

    if (isAMD) {
        define(loadDependencies);
    } else if (isNode) {
        loadDependencies(require, module.exports, module);
    } else if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(typeof sinon === "object" && sinon || null)); // eslint-disable-line no-undef

},{"./sandbox":35,"./util/core":42}],39:[function(require,module,exports){
/**
 * @depend util/core.js
 * @depend test.js
 */
/**
 * Test case, sandboxes all test functions
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
(function (sinonGlobal) {
    "use strict";

    function createTest(property, setUp, tearDown) {
        return function () {
            if (setUp) {
                setUp.apply(this, arguments);
            }

            var exception, result;

            try {
                result = property.apply(this, arguments);
            } catch (e) {
                exception = e;
            }

            if (tearDown) {
                tearDown.apply(this, arguments);
            }

            if (exception) {
                throw exception;
            }

            return result;
        };
    }

    function makeApi(sinon) {
        function testCase(tests, prefix) {
            if (!tests || typeof tests !== "object") {
                throw new TypeError("sinon.testCase needs an object with test functions");
            }

            prefix = prefix || "test";
            var rPrefix = new RegExp("^" + prefix);
            var methods = {};
            var setUp = tests.setUp;
            var tearDown = tests.tearDown;
            var testName,
                property,
                method;

            for (testName in tests) {
                if (tests.hasOwnProperty(testName) && !/^(setUp|tearDown)$/.test(testName)) {
                    property = tests[testName];

                    if (typeof property === "function" && rPrefix.test(testName)) {
                        method = property;

                        if (setUp || tearDown) {
                            method = createTest(property, setUp, tearDown);
                        }

                        methods[testName] = sinon.test(method);
                    } else {
                        methods[testName] = tests[testName];
                    }
                }
            }

            return methods;
        }

        sinon.testCase = testCase;
        return testCase;
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports, module) {
        var core = require("./util/core");
        require("./test");
        module.exports = makeApi(core);
    }

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon // eslint-disable-line no-undef
));

},{"./test":38,"./util/core":42}],40:[function(require,module,exports){
/**
 * @depend util/core.js
 */
(function (sinonGlobal) {
    "use strict";

    function makeApi(sinon) {

        function timesInWords(count) {
            switch (count) {
                case 1:
                    return "once";
                case 2:
                    return "twice";
                case 3:
                    return "thrice";
                default:
                    return (count || 0) + " times";
            }
        }

        sinon.timesInWords = timesInWords;
        return sinon.timesInWords;
    }

    function loadDependencies(require, exports, module) {
        var core = require("./util/core");
        module.exports = makeApi(core);
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon // eslint-disable-line no-undef
));

},{"./util/core":42}],41:[function(require,module,exports){
/**
 * @depend util/core.js
 */
/**
 * Format functions
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2014 Christian Johansen
 */
(function (sinonGlobal) {
    "use strict";

    function makeApi(sinon) {
        function typeOf(value) {
            if (value === null) {
                return "null";
            } else if (value === undefined) {
                return "undefined";
            }
            var string = Object.prototype.toString.call(value);
            return string.substring(8, string.length - 1).toLowerCase();
        }

        sinon.typeOf = typeOf;
        return sinon.typeOf;
    }

    function loadDependencies(require, exports, module) {
        var core = require("./util/core");
        module.exports = makeApi(core);
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon // eslint-disable-line no-undef
));

},{"./util/core":42}],42:[function(require,module,exports){
/**
 * @depend ../../sinon.js
 */
/**
 * Sinon core utilities. For internal use only.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
(function (sinonGlobal) {
    "use strict";

    var div = typeof document !== "undefined" && document.createElement("div");
    var hasOwn = Object.prototype.hasOwnProperty;

    function isDOMNode(obj) {
        var success = false;

        try {
            obj.appendChild(div);
            success = div.parentNode === obj;
        } catch (e) {
            return false;
        } finally {
            try {
                obj.removeChild(div);
            } catch (e) {
                // Remove failed, not much we can do about that
            }
        }

        return success;
    }

    function isElement(obj) {
        return div && obj && obj.nodeType === 1 && isDOMNode(obj);
    }

    function isFunction(obj) {
        return typeof obj === "function" || !!(obj && obj.constructor && obj.call && obj.apply);
    }

    function isReallyNaN(val) {
        return typeof val === "number" && isNaN(val);
    }

    function mirrorProperties(target, source) {
        for (var prop in source) {
            if (!hasOwn.call(target, prop)) {
                target[prop] = source[prop];
            }
        }
    }

    function isRestorable(obj) {
        return typeof obj === "function" && typeof obj.restore === "function" && obj.restore.sinon;
    }

    // Cheap way to detect if we have ES5 support.
    var hasES5Support = "keys" in Object;

    function makeApi(sinon) {
        sinon.wrapMethod = function wrapMethod(object, property, method) {
            if (!object) {
                throw new TypeError("Should wrap property of object");
            }

            if (typeof method !== "function" && typeof method !== "object") {
                throw new TypeError("Method wrapper should be a function or a property descriptor");
            }

            function checkWrappedMethod(wrappedMethod) {
                var error;

                if (!isFunction(wrappedMethod)) {
                    error = new TypeError("Attempted to wrap " + (typeof wrappedMethod) + " property " +
                                        property + " as function");
                } else if (wrappedMethod.restore && wrappedMethod.restore.sinon) {
                    error = new TypeError("Attempted to wrap " + property + " which is already wrapped");
                } else if (wrappedMethod.calledBefore) {
                    var verb = wrappedMethod.returns ? "stubbed" : "spied on";
                    error = new TypeError("Attempted to wrap " + property + " which is already " + verb);
                }

                if (error) {
                    if (wrappedMethod && wrappedMethod.stackTrace) {
                        error.stack += "\n--------------\n" + wrappedMethod.stackTrace;
                    }
                    throw error;
                }
            }

            var error, wrappedMethod, i;

            function simplePropertyAssignment() {
                wrappedMethod = object[property];
                checkWrappedMethod(wrappedMethod);
                object[property] = method;
                method.displayName = property;
            }

            // IE 8 does not support hasOwnProperty on the window object and Firefox has a problem
            // when using hasOwn.call on objects from other frames.
            var owned = (object.hasOwnProperty && object.hasOwnProperty === hasOwn) ?
                object.hasOwnProperty(property) : hasOwn.call(object, property);

            if (hasES5Support) {
                var methodDesc = (typeof method === "function") ? {value: method} : method;
                var wrappedMethodDesc = sinon.getPropertyDescriptor(object, property);

                if (!wrappedMethodDesc) {
                    error = new TypeError("Attempted to wrap " + (typeof wrappedMethod) + " property " +
                                        property + " as function");
                } else if (wrappedMethodDesc.restore && wrappedMethodDesc.restore.sinon) {
                    error = new TypeError("Attempted to wrap " + property + " which is already wrapped");
                }
                if (error) {
                    if (wrappedMethodDesc && wrappedMethodDesc.stackTrace) {
                        error.stack += "\n--------------\n" + wrappedMethodDesc.stackTrace;
                    }
                    throw error;
                }

                var types = sinon.objectKeys(methodDesc);
                for (i = 0; i < types.length; i++) {
                    wrappedMethod = wrappedMethodDesc[types[i]];
                    checkWrappedMethod(wrappedMethod);
                }

                mirrorProperties(methodDesc, wrappedMethodDesc);
                for (i = 0; i < types.length; i++) {
                    mirrorProperties(methodDesc[types[i]], wrappedMethodDesc[types[i]]);
                }
                Object.defineProperty(object, property, methodDesc);

                // catch failing assignment
                // this is the converse of the check in `.restore` below
                if ( typeof method === "function" && object[property] !== method ) {
                    // correct any wrongdoings caused by the defineProperty call above,
                    // such as adding new items (if object was a Storage object)
                    delete object[property];
                    simplePropertyAssignment();
                }
            } else {
                simplePropertyAssignment();
            }

            method.displayName = property;

            // Set up a stack trace which can be used later to find what line of
            // code the original method was created on.
            method.stackTrace = (new Error("Stack Trace for original")).stack;

            method.restore = function () {
                // For prototype properties try to reset by delete first.
                // If this fails (ex: localStorage on mobile safari) then force a reset
                // via direct assignment.
                if (!owned) {
                    // In some cases `delete` may throw an error
                    try {
                        delete object[property];
                    } catch (e) {} // eslint-disable-line no-empty
                    // For native code functions `delete` fails without throwing an error
                    // on Chrome < 43, PhantomJS, etc.
                } else if (hasES5Support) {
                    Object.defineProperty(object, property, wrappedMethodDesc);
                }

                // this only supports ES5 getter/setter, for ES3.1 and lower
                // __lookupSetter__ / __lookupGetter__ should be integrated
                if (hasES5Support) {
                    var checkDesc = sinon.getPropertyDescriptor(object, property);
                    if (checkDesc.value === method) {
                        object[property] = wrappedMethod;
                    }

                // Use strict equality comparison to check failures then force a reset
                // via direct assignment.
                } else if (object[property] === method) {
                    object[property] = wrappedMethod;
                }
            };

            method.restore.sinon = true;

            if (!hasES5Support) {
                mirrorProperties(method, wrappedMethod);
            }

            return method;
        };

        sinon.create = function create(proto) {
            var F = function () {};
            F.prototype = proto;
            return new F();
        };

        sinon.deepEqual = function deepEqual(a, b) {
            if (sinon.match && sinon.match.isMatcher(a)) {
                return a.test(b);
            }

            if (typeof a !== "object" || typeof b !== "object") {
                return isReallyNaN(a) && isReallyNaN(b) || a === b;
            }

            if (isElement(a) || isElement(b)) {
                return a === b;
            }

            if (a === b) {
                return true;
            }

            if ((a === null && b !== null) || (a !== null && b === null)) {
                return false;
            }

            if (a instanceof RegExp && b instanceof RegExp) {
                return (a.source === b.source) && (a.global === b.global) &&
                    (a.ignoreCase === b.ignoreCase) && (a.multiline === b.multiline);
            }

            var aString = Object.prototype.toString.call(a);
            if (aString !== Object.prototype.toString.call(b)) {
                return false;
            }

            if (aString === "[object Date]") {
                return a.valueOf() === b.valueOf();
            }

            var prop;
            var aLength = 0;
            var bLength = 0;

            if (aString === "[object Array]" && a.length !== b.length) {
                return false;
            }

            for (prop in a) {
                if (hasOwn.call(a, prop)) {
                    aLength += 1;

                    if (!(prop in b)) {
                        return false;
                    }

                    if (!deepEqual(a[prop], b[prop])) {
                        return false;
                    }
                }
            }

            for (prop in b) {
                if (hasOwn.call(b, prop)) {
                    bLength += 1;
                }
            }

            return aLength === bLength;
        };

        sinon.functionName = function functionName(func) {
            var name = func.displayName || func.name;

            // Use function decomposition as a last resort to get function
            // name. Does not rely on function decomposition to work - if it
            // doesn't debugging will be slightly less informative
            // (i.e. toString will say 'spy' rather than 'myFunc').
            if (!name) {
                var matches = func.toString().match(/function ([^\s\(]+)/);
                name = matches && matches[1];
            }

            return name;
        };

        sinon.functionToString = function toString() {
            if (this.getCall && this.callCount) {
                var thisValue,
                    prop;
                var i = this.callCount;

                while (i--) {
                    thisValue = this.getCall(i).thisValue;

                    for (prop in thisValue) {
                        if (thisValue[prop] === this) {
                            return prop;
                        }
                    }
                }
            }

            return this.displayName || "sinon fake";
        };

        sinon.objectKeys = function objectKeys(obj) {
            if (obj !== Object(obj)) {
                throw new TypeError("sinon.objectKeys called on a non-object");
            }

            var keys = [];
            var key;
            for (key in obj) {
                if (hasOwn.call(obj, key)) {
                    keys.push(key);
                }
            }

            return keys;
        };

        sinon.getPropertyDescriptor = function getPropertyDescriptor(object, property) {
            var proto = object;
            var descriptor;

            while (proto && !(descriptor = Object.getOwnPropertyDescriptor(proto, property))) {
                proto = Object.getPrototypeOf(proto);
            }
            return descriptor;
        };

        sinon.getConfig = function (custom) {
            var config = {};
            custom = custom || {};
            var defaults = sinon.defaultConfig;

            for (var prop in defaults) {
                if (defaults.hasOwnProperty(prop)) {
                    config[prop] = custom.hasOwnProperty(prop) ? custom[prop] : defaults[prop];
                }
            }

            return config;
        };

        sinon.defaultConfig = {
            injectIntoThis: true,
            injectInto: null,
            properties: ["spy", "stub", "mock", "clock", "server", "requests"],
            useFakeTimers: true,
            useFakeServer: true
        };

        sinon.timesInWords = function timesInWords(count) {
            return count === 1 && "once" ||
                count === 2 && "twice" ||
                count === 3 && "thrice" ||
                (count || 0) + " times";
        };

        sinon.calledInOrder = function (spies) {
            for (var i = 1, l = spies.length; i < l; i++) {
                if (!spies[i - 1].calledBefore(spies[i]) || !spies[i].called) {
                    return false;
                }
            }

            return true;
        };

        sinon.orderByFirstCall = function (spies) {
            return spies.sort(function (a, b) {
                // uuid, won't ever be equal
                var aCall = a.getCall(0);
                var bCall = b.getCall(0);
                var aId = aCall && aCall.callId || -1;
                var bId = bCall && bCall.callId || -1;

                return aId < bId ? -1 : 1;
            });
        };

        sinon.createStubInstance = function (constructor) {
            if (typeof constructor !== "function") {
                throw new TypeError("The constructor should be a function.");
            }
            return sinon.stub(sinon.create(constructor.prototype));
        };

        sinon.restore = function (object) {
            if (object !== null && typeof object === "object") {
                for (var prop in object) {
                    if (isRestorable(object[prop])) {
                        object[prop].restore();
                    }
                }
            } else if (isRestorable(object)) {
                object.restore();
            }
        };

        return sinon;
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports) {
        makeApi(exports);
    }

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon // eslint-disable-line no-undef
));

},{}],43:[function(require,module,exports){
/**
 * Minimal Event interface implementation
 *
 * Original implementation by Sven Fuchs: https://gist.github.com/995028
 * Modifications and tests by Christian Johansen.
 *
 * @author Sven Fuchs (svenfuchs@artweb-design.de)
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2011 Sven Fuchs, Christian Johansen
 */
if (typeof sinon === "undefined") {
    this.sinon = {};
}

(function () {
    "use strict";

    var push = [].push;

    function makeApi(sinon) {
        sinon.Event = function Event(type, bubbles, cancelable, target) {
            this.initEvent(type, bubbles, cancelable, target);
        };

        sinon.Event.prototype = {
            initEvent: function (type, bubbles, cancelable, target) {
                this.type = type;
                this.bubbles = bubbles;
                this.cancelable = cancelable;
                this.target = target;
            },

            stopPropagation: function () {},

            preventDefault: function () {
                this.defaultPrevented = true;
            }
        };

        sinon.ProgressEvent = function ProgressEvent(type, progressEventRaw, target) {
            this.initEvent(type, false, false, target);
            this.loaded = typeof progressEventRaw.loaded === "number" ? progressEventRaw.loaded : null;
            this.total = typeof progressEventRaw.total === "number" ? progressEventRaw.total : null;
            this.lengthComputable = !!progressEventRaw.total;
        };

        sinon.ProgressEvent.prototype = new sinon.Event();

        sinon.ProgressEvent.prototype.constructor = sinon.ProgressEvent;

        sinon.CustomEvent = function CustomEvent(type, customData, target) {
            this.initEvent(type, false, false, target);
            this.detail = customData.detail || null;
        };

        sinon.CustomEvent.prototype = new sinon.Event();

        sinon.CustomEvent.prototype.constructor = sinon.CustomEvent;

        sinon.EventTarget = {
            addEventListener: function addEventListener(event, listener) {
                this.eventListeners = this.eventListeners || {};
                this.eventListeners[event] = this.eventListeners[event] || [];
                push.call(this.eventListeners[event], listener);
            },

            removeEventListener: function removeEventListener(event, listener) {
                var listeners = this.eventListeners && this.eventListeners[event] || [];

                for (var i = 0, l = listeners.length; i < l; ++i) {
                    if (listeners[i] === listener) {
                        return listeners.splice(i, 1);
                    }
                }
            },

            dispatchEvent: function dispatchEvent(event) {
                var type = event.type;
                var listeners = this.eventListeners && this.eventListeners[type] || [];

                for (var i = 0; i < listeners.length; i++) {
                    if (typeof listeners[i] === "function") {
                        listeners[i].call(this, event);
                    } else {
                        listeners[i].handleEvent(event);
                    }
                }

                return !!event.defaultPrevented;
            }
        };
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require) {
        var sinon = require("./core");
        makeApi(sinon);
    }

    if (isAMD) {
        define(loadDependencies);
    } else if (isNode) {
        loadDependencies(require);
    } else {
        makeApi(sinon); // eslint-disable-line no-undef
    }
}());

},{"./core":42}],44:[function(require,module,exports){
/**
 * @depend fake_xdomain_request.js
 * @depend fake_xml_http_request.js
 * @depend ../format.js
 * @depend ../log_error.js
 */
/**
 * The Sinon "server" mimics a web server that receives requests from
 * sinon.FakeXMLHttpRequest and provides an API to respond to those requests,
 * both synchronously and asynchronously. To respond synchronuously, canned
 * answers have to be provided upfront.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
(function () {
    "use strict";

    var push = [].push;

    function responseArray(handler) {
        var response = handler;

        if (Object.prototype.toString.call(handler) !== "[object Array]") {
            response = [200, {}, handler];
        }

        if (typeof response[2] !== "string") {
            throw new TypeError("Fake server response body should be string, but was " +
                                typeof response[2]);
        }

        return response;
    }

    var wloc = typeof window !== "undefined" ? window.location : {};
    var rCurrLoc = new RegExp("^" + wloc.protocol + "//" + wloc.host);

    function matchOne(response, reqMethod, reqUrl) {
        var rmeth = response.method;
        var matchMethod = !rmeth || rmeth.toLowerCase() === reqMethod.toLowerCase();
        var url = response.url;
        var matchUrl = !url || url === reqUrl || (typeof url.test === "function" && url.test(reqUrl));

        return matchMethod && matchUrl;
    }

    function match(response, request) {
        var requestUrl = request.url;

        if (!/^https?:\/\//.test(requestUrl) || rCurrLoc.test(requestUrl)) {
            requestUrl = requestUrl.replace(rCurrLoc, "");
        }

        if (matchOne(response, this.getHTTPMethod(request), requestUrl)) {
            if (typeof response.response === "function") {
                var ru = response.url;
                var args = [request].concat(ru && typeof ru.exec === "function" ? ru.exec(requestUrl).slice(1) : []);
                return response.response.apply(response, args);
            }

            return true;
        }

        return false;
    }

    function makeApi(sinon) {
        sinon.fakeServer = {
            create: function (config) {
                var server = sinon.create(this);
                server.configure(config);
                if (!sinon.xhr.supportsCORS) {
                    this.xhr = sinon.useFakeXDomainRequest();
                } else {
                    this.xhr = sinon.useFakeXMLHttpRequest();
                }
                server.requests = [];

                this.xhr.onCreate = function (xhrObj) {
                    server.addRequest(xhrObj);
                };

                return server;
            },
            configure: function (config) {
                var whitelist = {
                    "autoRespond": true,
                    "autoRespondAfter": true,
                    "respondImmediately": true,
                    "fakeHTTPMethods": true
                };
                var setting;

                config = config || {};
                for (setting in config) {
                    if (whitelist.hasOwnProperty(setting) && config.hasOwnProperty(setting)) {
                        this[setting] = config[setting];
                    }
                }
            },
            addRequest: function addRequest(xhrObj) {
                var server = this;
                push.call(this.requests, xhrObj);

                xhrObj.onSend = function () {
                    server.handleRequest(this);

                    if (server.respondImmediately) {
                        server.respond();
                    } else if (server.autoRespond && !server.responding) {
                        setTimeout(function () {
                            server.responding = false;
                            server.respond();
                        }, server.autoRespondAfter || 10);

                        server.responding = true;
                    }
                };
            },

            getHTTPMethod: function getHTTPMethod(request) {
                if (this.fakeHTTPMethods && /post/i.test(request.method)) {
                    var matches = (request.requestBody || "").match(/_method=([^\b;]+)/);
                    return matches ? matches[1] : request.method;
                }

                return request.method;
            },

            handleRequest: function handleRequest(xhr) {
                if (xhr.async) {
                    if (!this.queue) {
                        this.queue = [];
                    }

                    push.call(this.queue, xhr);
                } else {
                    this.processRequest(xhr);
                }
            },

            log: function log(response, request) {
                var str;

                str = "Request:\n" + sinon.format(request) + "\n\n";
                str += "Response:\n" + sinon.format(response) + "\n\n";

                sinon.log(str);
            },

            respondWith: function respondWith(method, url, body) {
                if (arguments.length === 1 && typeof method !== "function") {
                    this.response = responseArray(method);
                    return;
                }

                if (!this.responses) {
                    this.responses = [];
                }

                if (arguments.length === 1) {
                    body = method;
                    url = method = null;
                }

                if (arguments.length === 2) {
                    body = url;
                    url = method;
                    method = null;
                }

                push.call(this.responses, {
                    method: method,
                    url: url,
                    response: typeof body === "function" ? body : responseArray(body)
                });
            },

            respond: function respond() {
                if (arguments.length > 0) {
                    this.respondWith.apply(this, arguments);
                }

                var queue = this.queue || [];
                var requests = queue.splice(0, queue.length);

                for (var i = 0; i < requests.length; i++) {
                    this.processRequest(requests[i]);
                }
            },

            processRequest: function processRequest(request) {
                try {
                    if (request.aborted) {
                        return;
                    }

                    var response = this.response || [404, {}, ""];

                    if (this.responses) {
                        for (var l = this.responses.length, i = l - 1; i >= 0; i--) {
                            if (match.call(this, this.responses[i], request)) {
                                response = this.responses[i].response;
                                break;
                            }
                        }
                    }

                    if (request.readyState !== 4) {
                        this.log(response, request);

                        request.respond(response[0], response[1], response[2]);
                    }
                } catch (e) {
                    sinon.logError("Fake server request processing", e);
                }
            },

            restore: function restore() {
                return this.xhr.restore && this.xhr.restore.apply(this.xhr, arguments);
            }
        };
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports, module) {
        var sinon = require("./core");
        require("./fake_xdomain_request");
        require("./fake_xml_http_request");
        require("../format");
        makeApi(sinon);
        module.exports = sinon;
    }

    if (isAMD) {
        define(loadDependencies);
    } else if (isNode) {
        loadDependencies(require, module.exports, module);
    } else {
        makeApi(sinon); // eslint-disable-line no-undef
    }
}());

},{"../format":31,"./core":42,"./fake_xdomain_request":47,"./fake_xml_http_request":48}],45:[function(require,module,exports){
/**
 * @depend fake_server.js
 * @depend fake_timers.js
 */
/**
 * Add-on for sinon.fakeServer that automatically handles a fake timer along with
 * the FakeXMLHttpRequest. The direct inspiration for this add-on is jQuery
 * 1.3.x, which does not use xhr object's onreadystatehandler at all - instead,
 * it polls the object for completion with setInterval. Dispite the direct
 * motivation, there is nothing jQuery-specific in this file, so it can be used
 * in any environment where the ajax implementation depends on setInterval or
 * setTimeout.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
(function () {
    "use strict";

    function makeApi(sinon) {
        function Server() {}
        Server.prototype = sinon.fakeServer;

        sinon.fakeServerWithClock = new Server();

        sinon.fakeServerWithClock.addRequest = function addRequest(xhr) {
            if (xhr.async) {
                if (typeof setTimeout.clock === "object") {
                    this.clock = setTimeout.clock;
                } else {
                    this.clock = sinon.useFakeTimers();
                    this.resetClock = true;
                }

                if (!this.longestTimeout) {
                    var clockSetTimeout = this.clock.setTimeout;
                    var clockSetInterval = this.clock.setInterval;
                    var server = this;

                    this.clock.setTimeout = function (fn, timeout) {
                        server.longestTimeout = Math.max(timeout, server.longestTimeout || 0);

                        return clockSetTimeout.apply(this, arguments);
                    };

                    this.clock.setInterval = function (fn, timeout) {
                        server.longestTimeout = Math.max(timeout, server.longestTimeout || 0);

                        return clockSetInterval.apply(this, arguments);
                    };
                }
            }

            return sinon.fakeServer.addRequest.call(this, xhr);
        };

        sinon.fakeServerWithClock.respond = function respond() {
            var returnVal = sinon.fakeServer.respond.apply(this, arguments);

            if (this.clock) {
                this.clock.tick(this.longestTimeout || 0);
                this.longestTimeout = 0;

                if (this.resetClock) {
                    this.clock.restore();
                    this.resetClock = false;
                }
            }

            return returnVal;
        };

        sinon.fakeServerWithClock.restore = function restore() {
            if (this.clock) {
                this.clock.restore();
            }

            return sinon.fakeServer.restore.apply(this, arguments);
        };
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require) {
        var sinon = require("./core");
        require("./fake_server");
        require("./fake_timers");
        makeApi(sinon);
    }

    if (isAMD) {
        define(loadDependencies);
    } else if (isNode) {
        loadDependencies(require);
    } else {
        makeApi(sinon); // eslint-disable-line no-undef
    }
}());

},{"./core":42,"./fake_server":44,"./fake_timers":46}],46:[function(require,module,exports){
/**
 * Fake timer API
 * setTimeout
 * setInterval
 * clearTimeout
 * clearInterval
 * tick
 * reset
 * Date
 *
 * Inspired by jsUnitMockTimeOut from JsUnit
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
(function () {
    "use strict";

    function makeApi(s, lol) {
        /*global lolex */
        var llx = typeof lolex !== "undefined" ? lolex : lol;

        s.useFakeTimers = function () {
            var now;
            var methods = Array.prototype.slice.call(arguments);

            if (typeof methods[0] === "string") {
                now = 0;
            } else {
                now = methods.shift();
            }

            var clock = llx.install(now || 0, methods);
            clock.restore = clock.uninstall;
            return clock;
        };

        s.clock = {
            create: function (now) {
                return llx.createClock(now);
            }
        };

        s.timers = {
            setTimeout: setTimeout,
            clearTimeout: clearTimeout,
            setImmediate: (typeof setImmediate !== "undefined" ? setImmediate : undefined),
            clearImmediate: (typeof clearImmediate !== "undefined" ? clearImmediate : undefined),
            setInterval: setInterval,
            clearInterval: clearInterval,
            Date: Date
        };
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, epxorts, module, lolex) {
        var core = require("./core");
        makeApi(core, lolex);
        module.exports = core;
    }

    if (isAMD) {
        define(loadDependencies);
    } else if (isNode) {
        loadDependencies(require, module.exports, module, require("lolex"));
    } else {
        makeApi(sinon); // eslint-disable-line no-undef
    }
}());

},{"./core":42,"lolex":51}],47:[function(require,module,exports){
(function (global){
/**
 * @depend core.js
 * @depend ../extend.js
 * @depend event.js
 * @depend ../log_error.js
 */
/**
 * Fake XDomainRequest object
 */

/**
 * Returns the global to prevent assigning values to 'this' when this is undefined.
 * This can occur when files are interpreted by node in strict mode.
 * @private
 */
function getGlobal() {
    "use strict";

    return typeof window !== "undefined" ? window : global;
}

if (typeof sinon === "undefined") {
    if (typeof this === "undefined") {
        getGlobal().sinon = {};
    } else {
        this.sinon = {};
    }
}

// wrapper for global
(function (global) {
    "use strict";

    var xdr = { XDomainRequest: global.XDomainRequest };
    xdr.GlobalXDomainRequest = global.XDomainRequest;
    xdr.supportsXDR = typeof xdr.GlobalXDomainRequest !== "undefined";
    xdr.workingXDR = xdr.supportsXDR ? xdr.GlobalXDomainRequest : false;

    function makeApi(sinon) {
        sinon.xdr = xdr;

        function FakeXDomainRequest() {
            this.readyState = FakeXDomainRequest.UNSENT;
            this.requestBody = null;
            this.requestHeaders = {};
            this.status = 0;
            this.timeout = null;

            if (typeof FakeXDomainRequest.onCreate === "function") {
                FakeXDomainRequest.onCreate(this);
            }
        }

        function verifyState(x) {
            if (x.readyState !== FakeXDomainRequest.OPENED) {
                throw new Error("INVALID_STATE_ERR");
            }

            if (x.sendFlag) {
                throw new Error("INVALID_STATE_ERR");
            }
        }

        function verifyRequestSent(x) {
            if (x.readyState === FakeXDomainRequest.UNSENT) {
                throw new Error("Request not sent");
            }
            if (x.readyState === FakeXDomainRequest.DONE) {
                throw new Error("Request done");
            }
        }

        function verifyResponseBodyType(body) {
            if (typeof body !== "string") {
                var error = new Error("Attempted to respond to fake XDomainRequest with " +
                                    body + ", which is not a string.");
                error.name = "InvalidBodyException";
                throw error;
            }
        }

        sinon.extend(FakeXDomainRequest.prototype, sinon.EventTarget, {
            open: function open(method, url) {
                this.method = method;
                this.url = url;

                this.responseText = null;
                this.sendFlag = false;

                this.readyStateChange(FakeXDomainRequest.OPENED);
            },

            readyStateChange: function readyStateChange(state) {
                this.readyState = state;
                var eventName = "";
                switch (this.readyState) {
                case FakeXDomainRequest.UNSENT:
                    break;
                case FakeXDomainRequest.OPENED:
                    break;
                case FakeXDomainRequest.LOADING:
                    if (this.sendFlag) {
                        //raise the progress event
                        eventName = "onprogress";
                    }
                    break;
                case FakeXDomainRequest.DONE:
                    if (this.isTimeout) {
                        eventName = "ontimeout";
                    } else if (this.errorFlag || (this.status < 200 || this.status > 299)) {
                        eventName = "onerror";
                    } else {
                        eventName = "onload";
                    }
                    break;
                }

                // raising event (if defined)
                if (eventName) {
                    if (typeof this[eventName] === "function") {
                        try {
                            this[eventName]();
                        } catch (e) {
                            sinon.logError("Fake XHR " + eventName + " handler", e);
                        }
                    }
                }
            },

            send: function send(data) {
                verifyState(this);

                if (!/^(get|head)$/i.test(this.method)) {
                    this.requestBody = data;
                }
                this.requestHeaders["Content-Type"] = "text/plain;charset=utf-8";

                this.errorFlag = false;
                this.sendFlag = true;
                this.readyStateChange(FakeXDomainRequest.OPENED);

                if (typeof this.onSend === "function") {
                    this.onSend(this);
                }
            },

            abort: function abort() {
                this.aborted = true;
                this.responseText = null;
                this.errorFlag = true;

                if (this.readyState > sinon.FakeXDomainRequest.UNSENT && this.sendFlag) {
                    this.readyStateChange(sinon.FakeXDomainRequest.DONE);
                    this.sendFlag = false;
                }
            },

            setResponseBody: function setResponseBody(body) {
                verifyRequestSent(this);
                verifyResponseBodyType(body);

                var chunkSize = this.chunkSize || 10;
                var index = 0;
                this.responseText = "";

                do {
                    this.readyStateChange(FakeXDomainRequest.LOADING);
                    this.responseText += body.substring(index, index + chunkSize);
                    index += chunkSize;
                } while (index < body.length);

                this.readyStateChange(FakeXDomainRequest.DONE);
            },

            respond: function respond(status, contentType, body) {
                // content-type ignored, since XDomainRequest does not carry this
                // we keep the same syntax for respond(...) as for FakeXMLHttpRequest to ease
                // test integration across browsers
                this.status = typeof status === "number" ? status : 200;
                this.setResponseBody(body || "");
            },

            simulatetimeout: function simulatetimeout() {
                this.status = 0;
                this.isTimeout = true;
                // Access to this should actually throw an error
                this.responseText = undefined;
                this.readyStateChange(FakeXDomainRequest.DONE);
            }
        });

        sinon.extend(FakeXDomainRequest, {
            UNSENT: 0,
            OPENED: 1,
            LOADING: 3,
            DONE: 4
        });

        sinon.useFakeXDomainRequest = function useFakeXDomainRequest() {
            sinon.FakeXDomainRequest.restore = function restore(keepOnCreate) {
                if (xdr.supportsXDR) {
                    global.XDomainRequest = xdr.GlobalXDomainRequest;
                }

                delete sinon.FakeXDomainRequest.restore;

                if (keepOnCreate !== true) {
                    delete sinon.FakeXDomainRequest.onCreate;
                }
            };
            if (xdr.supportsXDR) {
                global.XDomainRequest = sinon.FakeXDomainRequest;
            }
            return sinon.FakeXDomainRequest;
        };

        sinon.FakeXDomainRequest = FakeXDomainRequest;
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports, module) {
        var sinon = require("./core");
        require("../extend");
        require("./event");
        require("../log_error");
        makeApi(sinon);
        module.exports = sinon;
    }

    if (isAMD) {
        define(loadDependencies);
    } else if (isNode) {
        loadDependencies(require, module.exports, module);
    } else {
        makeApi(sinon); // eslint-disable-line no-undef
    }
})(typeof global !== "undefined" ? global : self);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../extend":30,"../log_error":32,"./core":42,"./event":43}],48:[function(require,module,exports){
(function (global){
/**
 * @depend core.js
 * @depend ../extend.js
 * @depend event.js
 * @depend ../log_error.js
 */
/**
 * Fake XMLHttpRequest object
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
(function (sinonGlobal, global) {
    "use strict";

    function getWorkingXHR(globalScope) {
        var supportsXHR = typeof globalScope.XMLHttpRequest !== "undefined";
        if (supportsXHR) {
            return globalScope.XMLHttpRequest;
        }

        var supportsActiveX = typeof globalScope.ActiveXObject !== "undefined";
        if (supportsActiveX) {
            return function () {
                return new globalScope.ActiveXObject("MSXML2.XMLHTTP.3.0");
            };
        }

        return false;
    }

    var supportsProgress = typeof ProgressEvent !== "undefined";
    var supportsCustomEvent = typeof CustomEvent !== "undefined";
    var supportsFormData = typeof FormData !== "undefined";
    var supportsArrayBuffer = typeof ArrayBuffer !== "undefined";
    var supportsBlob = (function () {
        try {
            return !!new Blob();
        } catch (e) {
            return false;
        }
    })();
    var sinonXhr = { XMLHttpRequest: global.XMLHttpRequest };
    sinonXhr.GlobalXMLHttpRequest = global.XMLHttpRequest;
    sinonXhr.GlobalActiveXObject = global.ActiveXObject;
    sinonXhr.supportsActiveX = typeof sinonXhr.GlobalActiveXObject !== "undefined";
    sinonXhr.supportsXHR = typeof sinonXhr.GlobalXMLHttpRequest !== "undefined";
    sinonXhr.workingXHR = getWorkingXHR(global);
    sinonXhr.supportsCORS = sinonXhr.supportsXHR && "withCredentials" in (new sinonXhr.GlobalXMLHttpRequest());

    var unsafeHeaders = {
        "Accept-Charset": true,
        "Accept-Encoding": true,
        Connection: true,
        "Content-Length": true,
        Cookie: true,
        Cookie2: true,
        "Content-Transfer-Encoding": true,
        Date: true,
        Expect: true,
        Host: true,
        "Keep-Alive": true,
        Referer: true,
        TE: true,
        Trailer: true,
        "Transfer-Encoding": true,
        Upgrade: true,
        "User-Agent": true,
        Via: true
    };

    // An upload object is created for each
    // FakeXMLHttpRequest and allows upload
    // events to be simulated using uploadProgress
    // and uploadError.
    function UploadProgress() {
        this.eventListeners = {
            abort: [],
            error: [],
            load: [],
            loadend: [],
            progress: []
        };
    }

    UploadProgress.prototype.addEventListener = function addEventListener(event, listener) {
        this.eventListeners[event].push(listener);
    };

    UploadProgress.prototype.removeEventListener = function removeEventListener(event, listener) {
        var listeners = this.eventListeners[event] || [];

        for (var i = 0, l = listeners.length; i < l; ++i) {
            if (listeners[i] === listener) {
                return listeners.splice(i, 1);
            }
        }
    };

    UploadProgress.prototype.dispatchEvent = function dispatchEvent(event) {
        var listeners = this.eventListeners[event.type] || [];

        for (var i = 0, listener; (listener = listeners[i]) != null; i++) {
            listener(event);
        }
    };

    // Note that for FakeXMLHttpRequest to work pre ES5
    // we lose some of the alignment with the spec.
    // To ensure as close a match as possible,
    // set responseType before calling open, send or respond;
    function FakeXMLHttpRequest() {
        this.readyState = FakeXMLHttpRequest.UNSENT;
        this.requestHeaders = {};
        this.requestBody = null;
        this.status = 0;
        this.statusText = "";
        this.upload = new UploadProgress();
        this.responseType = "";
        this.response = "";
        if (sinonXhr.supportsCORS) {
            this.withCredentials = false;
        }

        var xhr = this;
        var events = ["loadstart", "load", "abort", "error", "loadend"];

        function addEventListener(eventName) {
            xhr.addEventListener(eventName, function (event) {
                var listener = xhr["on" + eventName];

                if (listener && typeof listener === "function") {
                    listener.call(this, event);
                }
            });
        }

        for (var i = events.length - 1; i >= 0; i--) {
            addEventListener(events[i]);
        }

        if (typeof FakeXMLHttpRequest.onCreate === "function") {
            FakeXMLHttpRequest.onCreate(this);
        }
    }

    function verifyState(xhr) {
        if (xhr.readyState !== FakeXMLHttpRequest.OPENED) {
            throw new Error("INVALID_STATE_ERR");
        }

        if (xhr.sendFlag) {
            throw new Error("INVALID_STATE_ERR");
        }
    }

    function getHeader(headers, header) {
        header = header.toLowerCase();

        for (var h in headers) {
            if (h.toLowerCase() === header) {
                return h;
            }
        }

        return null;
    }

    // filtering to enable a white-list version of Sinon FakeXhr,
    // where whitelisted requests are passed through to real XHR
    function each(collection, callback) {
        if (!collection) {
            return;
        }

        for (var i = 0, l = collection.length; i < l; i += 1) {
            callback(collection[i]);
        }
    }
    function some(collection, callback) {
        for (var index = 0; index < collection.length; index++) {
            if (callback(collection[index]) === true) {
                return true;
            }
        }
        return false;
    }
    // largest arity in XHR is 5 - XHR#open
    var apply = function (obj, method, args) {
        switch (args.length) {
        case 0: return obj[method]();
        case 1: return obj[method](args[0]);
        case 2: return obj[method](args[0], args[1]);
        case 3: return obj[method](args[0], args[1], args[2]);
        case 4: return obj[method](args[0], args[1], args[2], args[3]);
        case 5: return obj[method](args[0], args[1], args[2], args[3], args[4]);
        }
    };

    FakeXMLHttpRequest.filters = [];
    FakeXMLHttpRequest.addFilter = function addFilter(fn) {
        this.filters.push(fn);
    };
    var IE6Re = /MSIE 6/;
    FakeXMLHttpRequest.defake = function defake(fakeXhr, xhrArgs) {
        var xhr = new sinonXhr.workingXHR(); // eslint-disable-line new-cap

        each([
            "open",
            "setRequestHeader",
            "send",
            "abort",
            "getResponseHeader",
            "getAllResponseHeaders",
            "addEventListener",
            "overrideMimeType",
            "removeEventListener"
        ], function (method) {
            fakeXhr[method] = function () {
                return apply(xhr, method, arguments);
            };
        });

        var copyAttrs = function (args) {
            each(args, function (attr) {
                try {
                    fakeXhr[attr] = xhr[attr];
                } catch (e) {
                    if (!IE6Re.test(navigator.userAgent)) {
                        throw e;
                    }
                }
            });
        };

        var stateChange = function stateChange() {
            fakeXhr.readyState = xhr.readyState;
            if (xhr.readyState >= FakeXMLHttpRequest.HEADERS_RECEIVED) {
                copyAttrs(["status", "statusText"]);
            }
            if (xhr.readyState >= FakeXMLHttpRequest.LOADING) {
                copyAttrs(["responseText", "response"]);
            }
            if (xhr.readyState === FakeXMLHttpRequest.DONE) {
                copyAttrs(["responseXML"]);
            }
            if (fakeXhr.onreadystatechange) {
                fakeXhr.onreadystatechange.call(fakeXhr, { target: fakeXhr });
            }
        };

        if (xhr.addEventListener) {
            for (var event in fakeXhr.eventListeners) {
                if (fakeXhr.eventListeners.hasOwnProperty(event)) {

                    /*eslint-disable no-loop-func*/
                    each(fakeXhr.eventListeners[event], function (handler) {
                        xhr.addEventListener(event, handler);
                    });
                    /*eslint-enable no-loop-func*/
                }
            }
            xhr.addEventListener("readystatechange", stateChange);
        } else {
            xhr.onreadystatechange = stateChange;
        }
        apply(xhr, "open", xhrArgs);
    };
    FakeXMLHttpRequest.useFilters = false;

    function verifyRequestOpened(xhr) {
        if (xhr.readyState !== FakeXMLHttpRequest.OPENED) {
            throw new Error("INVALID_STATE_ERR - " + xhr.readyState);
        }
    }

    function verifyRequestSent(xhr) {
        if (xhr.readyState === FakeXMLHttpRequest.DONE) {
            throw new Error("Request done");
        }
    }

    function verifyHeadersReceived(xhr) {
        if (xhr.async && xhr.readyState !== FakeXMLHttpRequest.HEADERS_RECEIVED) {
            throw new Error("No headers received");
        }
    }

    function verifyResponseBodyType(body) {
        if (typeof body !== "string") {
            var error = new Error("Attempted to respond to fake XMLHttpRequest with " +
                                 body + ", which is not a string.");
            error.name = "InvalidBodyException";
            throw error;
        }
    }

    function convertToArrayBuffer(body) {
        var buffer = new ArrayBuffer(body.length);
        var view = new Uint8Array(buffer);
        for (var i = 0; i < body.length; i++) {
            var charCode = body.charCodeAt(i);
            if (charCode >= 256) {
                throw new TypeError("arraybuffer or blob responseTypes require binary string, " +
                                    "invalid character " + body[i] + " found.");
            }
            view[i] = charCode;
        }
        return buffer;
    }

    function isXmlContentType(contentType) {
        return !contentType || /(text\/xml)|(application\/xml)|(\+xml)/.test(contentType);
    }

    function convertResponseBody(responseType, contentType, body) {
        if (responseType === "" || responseType === "text") {
            return body;
        } else if (supportsArrayBuffer && responseType === "arraybuffer") {
            return convertToArrayBuffer(body);
        } else if (responseType === "json") {
            try {
                return JSON.parse(body);
            } catch (e) {
                // Return parsing failure as null
                return null;
            }
        } else if (supportsBlob && responseType === "blob") {
            var blobOptions = {};
            if (contentType) {
                blobOptions.type = contentType;
            }
            return new Blob([convertToArrayBuffer(body)], blobOptions);
        } else if (responseType === "document") {
            if (isXmlContentType(contentType)) {
                return FakeXMLHttpRequest.parseXML(body);
            }
            return null;
        }
        throw new Error("Invalid responseType " + responseType);
    }

    function clearResponse(xhr) {
        if (xhr.responseType === "" || xhr.responseType === "text") {
            xhr.response = xhr.responseText = "";
        } else {
            xhr.response = xhr.responseText = null;
        }
        xhr.responseXML = null;
    }

    FakeXMLHttpRequest.parseXML = function parseXML(text) {
        // Treat empty string as parsing failure
        if (text !== "") {
            try {
                if (typeof DOMParser !== "undefined") {
                    var parser = new DOMParser();
                    return parser.parseFromString(text, "text/xml");
                }
                var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
                xmlDoc.async = "false";
                xmlDoc.loadXML(text);
                return xmlDoc;
            } catch (e) {
                // Unable to parse XML - no biggie
            }
        }

        return null;
    };

    FakeXMLHttpRequest.statusCodes = {
        100: "Continue",
        101: "Switching Protocols",
        200: "OK",
        201: "Created",
        202: "Accepted",
        203: "Non-Authoritative Information",
        204: "No Content",
        205: "Reset Content",
        206: "Partial Content",
        207: "Multi-Status",
        300: "Multiple Choice",
        301: "Moved Permanently",
        302: "Found",
        303: "See Other",
        304: "Not Modified",
        305: "Use Proxy",
        307: "Temporary Redirect",
        400: "Bad Request",
        401: "Unauthorized",
        402: "Payment Required",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        406: "Not Acceptable",
        407: "Proxy Authentication Required",
        408: "Request Timeout",
        409: "Conflict",
        410: "Gone",
        411: "Length Required",
        412: "Precondition Failed",
        413: "Request Entity Too Large",
        414: "Request-URI Too Long",
        415: "Unsupported Media Type",
        416: "Requested Range Not Satisfiable",
        417: "Expectation Failed",
        422: "Unprocessable Entity",
        500: "Internal Server Error",
        501: "Not Implemented",
        502: "Bad Gateway",
        503: "Service Unavailable",
        504: "Gateway Timeout",
        505: "HTTP Version Not Supported"
    };

    function makeApi(sinon) {
        sinon.xhr = sinonXhr;

        sinon.extend(FakeXMLHttpRequest.prototype, sinon.EventTarget, {
            async: true,

            open: function open(method, url, async, username, password) {
                this.method = method;
                this.url = url;
                this.async = typeof async === "boolean" ? async : true;
                this.username = username;
                this.password = password;
                clearResponse(this);
                this.requestHeaders = {};
                this.sendFlag = false;

                if (FakeXMLHttpRequest.useFilters === true) {
                    var xhrArgs = arguments;
                    var defake = some(FakeXMLHttpRequest.filters, function (filter) {
                        return filter.apply(this, xhrArgs);
                    });
                    if (defake) {
                        return FakeXMLHttpRequest.defake(this, arguments);
                    }
                }
                this.readyStateChange(FakeXMLHttpRequest.OPENED);
            },

            readyStateChange: function readyStateChange(state) {
                this.readyState = state;

                var readyStateChangeEvent = new sinon.Event("readystatechange", false, false, this);
                var event, progress;

                if (typeof this.onreadystatechange === "function") {
                    try {
                        this.onreadystatechange(readyStateChangeEvent);
                    } catch (e) {
                        sinon.logError("Fake XHR onreadystatechange handler", e);
                    }
                }

                if (this.readyState === FakeXMLHttpRequest.DONE) {
                    // ensure loaded and total are numbers
                    progress = {
                      loaded: this.progress || 0,
                      total: this.progress || 0
                    };

                    if (this.status === 0) {
                        event = this.aborted ? "abort" : "error";
                    }
                    else {
                        event = "load";
                    }

                    if (supportsProgress) {
                        this.upload.dispatchEvent(new sinon.ProgressEvent("progress", progress, this));
                        this.upload.dispatchEvent(new sinon.ProgressEvent(event, progress, this));
                        this.upload.dispatchEvent(new sinon.ProgressEvent("loadend", progress, this));
                    }

                    this.dispatchEvent(new sinon.ProgressEvent("progress", progress, this));
                    this.dispatchEvent(new sinon.ProgressEvent(event, progress, this));
                    this.dispatchEvent(new sinon.ProgressEvent("loadend", progress, this));
                }

                this.dispatchEvent(readyStateChangeEvent);
            },

            setRequestHeader: function setRequestHeader(header, value) {
                verifyState(this);

                if (unsafeHeaders[header] || /^(Sec-|Proxy-)/.test(header)) {
                    throw new Error("Refused to set unsafe header \"" + header + "\"");
                }

                if (this.requestHeaders[header]) {
                    this.requestHeaders[header] += "," + value;
                } else {
                    this.requestHeaders[header] = value;
                }
            },

            // Helps testing
            setResponseHeaders: function setResponseHeaders(headers) {
                verifyRequestOpened(this);
                this.responseHeaders = {};

                for (var header in headers) {
                    if (headers.hasOwnProperty(header)) {
                        this.responseHeaders[header] = headers[header];
                    }
                }

                if (this.async) {
                    this.readyStateChange(FakeXMLHttpRequest.HEADERS_RECEIVED);
                } else {
                    this.readyState = FakeXMLHttpRequest.HEADERS_RECEIVED;
                }
            },

            // Currently treats ALL data as a DOMString (i.e. no Document)
            send: function send(data) {
                verifyState(this);

                if (!/^(get|head)$/i.test(this.method)) {
                    var contentType = getHeader(this.requestHeaders, "Content-Type");
                    if (this.requestHeaders[contentType]) {
                        var value = this.requestHeaders[contentType].split(";");
                        this.requestHeaders[contentType] = value[0] + ";charset=utf-8";
                    } else if (supportsFormData && !(data instanceof FormData)) {
                        this.requestHeaders["Content-Type"] = "text/plain;charset=utf-8";
                    }

                    this.requestBody = data;
                }

                this.errorFlag = false;
                this.sendFlag = this.async;
                clearResponse(this);
                this.readyStateChange(FakeXMLHttpRequest.OPENED);

                if (typeof this.onSend === "function") {
                    this.onSend(this);
                }

                this.dispatchEvent(new sinon.Event("loadstart", false, false, this));
            },

            abort: function abort() {
                this.aborted = true;
                clearResponse(this);
                this.errorFlag = true;
                this.requestHeaders = {};
                this.responseHeaders = {};

                if (this.readyState > FakeXMLHttpRequest.UNSENT && this.sendFlag) {
                    this.readyStateChange(FakeXMLHttpRequest.DONE);
                    this.sendFlag = false;
                }

                this.readyState = FakeXMLHttpRequest.UNSENT;
            },

            error: function error() {
                clearResponse(this);
                this.errorFlag = true;
                this.requestHeaders = {};
                this.responseHeaders = {};

                this.readyStateChange(FakeXMLHttpRequest.DONE);
            },

            getResponseHeader: function getResponseHeader(header) {
                if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
                    return null;
                }

                if (/^Set-Cookie2?$/i.test(header)) {
                    return null;
                }

                header = getHeader(this.responseHeaders, header);

                return this.responseHeaders[header] || null;
            },

            getAllResponseHeaders: function getAllResponseHeaders() {
                if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
                    return "";
                }

                var headers = "";

                for (var header in this.responseHeaders) {
                    if (this.responseHeaders.hasOwnProperty(header) &&
                        !/^Set-Cookie2?$/i.test(header)) {
                        headers += header + ": " + this.responseHeaders[header] + "\r\n";
                    }
                }

                return headers;
            },

            setResponseBody: function setResponseBody(body) {
                verifyRequestSent(this);
                verifyHeadersReceived(this);
                verifyResponseBodyType(body);
                var contentType = this.getResponseHeader("Content-Type");

                var isTextResponse = this.responseType === "" || this.responseType === "text";
                clearResponse(this);
                if (this.async) {
                    var chunkSize = this.chunkSize || 10;
                    var index = 0;

                    do {
                        this.readyStateChange(FakeXMLHttpRequest.LOADING);

                        if (isTextResponse) {
                            this.responseText = this.response += body.substring(index, index + chunkSize);
                        }
                        index += chunkSize;
                    } while (index < body.length);
                }

                this.response = convertResponseBody(this.responseType, contentType, body);
                if (isTextResponse) {
                    this.responseText = this.response;
                }

                if (this.responseType === "document") {
                    this.responseXML = this.response;
                } else if (this.responseType === "" && isXmlContentType(contentType)) {
                    this.responseXML = FakeXMLHttpRequest.parseXML(this.responseText);
                }
                this.progress = body.length;
                this.readyStateChange(FakeXMLHttpRequest.DONE);
            },

            respond: function respond(status, headers, body) {
                this.status = typeof status === "number" ? status : 200;
                this.statusText = FakeXMLHttpRequest.statusCodes[this.status];
                this.setResponseHeaders(headers || {});
                this.setResponseBody(body || "");
            },

            uploadProgress: function uploadProgress(progressEventRaw) {
                if (supportsProgress) {
                    this.upload.dispatchEvent(new sinon.ProgressEvent("progress", progressEventRaw));
                }
            },

            downloadProgress: function downloadProgress(progressEventRaw) {
                if (supportsProgress) {
                    this.dispatchEvent(new sinon.ProgressEvent("progress", progressEventRaw));
                }
            },

            uploadError: function uploadError(error) {
                if (supportsCustomEvent) {
                    this.upload.dispatchEvent(new sinon.CustomEvent("error", {detail: error}));
                }
            }
        });

        sinon.extend(FakeXMLHttpRequest, {
            UNSENT: 0,
            OPENED: 1,
            HEADERS_RECEIVED: 2,
            LOADING: 3,
            DONE: 4
        });

        sinon.useFakeXMLHttpRequest = function () {
            FakeXMLHttpRequest.restore = function restore(keepOnCreate) {
                if (sinonXhr.supportsXHR) {
                    global.XMLHttpRequest = sinonXhr.GlobalXMLHttpRequest;
                }

                if (sinonXhr.supportsActiveX) {
                    global.ActiveXObject = sinonXhr.GlobalActiveXObject;
                }

                delete FakeXMLHttpRequest.restore;

                if (keepOnCreate !== true) {
                    delete FakeXMLHttpRequest.onCreate;
                }
            };
            if (sinonXhr.supportsXHR) {
                global.XMLHttpRequest = FakeXMLHttpRequest;
            }

            if (sinonXhr.supportsActiveX) {
                global.ActiveXObject = function ActiveXObject(objId) {
                    if (objId === "Microsoft.XMLHTTP" || /^Msxml2\.XMLHTTP/i.test(objId)) {

                        return new FakeXMLHttpRequest();
                    }

                    return new sinonXhr.GlobalActiveXObject(objId);
                };
            }

            return FakeXMLHttpRequest;
        };

        sinon.FakeXMLHttpRequest = FakeXMLHttpRequest;
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports, module) {
        var sinon = require("./core");
        require("../extend");
        require("./event");
        require("../log_error");
        makeApi(sinon);
        module.exports = sinon;
    }

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon, // eslint-disable-line no-undef
    typeof global !== "undefined" ? global : self
));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../extend":30,"../log_error":32,"./core":42,"./event":43}],49:[function(require,module,exports){
/**
 * @depend util/core.js
 */
(function (sinonGlobal) {
    "use strict";

    function makeApi(sinon) {
        function walkInternal(obj, iterator, context, originalObj, seen) {
            var proto, prop;

            if (typeof Object.getOwnPropertyNames !== "function") {
                // We explicitly want to enumerate through all of the prototype's properties
                // in this case, therefore we deliberately leave out an own property check.
                /* eslint-disable guard-for-in */
                for (prop in obj) {
                    iterator.call(context, obj[prop], prop, obj);
                }
                /* eslint-enable guard-for-in */

                return;
            }

            Object.getOwnPropertyNames(obj).forEach(function (k) {
                if (seen[k] !== true) {
                    seen[k] = true;
                    var target = typeof Object.getOwnPropertyDescriptor(obj, k).get === "function" ?
                        originalObj : obj;
                    iterator.call(context, target[k], k, target);
                }
            });

            proto = Object.getPrototypeOf(obj);
            if (proto) {
                walkInternal(proto, iterator, context, originalObj, seen);
            }
        }

        /* Public: walks the prototype chain of an object and iterates over every own property
         * name encountered. The iterator is called in the same fashion that Array.prototype.forEach
         * works, where it is passed the value, key, and own object as the 1st, 2nd, and 3rd positional
         * argument, respectively. In cases where Object.getOwnPropertyNames is not available, walk will
         * default to using a simple for..in loop.
         *
         * obj - The object to walk the prototype chain for.
         * iterator - The function to be called on each pass of the walk.
         * context - (Optional) When given, the iterator will be called with this object as the receiver.
         */
        function walk(obj, iterator, context) {
            return walkInternal(obj, iterator, context, obj, {});
        }

        sinon.walk = walk;
        return sinon.walk;
    }

    function loadDependencies(require, exports, module) {
        var sinon = require("./util/core");
        module.exports = makeApi(sinon);
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    if (isAMD) {
        define(loadDependencies);
        return;
    }

    if (isNode) {
        loadDependencies(require, module.exports, module);
        return;
    }

    if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(
    typeof sinon === "object" && sinon // eslint-disable-line no-undef
));

},{"./util/core":42}],50:[function(require,module,exports){
(function (global){
((typeof define === "function" && define.amd && function (m) {
    define("formatio", ["samsam"], m);
}) || (typeof module === "object" && function (m) {
    module.exports = m(require("samsam"));
}) || function (m) { this.formatio = m(this.samsam); }
)(function (samsam) {
    "use strict";

    var formatio = {
        excludeConstructors: ["Object", /^.$/],
        quoteStrings: true,
        limitChildrenCount: 0
    };

    var hasOwn = Object.prototype.hasOwnProperty;

    var specialObjects = [];
    if (typeof global !== "undefined") {
        specialObjects.push({ object: global, value: "[object global]" });
    }
    if (typeof document !== "undefined") {
        specialObjects.push({
            object: document,
            value: "[object HTMLDocument]"
        });
    }
    if (typeof window !== "undefined") {
        specialObjects.push({ object: window, value: "[object Window]" });
    }

    function functionName(func) {
        if (!func) { return ""; }
        if (func.displayName) { return func.displayName; }
        if (func.name) { return func.name; }
        var matches = func.toString().match(/function\s+([^\(]+)/m);
        return (matches && matches[1]) || "";
    }

    function constructorName(f, object) {
        var name = functionName(object && object.constructor);
        var excludes = f.excludeConstructors ||
                formatio.excludeConstructors || [];

        var i, l;
        for (i = 0, l = excludes.length; i < l; ++i) {
            if (typeof excludes[i] === "string" && excludes[i] === name) {
                return "";
            } else if (excludes[i].test && excludes[i].test(name)) {
                return "";
            }
        }

        return name;
    }

    function isCircular(object, objects) {
        if (typeof object !== "object") { return false; }
        var i, l;
        for (i = 0, l = objects.length; i < l; ++i) {
            if (objects[i] === object) { return true; }
        }
        return false;
    }

    function ascii(f, object, processed, indent) {
        if (typeof object === "string") {
            var qs = f.quoteStrings;
            var quote = typeof qs !== "boolean" || qs;
            return processed || quote ? '"' + object + '"' : object;
        }

        if (typeof object === "function" && !(object instanceof RegExp)) {
            return ascii.func(object);
        }

        processed = processed || [];

        if (isCircular(object, processed)) { return "[Circular]"; }

        if (Object.prototype.toString.call(object) === "[object Array]") {
            return ascii.array.call(f, object, processed);
        }

        if (!object) { return String((1/object) === -Infinity ? "-0" : object); }
        if (samsam.isElement(object)) { return ascii.element(object); }

        if (typeof object.toString === "function" &&
                object.toString !== Object.prototype.toString) {
            return object.toString();
        }

        var i, l;
        for (i = 0, l = specialObjects.length; i < l; i++) {
            if (object === specialObjects[i].object) {
                return specialObjects[i].value;
            }
        }

        return ascii.object.call(f, object, processed, indent);
    }

    ascii.func = function (func) {
        return "function " + functionName(func) + "() {}";
    };

    ascii.array = function (array, processed) {
        processed = processed || [];
        processed.push(array);
        var pieces = [];
        var i, l;
        l = (this.limitChildrenCount > 0) ? 
            Math.min(this.limitChildrenCount, array.length) : array.length;

        for (i = 0; i < l; ++i) {
            pieces.push(ascii(this, array[i], processed));
        }

        if(l < array.length)
            pieces.push("[... " + (array.length - l) + " more elements]");

        return "[" + pieces.join(", ") + "]";
    };

    ascii.object = function (object, processed, indent) {
        processed = processed || [];
        processed.push(object);
        indent = indent || 0;
        var pieces = [], properties = samsam.keys(object).sort();
        var length = 3;
        var prop, str, obj, i, k, l;
        l = (this.limitChildrenCount > 0) ? 
            Math.min(this.limitChildrenCount, properties.length) : properties.length;

        for (i = 0; i < l; ++i) {
            prop = properties[i];
            obj = object[prop];

            if (isCircular(obj, processed)) {
                str = "[Circular]";
            } else {
                str = ascii(this, obj, processed, indent + 2);
            }

            str = (/\s/.test(prop) ? '"' + prop + '"' : prop) + ": " + str;
            length += str.length;
            pieces.push(str);
        }

        var cons = constructorName(this, object);
        var prefix = cons ? "[" + cons + "] " : "";
        var is = "";
        for (i = 0, k = indent; i < k; ++i) { is += " "; }

        if(l < properties.length)
            pieces.push("[... " + (properties.length - l) + " more elements]");

        if (length + indent > 80) {
            return prefix + "{\n  " + is + pieces.join(",\n  " + is) + "\n" +
                is + "}";
        }
        return prefix + "{ " + pieces.join(", ") + " }";
    };

    ascii.element = function (element) {
        var tagName = element.tagName.toLowerCase();
        var attrs = element.attributes, attr, pairs = [], attrName, i, l, val;

        for (i = 0, l = attrs.length; i < l; ++i) {
            attr = attrs.item(i);
            attrName = attr.nodeName.toLowerCase().replace("html:", "");
            val = attr.nodeValue;
            if (attrName !== "contenteditable" || val !== "inherit") {
                if (!!val) { pairs.push(attrName + "=\"" + val + "\""); }
            }
        }

        var formatted = "<" + tagName + (pairs.length > 0 ? " " : "");
        var content = element.innerHTML;

        if (content.length > 20) {
            content = content.substr(0, 20) + "[...]";
        }

        var res = formatted + pairs.join(" ") + ">" + content +
                "</" + tagName + ">";

        return res.replace(/ contentEditable="inherit"/, "");
    };

    function Formatio(options) {
        for (var opt in options) {
            this[opt] = options[opt];
        }
    }

    Formatio.prototype = {
        functionName: functionName,

        configure: function (options) {
            return new Formatio(options);
        },

        constructorName: function (object) {
            return constructorName(this, object);
        },

        ascii: function (object, processed, indent) {
            return ascii(this, object, processed, indent);
        }
    };

    return Formatio.prototype;
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"samsam":52}],51:[function(require,module,exports){
(function (global){
/*global global, window*/
/**
 * @author Christian Johansen (christian@cjohansen.no) and contributors
 * @license BSD
 *
 * Copyright (c) 2010-2014 Christian Johansen
 */

(function (global) {
    "use strict";

    // Make properties writable in IE, as per
    // http://www.adequatelygood.com/Replacing-setTimeout-Globally.html
    // JSLint being anal
    var glbl = global;

    global.setTimeout = glbl.setTimeout;
    global.clearTimeout = glbl.clearTimeout;
    global.setInterval = glbl.setInterval;
    global.clearInterval = glbl.clearInterval;
    global.Date = glbl.Date;

    // setImmediate is not a standard function
    // avoid adding the prop to the window object if not present
    if('setImmediate' in global) {
        global.setImmediate = glbl.setImmediate;
        global.clearImmediate = glbl.clearImmediate;
    }

    // node expects setTimeout/setInterval to return a fn object w/ .ref()/.unref()
    // browsers, a number.
    // see https://github.com/cjohansen/Sinon.JS/pull/436

    var NOOP = function () { return undefined; };
    var timeoutResult = setTimeout(NOOP, 0);
    var addTimerReturnsObject = typeof timeoutResult === "object";
    clearTimeout(timeoutResult);

    var NativeDate = Date;
    var uniqueTimerId = 1;

    /**
     * Parse strings like "01:10:00" (meaning 1 hour, 10 minutes, 0 seconds) into
     * number of milliseconds. This is used to support human-readable strings passed
     * to clock.tick()
     */
    function parseTime(str) {
        if (!str) {
            return 0;
        }

        var strings = str.split(":");
        var l = strings.length, i = l;
        var ms = 0, parsed;

        if (l > 3 || !/^(\d\d:){0,2}\d\d?$/.test(str)) {
            throw new Error("tick only understands numbers and 'h:m:s'");
        }

        while (i--) {
            parsed = parseInt(strings[i], 10);

            if (parsed >= 60) {
                throw new Error("Invalid time " + str);
            }

            ms += parsed * Math.pow(60, (l - i - 1));
        }

        return ms * 1000;
    }

    /**
     * Used to grok the `now` parameter to createClock.
     */
    function getEpoch(epoch) {
        if (!epoch) { return 0; }
        if (typeof epoch.getTime === "function") { return epoch.getTime(); }
        if (typeof epoch === "number") { return epoch; }
        throw new TypeError("now should be milliseconds since UNIX epoch");
    }

    function inRange(from, to, timer) {
        return timer && timer.callAt >= from && timer.callAt <= to;
    }

    function mirrorDateProperties(target, source) {
        var prop;
        for (prop in source) {
            if (source.hasOwnProperty(prop)) {
                target[prop] = source[prop];
            }
        }

        // set special now implementation
        if (source.now) {
            target.now = function now() {
                return target.clock.now;
            };
        } else {
            delete target.now;
        }

        // set special toSource implementation
        if (source.toSource) {
            target.toSource = function toSource() {
                return source.toSource();
            };
        } else {
            delete target.toSource;
        }

        // set special toString implementation
        target.toString = function toString() {
            return source.toString();
        };

        target.prototype = source.prototype;
        target.parse = source.parse;
        target.UTC = source.UTC;
        target.prototype.toUTCString = source.prototype.toUTCString;

        return target;
    }

    function createDate() {
        function ClockDate(year, month, date, hour, minute, second, ms) {
            // Defensive and verbose to avoid potential harm in passing
            // explicit undefined when user does not pass argument
            switch (arguments.length) {
            case 0:
                return new NativeDate(ClockDate.clock.now);
            case 1:
                return new NativeDate(year);
            case 2:
                return new NativeDate(year, month);
            case 3:
                return new NativeDate(year, month, date);
            case 4:
                return new NativeDate(year, month, date, hour);
            case 5:
                return new NativeDate(year, month, date, hour, minute);
            case 6:
                return new NativeDate(year, month, date, hour, minute, second);
            default:
                return new NativeDate(year, month, date, hour, minute, second, ms);
            }
        }

        return mirrorDateProperties(ClockDate, NativeDate);
    }

    function addTimer(clock, timer) {
        if (timer.func === undefined) {
            throw new Error("Callback must be provided to timer calls");
        }

        if (!clock.timers) {
            clock.timers = {};
        }

        timer.id = uniqueTimerId++;
        timer.createdAt = clock.now;
        timer.callAt = clock.now + (timer.delay || (clock.duringTick ? 1 : 0));

        clock.timers[timer.id] = timer;

        if (addTimerReturnsObject) {
            return {
                id: timer.id,
                ref: NOOP,
                unref: NOOP
            };
        }

        return timer.id;
    }


    function compareTimers(a, b) {
        // Sort first by absolute timing
        if (a.callAt < b.callAt) {
            return -1;
        }
        if (a.callAt > b.callAt) {
            return 1;
        }

        // Sort next by immediate, immediate timers take precedence
        if (a.immediate && !b.immediate) {
            return -1;
        }
        if (!a.immediate && b.immediate) {
            return 1;
        }

        // Sort next by creation time, earlier-created timers take precedence
        if (a.createdAt < b.createdAt) {
            return -1;
        }
        if (a.createdAt > b.createdAt) {
            return 1;
        }

        // Sort next by id, lower-id timers take precedence
        if (a.id < b.id) {
            return -1;
        }
        if (a.id > b.id) {
            return 1;
        }

        // As timer ids are unique, no fallback `0` is necessary
    }

    function firstTimerInRange(clock, from, to) {
        var timers = clock.timers,
            timer = null,
            id,
            isInRange;

        for (id in timers) {
            if (timers.hasOwnProperty(id)) {
                isInRange = inRange(from, to, timers[id]);

                if (isInRange && (!timer || compareTimers(timer, timers[id]) === 1)) {
                    timer = timers[id];
                }
            }
        }

        return timer;
    }

    function callTimer(clock, timer) {
        var exception;

        if (typeof timer.interval === "number") {
            clock.timers[timer.id].callAt += timer.interval;
        } else {
            delete clock.timers[timer.id];
        }

        try {
            if (typeof timer.func === "function") {
                timer.func.apply(null, timer.args);
            } else {
                eval(timer.func);
            }
        } catch (e) {
            exception = e;
        }

        if (!clock.timers[timer.id]) {
            if (exception) {
                throw exception;
            }
            return;
        }

        if (exception) {
            throw exception;
        }
    }

    function timerType(timer) {
        if (timer.immediate) {
            return "Immediate";
        } else if (typeof timer.interval !== "undefined") {
            return "Interval";
        } else {
            return "Timeout";
        }
    }

    function clearTimer(clock, timerId, ttype) {
        if (!timerId) {
            // null appears to be allowed in most browsers, and appears to be
            // relied upon by some libraries, like Bootstrap carousel
            return;
        }

        if (!clock.timers) {
            clock.timers = [];
        }

        // in Node, timerId is an object with .ref()/.unref(), and
        // its .id field is the actual timer id.
        if (typeof timerId === "object") {
            timerId = timerId.id;
        }

        if (clock.timers.hasOwnProperty(timerId)) {
            // check that the ID matches a timer of the correct type
            var timer = clock.timers[timerId];
            if (timerType(timer) === ttype) {
                delete clock.timers[timerId];
            } else {
				throw new Error("Cannot clear timer: timer created with set" + ttype + "() but cleared with clear" + timerType(timer) + "()");
			}
        }
    }

    function uninstall(clock, target) {
        var method,
            i,
            l;

        for (i = 0, l = clock.methods.length; i < l; i++) {
            method = clock.methods[i];

            if (target[method].hadOwnProperty) {
                target[method] = clock["_" + method];
            } else {
                try {
                    delete target[method];
                } catch (ignore) {}
            }
        }

        // Prevent multiple executions which will completely remove these props
        clock.methods = [];
    }

    function hijackMethod(target, method, clock) {
        var prop;

        clock[method].hadOwnProperty = Object.prototype.hasOwnProperty.call(target, method);
        clock["_" + method] = target[method];

        if (method === "Date") {
            var date = mirrorDateProperties(clock[method], target[method]);
            target[method] = date;
        } else {
            target[method] = function () {
                return clock[method].apply(clock, arguments);
            };

            for (prop in clock[method]) {
                if (clock[method].hasOwnProperty(prop)) {
                    target[method][prop] = clock[method][prop];
                }
            }
        }

        target[method].clock = clock;
    }

    var timers = {
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setImmediate: global.setImmediate,
        clearImmediate: global.clearImmediate,
        setInterval: setInterval,
        clearInterval: clearInterval,
        Date: Date
    };

    var keys = Object.keys || function (obj) {
        var ks = [],
            key;

        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                ks.push(key);
            }
        }

        return ks;
    };

    exports.timers = timers;

    function createClock(now) {
        var clock = {
            now: getEpoch(now),
            timeouts: {},
            Date: createDate()
        };

        clock.Date.clock = clock;

        clock.setTimeout = function setTimeout(func, timeout) {
            return addTimer(clock, {
                func: func,
                args: Array.prototype.slice.call(arguments, 2),
                delay: timeout
            });
        };

        clock.clearTimeout = function clearTimeout(timerId) {
            return clearTimer(clock, timerId, "Timeout");
        };

        clock.setInterval = function setInterval(func, timeout) {
            return addTimer(clock, {
                func: func,
                args: Array.prototype.slice.call(arguments, 2),
                delay: timeout,
                interval: timeout
            });
        };

        clock.clearInterval = function clearInterval(timerId) {
            return clearTimer(clock, timerId, "Interval");
        };

        clock.setImmediate = function setImmediate(func) {
            return addTimer(clock, {
                func: func,
                args: Array.prototype.slice.call(arguments, 1),
                immediate: true
            });
        };

        clock.clearImmediate = function clearImmediate(timerId) {
            return clearTimer(clock, timerId, "Immediate");
        };

        clock.tick = function tick(ms) {
            ms = typeof ms === "number" ? ms : parseTime(ms);
            var tickFrom = clock.now, tickTo = clock.now + ms, previous = clock.now;
            var timer = firstTimerInRange(clock, tickFrom, tickTo);
            var oldNow;

            clock.duringTick = true;

            var firstException;
            while (timer && tickFrom <= tickTo) {
                if (clock.timers[timer.id]) {
                    tickFrom = clock.now = timer.callAt;
                    try {
                        oldNow = clock.now;
                        callTimer(clock, timer);
                        // compensate for any setSystemTime() call during timer callback
                        if (oldNow !== clock.now) {
                            tickFrom += clock.now - oldNow;
                            tickTo += clock.now - oldNow;
                            previous += clock.now - oldNow;
                        }
                    } catch (e) {
                        firstException = firstException || e;
                    }
                }

                timer = firstTimerInRange(clock, previous, tickTo);
                previous = tickFrom;
            }

            clock.duringTick = false;
            clock.now = tickTo;

            if (firstException) {
                throw firstException;
            }

            return clock.now;
        };

        clock.reset = function reset() {
            clock.timers = {};
        };

        clock.setSystemTime = function setSystemTime(now) {
            // determine time difference
            var newNow = getEpoch(now);
            var difference = newNow - clock.now;

            // update 'system clock'
            clock.now = newNow;

            // update timers and intervals to keep them stable
            for (var id in clock.timers) {
                if (clock.timers.hasOwnProperty(id)) {
                    var timer = clock.timers[id];
                    timer.createdAt += difference;
                    timer.callAt += difference;
                }
            }
        };

        return clock;
    }
    exports.createClock = createClock;

    exports.install = function install(target, now, toFake) {
        var i,
            l;

        if (typeof target === "number") {
            toFake = now;
            now = target;
            target = null;
        }

        if (!target) {
            target = global;
        }

        var clock = createClock(now);

        clock.uninstall = function () {
            uninstall(clock, target);
        };

        clock.methods = toFake || [];

        if (clock.methods.length === 0) {
            clock.methods = keys(timers);
        }

        for (i = 0, l = clock.methods.length; i < l; i++) {
            hijackMethod(target, clock.methods[i], clock);
        }

        return clock;
    };

}(global || this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],52:[function(require,module,exports){
((typeof define === "function" && define.amd && function (m) { define("samsam", m); }) ||
 (typeof module === "object" &&
      function (m) { module.exports = m(); }) || // Node
 function (m) { this.samsam = m(); } // Browser globals
)(function () {
    var o = Object.prototype;
    var div = typeof document !== "undefined" && document.createElement("div");

    function isNaN(value) {
        // Unlike global isNaN, this avoids type coercion
        // typeof check avoids IE host object issues, hat tip to
        // lodash
        var val = value; // JsLint thinks value !== value is "weird"
        return typeof value === "number" && value !== val;
    }

    function getClass(value) {
        // Returns the internal [[Class]] by calling Object.prototype.toString
        // with the provided value as this. Return value is a string, naming the
        // internal class, e.g. "Array"
        return o.toString.call(value).split(/[ \]]/)[1];
    }

    /**
     * @name samsam.isArguments
     * @param Object object
     *
     * Returns ``true`` if ``object`` is an ``arguments`` object,
     * ``false`` otherwise.
     */
    function isArguments(object) {
        if (getClass(object) === 'Arguments') { return true; }
        if (typeof object !== "object" || typeof object.length !== "number" ||
                getClass(object) === "Array") {
            return false;
        }
        if (typeof object.callee == "function") { return true; }
        try {
            object[object.length] = 6;
            delete object[object.length];
        } catch (e) {
            return true;
        }
        return false;
    }

    /**
     * @name samsam.isElement
     * @param Object object
     *
     * Returns ``true`` if ``object`` is a DOM element node. Unlike
     * Underscore.js/lodash, this function will return ``false`` if ``object``
     * is an *element-like* object, i.e. a regular object with a ``nodeType``
     * property that holds the value ``1``.
     */
    function isElement(object) {
        if (!object || object.nodeType !== 1 || !div) { return false; }
        try {
            object.appendChild(div);
            object.removeChild(div);
        } catch (e) {
            return false;
        }
        return true;
    }

    /**
     * @name samsam.keys
     * @param Object object
     *
     * Return an array of own property names.
     */
    function keys(object) {
        var ks = [], prop;
        for (prop in object) {
            if (o.hasOwnProperty.call(object, prop)) { ks.push(prop); }
        }
        return ks;
    }

    /**
     * @name samsam.isDate
     * @param Object value
     *
     * Returns true if the object is a ``Date``, or *date-like*. Duck typing
     * of date objects work by checking that the object has a ``getTime``
     * function whose return value equals the return value from the object's
     * ``valueOf``.
     */
    function isDate(value) {
        return typeof value.getTime == "function" &&
            value.getTime() == value.valueOf();
    }

    /**
     * @name samsam.isNegZero
     * @param Object value
     *
     * Returns ``true`` if ``value`` is ``-0``.
     */
    function isNegZero(value) {
        return value === 0 && 1 / value === -Infinity;
    }

    /**
     * @name samsam.equal
     * @param Object obj1
     * @param Object obj2
     *
     * Returns ``true`` if two objects are strictly equal. Compared to
     * ``===`` there are two exceptions:
     *
     *   - NaN is considered equal to NaN
     *   - -0 and +0 are not considered equal
     */
    function identical(obj1, obj2) {
        if (obj1 === obj2 || (isNaN(obj1) && isNaN(obj2))) {
            return obj1 !== 0 || isNegZero(obj1) === isNegZero(obj2);
        }
    }


    /**
     * @name samsam.deepEqual
     * @param Object obj1
     * @param Object obj2
     *
     * Deep equal comparison. Two values are "deep equal" if:
     *
     *   - They are equal, according to samsam.identical
     *   - They are both date objects representing the same time
     *   - They are both arrays containing elements that are all deepEqual
     *   - They are objects with the same set of properties, and each property
     *     in ``obj1`` is deepEqual to the corresponding property in ``obj2``
     *
     * Supports cyclic objects.
     */
    function deepEqualCyclic(obj1, obj2) {

        // used for cyclic comparison
        // contain already visited objects
        var objects1 = [],
            objects2 = [],
        // contain pathes (position in the object structure)
        // of the already visited objects
        // indexes same as in objects arrays
            paths1 = [],
            paths2 = [],
        // contains combinations of already compared objects
        // in the manner: { "$1['ref']$2['ref']": true }
            compared = {};

        /**
         * used to check, if the value of a property is an object
         * (cyclic logic is only needed for objects)
         * only needed for cyclic logic
         */
        function isObject(value) {

            if (typeof value === 'object' && value !== null &&
                    !(value instanceof Boolean) &&
                    !(value instanceof Date)    &&
                    !(value instanceof Number)  &&
                    !(value instanceof RegExp)  &&
                    !(value instanceof String)) {

                return true;
            }

            return false;
        }

        /**
         * returns the index of the given object in the
         * given objects array, -1 if not contained
         * only needed for cyclic logic
         */
        function getIndex(objects, obj) {

            var i;
            for (i = 0; i < objects.length; i++) {
                if (objects[i] === obj) {
                    return i;
                }
            }

            return -1;
        }

        // does the recursion for the deep equal check
        return (function deepEqual(obj1, obj2, path1, path2) {
            var type1 = typeof obj1;
            var type2 = typeof obj2;

            // == null also matches undefined
            if (obj1 === obj2 ||
                    isNaN(obj1) || isNaN(obj2) ||
                    obj1 == null || obj2 == null ||
                    type1 !== "object" || type2 !== "object") {

                return identical(obj1, obj2);
            }

            // Elements are only equal if identical(expected, actual)
            if (isElement(obj1) || isElement(obj2)) { return false; }

            var isDate1 = isDate(obj1), isDate2 = isDate(obj2);
            if (isDate1 || isDate2) {
                if (!isDate1 || !isDate2 || obj1.getTime() !== obj2.getTime()) {
                    return false;
                }
            }

            if (obj1 instanceof RegExp && obj2 instanceof RegExp) {
                if (obj1.toString() !== obj2.toString()) { return false; }
            }

            var class1 = getClass(obj1);
            var class2 = getClass(obj2);
            var keys1 = keys(obj1);
            var keys2 = keys(obj2);

            if (isArguments(obj1) || isArguments(obj2)) {
                if (obj1.length !== obj2.length) { return false; }
            } else {
                if (type1 !== type2 || class1 !== class2 ||
                        keys1.length !== keys2.length) {
                    return false;
                }
            }

            var key, i, l,
                // following vars are used for the cyclic logic
                value1, value2,
                isObject1, isObject2,
                index1, index2,
                newPath1, newPath2;

            for (i = 0, l = keys1.length; i < l; i++) {
                key = keys1[i];
                if (!o.hasOwnProperty.call(obj2, key)) {
                    return false;
                }

                // Start of the cyclic logic

                value1 = obj1[key];
                value2 = obj2[key];

                isObject1 = isObject(value1);
                isObject2 = isObject(value2);

                // determine, if the objects were already visited
                // (it's faster to check for isObject first, than to
                // get -1 from getIndex for non objects)
                index1 = isObject1 ? getIndex(objects1, value1) : -1;
                index2 = isObject2 ? getIndex(objects2, value2) : -1;

                // determine the new pathes of the objects
                // - for non cyclic objects the current path will be extended
                //   by current property name
                // - for cyclic objects the stored path is taken
                newPath1 = index1 !== -1
                    ? paths1[index1]
                    : path1 + '[' + JSON.stringify(key) + ']';
                newPath2 = index2 !== -1
                    ? paths2[index2]
                    : path2 + '[' + JSON.stringify(key) + ']';

                // stop recursion if current objects are already compared
                if (compared[newPath1 + newPath2]) {
                    return true;
                }

                // remember the current objects and their pathes
                if (index1 === -1 && isObject1) {
                    objects1.push(value1);
                    paths1.push(newPath1);
                }
                if (index2 === -1 && isObject2) {
                    objects2.push(value2);
                    paths2.push(newPath2);
                }

                // remember that the current objects are already compared
                if (isObject1 && isObject2) {
                    compared[newPath1 + newPath2] = true;
                }

                // End of cyclic logic

                // neither value1 nor value2 is a cycle
                // continue with next level
                if (!deepEqual(value1, value2, newPath1, newPath2)) {
                    return false;
                }
            }

            return true;

        }(obj1, obj2, '$1', '$2'));
    }

    var match;

    function arrayContains(array, subset) {
        if (subset.length === 0) { return true; }
        var i, l, j, k;
        for (i = 0, l = array.length; i < l; ++i) {
            if (match(array[i], subset[0])) {
                for (j = 0, k = subset.length; j < k; ++j) {
                    if (!match(array[i + j], subset[j])) { return false; }
                }
                return true;
            }
        }
        return false;
    }

    /**
     * @name samsam.match
     * @param Object object
     * @param Object matcher
     *
     * Compare arbitrary value ``object`` with matcher.
     */
    match = function match(object, matcher) {
        if (matcher && typeof matcher.test === "function") {
            return matcher.test(object);
        }

        if (typeof matcher === "function") {
            return matcher(object) === true;
        }

        if (typeof matcher === "string") {
            matcher = matcher.toLowerCase();
            var notNull = typeof object === "string" || !!object;
            return notNull &&
                (String(object)).toLowerCase().indexOf(matcher) >= 0;
        }

        if (typeof matcher === "number") {
            return matcher === object;
        }

        if (typeof matcher === "boolean") {
            return matcher === object;
        }

        if (typeof(matcher) === "undefined") {
            return typeof(object) === "undefined";
        }

        if (matcher === null) {
            return object === null;
        }

        if (getClass(object) === "Array" && getClass(matcher) === "Array") {
            return arrayContains(object, matcher);
        }

        if (matcher && typeof matcher === "object") {
            if (matcher === object) {
                return true;
            }
            var prop;
            for (prop in matcher) {
                var value = object[prop];
                if (typeof value === "undefined" &&
                        typeof object.getAttribute === "function") {
                    value = object.getAttribute(prop);
                }
                if (matcher[prop] === null || typeof matcher[prop] === 'undefined') {
                    if (value !== matcher[prop]) {
                        return false;
                    }
                } else if (typeof  value === "undefined" || !match(value, matcher[prop])) {
                    return false;
                }
            }
            return true;
        }

        throw new Error("Matcher was not a string, a number, a " +
                        "function, a boolean or an object");
    };

    return {
        isArguments: isArguments,
        isElement: isElement,
        isDate: isDate,
        isNegZero: isNegZero,
        identical: identical,
        deepEqual: deepEqualCyclic,
        match: match,
        keys: keys
    };
});

},{}],53:[function(require,module,exports){
//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.3';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = property('length');
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
            i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = property;

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}],54:[function(require,module,exports){
/**
 * EvEmitter v1.0.3
 * Lil' event emitter
 * MIT License
 */

/* jshint unused: true, undef: true, strict: true */

( function( global, factory ) {
  // universal module definition
  /* jshint strict: false */ /* globals define, module, window */
  if ( typeof define == 'function' && define.amd ) {
    // AMD - RequireJS
    define( factory );
  } else if ( typeof module == 'object' && module.exports ) {
    // CommonJS - Browserify, Webpack
    module.exports = factory();
  } else {
    // Browser globals
    global.EvEmitter = factory();
  }

}( typeof window != 'undefined' ? window : this, function() {

"use strict";

function EvEmitter() {}

var proto = EvEmitter.prototype;

proto.on = function( eventName, listener ) {
  if ( !eventName || !listener ) {
    return;
  }
  // set events hash
  var events = this._events = this._events || {};
  // set listeners array
  var listeners = events[ eventName ] = events[ eventName ] || [];
  // only add once
  if ( listeners.indexOf( listener ) == -1 ) {
    listeners.push( listener );
  }

  return this;
};

proto.once = function( eventName, listener ) {
  if ( !eventName || !listener ) {
    return;
  }
  // add event
  this.on( eventName, listener );
  // set once flag
  // set onceEvents hash
  var onceEvents = this._onceEvents = this._onceEvents || {};
  // set onceListeners object
  var onceListeners = onceEvents[ eventName ] = onceEvents[ eventName ] || {};
  // set flag
  onceListeners[ listener ] = true;

  return this;
};

proto.off = function( eventName, listener ) {
  var listeners = this._events && this._events[ eventName ];
  if ( !listeners || !listeners.length ) {
    return;
  }
  var index = listeners.indexOf( listener );
  if ( index != -1 ) {
    listeners.splice( index, 1 );
  }

  return this;
};

proto.emitEvent = function( eventName, args ) {
  var listeners = this._events && this._events[ eventName ];
  if ( !listeners || !listeners.length ) {
    return;
  }
  var i = 0;
  var listener = listeners[i];
  args = args || [];
  // once stuff
  var onceListeners = this._onceEvents && this._onceEvents[ eventName ];

  while ( listener ) {
    var isOnce = onceListeners && onceListeners[ listener ];
    if ( isOnce ) {
      // remove listener
      // remove before trigger to prevent recursion
      this.off( eventName, listener );
      // unset once flag
      delete onceListeners[ listener ];
    }
    // trigger listener
    listener.apply( this, args );
    // get next listener
    i += isOnce ? 0 : 1;
    listener = listeners[i];
  }

  return this;
};

return EvEmitter;

}));

},{}],55:[function(require,module,exports){
/*!
 * Unipointer v2.1.0
 * base class for doing one thing with pointer event
 * MIT license
 */

/*jshint browser: true, undef: true, unused: true, strict: true */

( function( window, factory ) {
  // universal module definition
  /* jshint strict: false */ /*global define, module, require */
  if ( typeof define == 'function' && define.amd ) {
    // AMD
    define( [
      'ev-emitter/ev-emitter'
    ], function( EvEmitter ) {
      return factory( window, EvEmitter );
    });
  } else if ( typeof module == 'object' && module.exports ) {
    // CommonJS
    module.exports = factory(
      window,
      require('ev-emitter')
    );
  } else {
    // browser global
    window.Unipointer = factory(
      window,
      window.EvEmitter
    );
  }

}( window, function factory( window, EvEmitter ) {

'use strict';

function noop() {}

function Unipointer() {}

// inherit EvEmitter
var proto = Unipointer.prototype = Object.create( EvEmitter.prototype );

proto.bindStartEvent = function( elem ) {
  this._bindStartEvent( elem, true );
};

proto.unbindStartEvent = function( elem ) {
  this._bindStartEvent( elem, false );
};

/**
 * works as unbinder, as you can ._bindStart( false ) to unbind
 * @param {Boolean} isBind - will unbind if falsey
 */
proto._bindStartEvent = function( elem, isBind ) {
  // munge isBind, default to true
  isBind = isBind === undefined ? true : !!isBind;
  var bindMethod = isBind ? 'addEventListener' : 'removeEventListener';

  if ( window.navigator.pointerEnabled ) {
    // W3C Pointer Events, IE11. See https://coderwall.com/p/mfreca
    elem[ bindMethod ]( 'pointerdown', this );
  } else if ( window.navigator.msPointerEnabled ) {
    // IE10 Pointer Events
    elem[ bindMethod ]( 'MSPointerDown', this );
  } else {
    // listen for both, for devices like Chrome Pixel
    elem[ bindMethod ]( 'mousedown', this );
    elem[ bindMethod ]( 'touchstart', this );
  }
};

// trigger handler methods for events
proto.handleEvent = function( event ) {
  var method = 'on' + event.type;
  if ( this[ method ] ) {
    this[ method ]( event );
  }
};

// returns the touch that we're keeping track of
proto.getTouch = function( touches ) {
  for ( var i=0; i < touches.length; i++ ) {
    var touch = touches[i];
    if ( touch.identifier == this.pointerIdentifier ) {
      return touch;
    }
  }
};

// ----- start event ----- //

proto.onmousedown = function( event ) {
  // dismiss clicks from right or middle buttons
  var button = event.button;
  if ( button && ( button !== 0 && button !== 1 ) ) {
    return;
  }
  this._pointerDown( event, event );
};

proto.ontouchstart = function( event ) {
  this._pointerDown( event, event.changedTouches[0] );
};

proto.onMSPointerDown =
proto.onpointerdown = function( event ) {
  this._pointerDown( event, event );
};

/**
 * pointer start
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
proto._pointerDown = function( event, pointer ) {
  // dismiss other pointers
  if ( this.isPointerDown ) {
    return;
  }

  this.isPointerDown = true;
  // save pointer identifier to match up touch events
  this.pointerIdentifier = pointer.pointerId !== undefined ?
    // pointerId for pointer events, touch.indentifier for touch events
    pointer.pointerId : pointer.identifier;

  this.pointerDown( event, pointer );
};

proto.pointerDown = function( event, pointer ) {
  this._bindPostStartEvents( event );
  this.emitEvent( 'pointerDown', [ event, pointer ] );
};

// hash of events to be bound after start event
var postStartEvents = {
  mousedown: [ 'mousemove', 'mouseup' ],
  touchstart: [ 'touchmove', 'touchend', 'touchcancel' ],
  pointerdown: [ 'pointermove', 'pointerup', 'pointercancel' ],
  MSPointerDown: [ 'MSPointerMove', 'MSPointerUp', 'MSPointerCancel' ]
};

proto._bindPostStartEvents = function( event ) {
  if ( !event ) {
    return;
  }
  // get proper events to match start event
  var events = postStartEvents[ event.type ];
  // bind events to node
  events.forEach( function( eventName ) {
    window.addEventListener( eventName, this );
  }, this );
  // save these arguments
  this._boundPointerEvents = events;
};

proto._unbindPostStartEvents = function() {
  // check for _boundEvents, in case dragEnd triggered twice (old IE8 bug)
  if ( !this._boundPointerEvents ) {
    return;
  }
  this._boundPointerEvents.forEach( function( eventName ) {
    window.removeEventListener( eventName, this );
  }, this );

  delete this._boundPointerEvents;
};

// ----- move event ----- //

proto.onmousemove = function( event ) {
  this._pointerMove( event, event );
};

proto.onMSPointerMove =
proto.onpointermove = function( event ) {
  if ( event.pointerId == this.pointerIdentifier ) {
    this._pointerMove( event, event );
  }
};

proto.ontouchmove = function( event ) {
  var touch = this.getTouch( event.changedTouches );
  if ( touch ) {
    this._pointerMove( event, touch );
  }
};

/**
 * pointer move
 * @param {Event} event
 * @param {Event or Touch} pointer
 * @private
 */
proto._pointerMove = function( event, pointer ) {
  this.pointerMove( event, pointer );
};

// public
proto.pointerMove = function( event, pointer ) {
  this.emitEvent( 'pointerMove', [ event, pointer ] );
};

// ----- end event ----- //


proto.onmouseup = function( event ) {
  this._pointerUp( event, event );
};

proto.onMSPointerUp =
proto.onpointerup = function( event ) {
  if ( event.pointerId == this.pointerIdentifier ) {
    this._pointerUp( event, event );
  }
};

proto.ontouchend = function( event ) {
  var touch = this.getTouch( event.changedTouches );
  if ( touch ) {
    this._pointerUp( event, touch );
  }
};

/**
 * pointer up
 * @param {Event} event
 * @param {Event or Touch} pointer
 * @private
 */
proto._pointerUp = function( event, pointer ) {
  this._pointerDone();
  this.pointerUp( event, pointer );
};

// public
proto.pointerUp = function( event, pointer ) {
  this.emitEvent( 'pointerUp', [ event, pointer ] );
};

// ----- pointer done ----- //

// triggered on pointer up & pointer cancel
proto._pointerDone = function() {
  // reset properties
  this.isPointerDown = false;
  delete this.pointerIdentifier;
  // remove events
  this._unbindPostStartEvents();
  this.pointerDone();
};

proto.pointerDone = noop;

// ----- pointer cancel ----- //

proto.onMSPointerCancel =
proto.onpointercancel = function( event ) {
  if ( event.pointerId == this.pointerIdentifier ) {
    this._pointerCancel( event, event );
  }
};

proto.ontouchcancel = function( event ) {
  var touch = this.getTouch( event.changedTouches );
  if ( touch ) {
    this._pointerCancel( event, touch );
  }
};

/**
 * pointer cancel
 * @param {Event} event
 * @param {Event or Touch} pointer
 * @private
 */
proto._pointerCancel = function( event, pointer ) {
  this._pointerDone();
  this.pointerCancel( event, pointer );
};

// public
proto.pointerCancel = function( event, pointer ) {
  this.emitEvent( 'pointerCancel', [ event, pointer ] );
};

// -----  ----- //

// utility function for getting x/y coords from event
Unipointer.getPointerPoint = function( pointer ) {
  return {
    x: pointer.pageX,
    y: pointer.pageY
  };
};

// -----  ----- //

return Unipointer;

}));

},{"ev-emitter":54}],56:[function(require,module,exports){
/*!
 * Unidragger v2.1.0
 * Draggable base class
 * MIT license
 */

/*jshint browser: true, unused: true, undef: true, strict: true */

( function( window, factory ) {
  // universal module definition
  /*jshint strict: false */ /*globals define, module, require */

  if ( typeof define == 'function' && define.amd ) {
    // AMD
    define( [
      'unipointer/unipointer'
    ], function( Unipointer ) {
      return factory( window, Unipointer );
    });
  } else if ( typeof module == 'object' && module.exports ) {
    // CommonJS
    module.exports = factory(
      window,
      require('unipointer')
    );
  } else {
    // browser global
    window.Unidragger = factory(
      window,
      window.Unipointer
    );
  }

}( window, function factory( window, Unipointer ) {

'use strict';

// -----  ----- //

function noop() {}

// -------------------------- Unidragger -------------------------- //

function Unidragger() {}

// inherit Unipointer & EvEmitter
var proto = Unidragger.prototype = Object.create( Unipointer.prototype );

// ----- bind start ----- //

proto.bindHandles = function() {
  this._bindHandles( true );
};

proto.unbindHandles = function() {
  this._bindHandles( false );
};

var navigator = window.navigator;
/**
 * works as unbinder, as you can .bindHandles( false ) to unbind
 * @param {Boolean} isBind - will unbind if falsey
 */
proto._bindHandles = function( isBind ) {
  // munge isBind, default to true
  isBind = isBind === undefined ? true : !!isBind;
  // extra bind logic
  var binderExtra;
  if ( navigator.pointerEnabled ) {
    binderExtra = function( handle ) {
      // disable scrolling on the element
      handle.style.touchAction = isBind ? 'none' : '';
    };
  } else if ( navigator.msPointerEnabled ) {
    binderExtra = function( handle ) {
      // disable scrolling on the element
      handle.style.msTouchAction = isBind ? 'none' : '';
    };
  } else {
    binderExtra = noop;
  }
  // bind each handle
  var bindMethod = isBind ? 'addEventListener' : 'removeEventListener';
  for ( var i=0; i < this.handles.length; i++ ) {
    var handle = this.handles[i];
    this._bindStartEvent( handle, isBind );
    binderExtra( handle );
    handle[ bindMethod ]( 'click', this );
  }
};

// ----- start event ----- //

/**
 * pointer start
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
proto.pointerDown = function( event, pointer ) {
  // dismiss range sliders
  if ( event.target.nodeName == 'INPUT' && event.target.type == 'range' ) {
    // reset pointerDown logic
    this.isPointerDown = false;
    delete this.pointerIdentifier;
    return;
  }

  this._dragPointerDown( event, pointer );
  // kludge to blur focused inputs in dragger
  var focused = document.activeElement;
  if ( focused && focused.blur ) {
    focused.blur();
  }
  // bind move and end events
  this._bindPostStartEvents( event );
  this.emitEvent( 'pointerDown', [ event, pointer ] );
};

// base pointer down logic
proto._dragPointerDown = function( event, pointer ) {
  // track to see when dragging starts
  this.pointerDownPoint = Unipointer.getPointerPoint( pointer );

  var canPreventDefault = this.canPreventDefaultOnPointerDown( event, pointer );
  if ( canPreventDefault ) {
    event.preventDefault();
  }
};

// overwriteable method so Flickity can prevent for scrolling
proto.canPreventDefaultOnPointerDown = function( event ) {
  // prevent default, unless touchstart or <select>
  return event.target.nodeName != 'SELECT';
};

// ----- move event ----- //

/**
 * drag move
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
proto.pointerMove = function( event, pointer ) {
  var moveVector = this._dragPointerMove( event, pointer );
  this.emitEvent( 'pointerMove', [ event, pointer, moveVector ] );
  this._dragMove( event, pointer, moveVector );
};

// base pointer move logic
proto._dragPointerMove = function( event, pointer ) {
  var movePoint = Unipointer.getPointerPoint( pointer );
  var moveVector = {
    x: movePoint.x - this.pointerDownPoint.x,
    y: movePoint.y - this.pointerDownPoint.y
  };
  // start drag if pointer has moved far enough to start drag
  if ( !this.isDragging && this.hasDragStarted( moveVector ) ) {
    this._dragStart( event, pointer );
  }
  return moveVector;
};

// condition if pointer has moved far enough to start drag
proto.hasDragStarted = function( moveVector ) {
  return Math.abs( moveVector.x ) > 3 || Math.abs( moveVector.y ) > 3;
};


// ----- end event ----- //

/**
 * pointer up
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
proto.pointerUp = function( event, pointer ) {
  this.emitEvent( 'pointerUp', [ event, pointer ] );
  this._dragPointerUp( event, pointer );
};

proto._dragPointerUp = function( event, pointer ) {
  if ( this.isDragging ) {
    this._dragEnd( event, pointer );
  } else {
    // pointer didn't move enough for drag to start
    this._staticClick( event, pointer );
  }
};

// -------------------------- drag -------------------------- //

// dragStart
proto._dragStart = function( event, pointer ) {
  this.isDragging = true;
  this.dragStartPoint = Unipointer.getPointerPoint( pointer );
  // prevent clicks
  this.isPreventingClicks = true;

  this.dragStart( event, pointer );
};

proto.dragStart = function( event, pointer ) {
  this.emitEvent( 'dragStart', [ event, pointer ] );
};

// dragMove
proto._dragMove = function( event, pointer, moveVector ) {
  // do not drag if not dragging yet
  if ( !this.isDragging ) {
    return;
  }

  this.dragMove( event, pointer, moveVector );
};

proto.dragMove = function( event, pointer, moveVector ) {
  event.preventDefault();
  this.emitEvent( 'dragMove', [ event, pointer, moveVector ] );
};

// dragEnd
proto._dragEnd = function( event, pointer ) {
  // set flags
  this.isDragging = false;
  // re-enable clicking async
  setTimeout( function() {
    delete this.isPreventingClicks;
  }.bind( this ) );

  this.dragEnd( event, pointer );
};

proto.dragEnd = function( event, pointer ) {
  this.emitEvent( 'dragEnd', [ event, pointer ] );
};

// ----- onclick ----- //

// handle all clicks and prevent clicks when dragging
proto.onclick = function( event ) {
  if ( this.isPreventingClicks ) {
    event.preventDefault();
  }
};

// ----- staticClick ----- //

// triggered after pointer down & up with no/tiny movement
proto._staticClick = function( event, pointer ) {
  // ignore emulated mouse up clicks
  if ( this.isIgnoringMouseUp && event.type == 'mouseup' ) {
    return;
  }

  // allow click in <input>s and <textarea>s
  var nodeName = event.target.nodeName;
  if ( nodeName == 'INPUT' || nodeName == 'TEXTAREA' ) {
    event.target.focus();
  }
  this.staticClick( event, pointer );

  // set flag for emulated clicks 300ms after touchend
  if ( event.type != 'mouseup' ) {
    this.isIgnoringMouseUp = true;
    // reset flag after 300ms
    setTimeout( function() {
      delete this.isIgnoringMouseUp;
    }.bind( this ), 400 );
  }
};

proto.staticClick = function( event, pointer ) {
  this.emitEvent( 'staticClick', [ event, pointer ] );
};

// ----- utils ----- //

Unidragger.getPointerPoint = Unipointer.getPointerPoint;

// -----  ----- //

return Unidragger;

}));

},{"unipointer":55}],57:[function(require,module,exports){
// Load in our dependencies

var updateImageSetFilepathEqualResponse = "{\"imagesEqual\":true}";
var updateImageSetFilepathNotEqualResponse = "{\"imagesEqual\":false}";

// Define our helpers
exports.UPDATE_IMAGE_SET_APPROVE = {
  method: 'POST',
  url: /\/update-image-set\/[^\/]+/,
  statusCode: 200,
  headers: {'Content-Type': 'application/json'},
  body: updateImageSetFilepathEqualResponse // {imagesEqual: true}
};

exports.UPDATE_IMAGE_SET_DISAPPROVE = {
  method: 'POST',
  url: /\/update-image-set\/[^\/]+/,
  statusCode: 200,
  headers: {'Content-Type': 'application/json'},
  // jscs:disable maximumLineLength
  // Set via: echo -n '{"imagesEqual":false}' > test/test-files/http-responses/update-image-set-filepath-not-equal.json
  // jscs:enable maximumLineLength
  body: updateImageSetFilepathNotEqualResponse // {imagesEqual: false}
};

exports.UPDATE_IMAGE_SET_ERROR = {
  method: 'POST',
  url: /\/update-image-set\/[^\/]+/,
  statusCode: 500,
  body: 'Internal server error'
};

},{}],58:[function(require,module,exports){
// Load in our dependencies
// DEV: Please avoid any non-sinon dependencies as this is shared by browser/server
var _ = require('underscore');
var sinon = require('sinon');

// Define our utilities
exports.getMockXHRResponse = function (response) {
  return [
    response.statusCode, response.headers || {}, response.body
  ];
};
exports.mockXHR = function (responses) {
  before(function callMockXHR () {
    // Create our server
    // http://sinonjs.org/docs/#fakeServer
    var sinonServer = this.sinonServer = sinon.fakeServer.create();

    // Set up auto-responses
    this.sinonServer.respondImmediately = true;

    // Bind our responses
    responses.forEach(function bindResponse (response) {
      sinonServer.respondWith(response.method, response.url,
        response.fn || exports.getMockXHRResponse(response));
    });
  });
  after(function cleanup () {
    this.sinonServer.restore();
    delete this.sinonServer;
  });
};

// http://sinonjs.org/docs/#sinonspy
function bindFunc(func) {
  if (func) {
    if (typeof func === 'function') {
      return func.bind(this);
    } else if (typeof func === 'object') {
      var obj = _.clone(func);
      if (obj.get) { obj.get = obj.get.bind(this); }
      if (obj.set) { obj.set = obj.set.bind(this); }
      return obj;
    }
  }
}
exports._spy = function (bindFunction) {
  return function _spyFn (obj, method, func) {
    var spy;
    before(function setupSpy () {
      if (bindFunction) { func = bindFunc.call(this, func); }
      spy = sinon.spy(obj, method, func);
    });
    after(function cleanup () {
      spy.restore();
    });
  };
};
exports.contextFreeSpy = exports._spy(false);
exports.spy = exports._spy(true);

// http://sinonjs.org/docs/#stubs-api
exports._stub = function (bindFunction) {
  return function _stubFn (obj, method, func) {
    var stub;
    before(function setupStub () {
      if (bindFunction) { func = bindFunc.call(this, func); }
      stub = sinon.stub(obj, method, func);
    });
    after(function cleanup () {
      stub.restore();
    });
  };
};
exports.contextFreeStub = exports._stub(false);
exports.stub = exports._stub(true);

},{"sinon":25,"underscore":53}]},{},[3]);
