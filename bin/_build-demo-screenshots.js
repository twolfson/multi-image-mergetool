#!/usr/bin/env node
// Load in our dependencies
var assert = require('assert');
var async = require('async');
var fs = require('fs');
var mkdirp = require('mkdirp');
var Nightmare = require('nightmare');
var rimraf = require('rimraf');
var ImageSet = require('../server/image-set');

// Reset our demo directory
var demoDir = __dirname + '/../demo';
rimraf.sync(demoDir + '/images/current');
rimraf.sync(demoDir + '/images/diff');
rimraf.sync(demoDir + '/images/ref');
mkdirp.sync(demoDir + '/images/current');
mkdirp.sync(demoDir + '/images/diff');
mkdirp.sync(demoDir + '/images/ref');

// Define image sets to be used for `index.html`
var imageSets = [];
var IMAGE_SET_ROOT_LARGE = new ImageSet(
  'current/root.large.png', 'ref/root.large.png', {
    diffImage: 'diff/root.large.png'
  });
IMAGE_SET_ROOT_LARGE.imagesEqual = false;
IMAGE_SET_ROOT_LARGE.isNew = false;
imageSets.push(IMAGE_SET_ROOT_LARGE);
var IMAGE_SET_ROOT_SMALL = new ImageSet(
  'current/root.small.png', 'ref/root.small.png', {
    diffImage: 'diff/root.small.png'
  });
IMAGE_SET_ROOT_SMALL.imagesEqual = true;
IMAGE_SET_ROOT_SMALL.isNew = false;
imageSets.push(IMAGE_SET_ROOT_SMALL);

var IMAGE_SET_GETTING_STARTED_LARGE = new ImageSet(
  'current/getting-started.large.png', 'ref/getting-started.large.png', {
    diffImage: 'diff/getting-started.large.png'
  });
IMAGE_SET_GETTING_STARTED_LARGE.imagesEqual = false;
IMAGE_SET_GETTING_STARTED_LARGE.isNew = false;
imageSets.push(IMAGE_SET_GETTING_STARTED_LARGE);
var IMAGE_SET_GETTING_STARTED_SMALL = new ImageSet(
  'current/getting-started.small.png', 'ref/getting-started.small.png', {
    diffImage: 'diff/getting-started.small.png'
  });
IMAGE_SET_GETTING_STARTED_SMALL.imagesEqual = true;
IMAGE_SET_GETTING_STARTED_SMALL.isNew = false;
imageSets.push(IMAGE_SET_GETTING_STARTED_SMALL);

var IMAGE_SET_CSS_LARGE = new ImageSet(
  'current/css.large.png', 'ref/css.large.png', {
    diffImage: 'diff/css.large.png'
  });
IMAGE_SET_CSS_LARGE.imagesEqual = false;
IMAGE_SET_CSS_LARGE.isNew = true;
imageSets.push(IMAGE_SET_CSS_LARGE);
var IMAGE_SET_CSS_SMALL = new ImageSet(
  'current/css.small.png', 'ref/css.small.png', {
    diffImage: 'diff/css.small.png'
  });
IMAGE_SET_CSS_SMALL.imagesEqual = false;
IMAGE_SET_CSS_SMALL.isNew = true;
imageSets.push(IMAGE_SET_CSS_SMALL);

// Output image set info to `demo`
var indexJson = {
  image_sets: imageSets.map(function serializeImageSet (imageSet) {
    return imageSet.serialize();
  })
};
fs.writeFileSync('demo/index.json', JSON.stringify(indexJson, null, 2));

// Define helper functions
// https://github.com/segmentio/nightmare/tree/2.9.1#nightmareactionname-electronactionelectronnamespace-actionnamespace
Nightmare.action('screenshotLarge', function (filepath, done) {
  return this
    .viewport(1024, 768)
    // Wait for Electron to recognize UI changes
    // DEV: Ideally we would use `window.requestAnimationFrame` but that seems to not work
    .wait(100)
    .screenshot(filepath, done);
});
Nightmare.action('screenshotSmall', function (filepath, done) {
  return this
    .viewport(360, 480)
    // Wait for Electron to recognize UI changes
    // DEV: Ideally we would use `window.requestAnimationFrame` but that seems to not work
    .wait(100)
    .screenshot(filepath, done);
});

// Define a function to gather screenshots
function gatherScreenshots(params, cb) {
  // Expand our parameters
  var name = params.name; assert(name);
  var urlPath = params.urlPath; assert(urlPath);
  var saveRefImages = params.saveRefImages !== false;

  // Create our browser window
  var nightmare = new Nightmare({show: true});

  // Perform our screenshot collection
  // Initial ref image setup
  nightmare = nightmare
    .goto('http://getbootstrap.com' + urlPath)
    .evaluate(function cleanPage () {
      // Remove "Bootstrap 4" banner
      var bannerEl = document.querySelector('.v4-tease');
      if (!bannerEl) { throw new Error('Unable to find ".v4-tease"'); }
      bannerEl.parentNode.removeChild(bannerEl);

      // Remove ads
      var adEl = document.querySelector('#carbonads-container');
      if (!adEl) { throw new Error('Unable to find "#carbonads-container"'); }
      adEl.parentNode.removeChild(adEl);

      // Normalize background gradient to be solid color for easier matching
      var contentEl = document.querySelector('#content');
      if (!contentEl) { throw new Error('Unable to find "#content"'); }
      contentEl.style.backgroundImage = 'none';
    });
  if (saveRefImages) {
    nightmare = nightmare
      .screenshotLarge(demoDir + '/images/ref/' + name + '.large.png')
      .screenshotSmall(demoDir + '/images/ref/' + name + '.small.png');
  }

  // Modified current image setup
  nightmare = nightmare
    .evaluate(function alterPage () {
      // Alter nav bar to demonstrate changes
      var componentsLinkEl = document.querySelector('#bs-navbar a[href="../components/"]');
      if (!componentsLinkEl) { throw new Error('Unable to find "#bs-navbar a[href="../components/"]"'); }
      componentsLinkEl.textContent = 'Widgets';
      var expoLinkEl = document.querySelector('#bs-navbar a[href="http://expo.getbootstrap.com"]');
      if (!expoLinkEl) { throw new Error('Unable to find "#bs-navbar a[href="http://expo.getbootstrap.com"]"'); }
      // DEV: Remove the `li` containing our expo link
      var expoLiEl = expoLinkEl.parentNode;
      if (expoLiEl.tagName !== 'LI') { throw new Error('`expoLinkEl.parentNode` was not an `<li>` as expected'); }
      expoLiEl.parentNode.removeChild(expoLiEl);
    })
    .screenshotLarge(demoDir + '/images/current/' + name + '.large.png')
    .screenshotSmall(demoDir + '/images/current/' + name + '.small.png');

  // Close our our browser on finish
  nightmare
    .end()
    .then(function handleEnd () { cb(); });
}

// Gather our screenshots
async.parallel([
  function gatherRootScreenshots (cb) {
    gatherScreenshots({name: 'root', urlPath: '/'}, cb);
  },
  function gatherGettingStartedScreenshots (cb) {
    gatherScreenshots({name: 'getting-started', urlPath: '/getting-started/'}, cb);
  },
  function gatherCSSScreenshots (cb) {
    gatherScreenshots({
      name: 'css', urlPath: '/css/',
      saveRefImages: false
    }, cb);
  }
], function handleError (err) {
  // If there was an error, throw it
  if (err) {
    throw err;
  }
});
