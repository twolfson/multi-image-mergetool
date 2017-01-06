#!/usr/bin/env node
// Based on https://github.com/admc/wd/blob/v1.1.1/examples/promise/chrome.js
// Load in our dependencies
var assert = require('assert');
var async = require('async');
var fs = require('fs');
var functionToString = require('function-to-string');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var wd = require('wd');
var ImageSet = require('../server/image-set');

// Reset our demo directory
var demoDir = __dirname + '/../demo';
rimraf.sync(demoDir + '/ref');
rimraf.sync(demoDir + '/current');
mkdirp.sync(demoDir + '/ref');
mkdirp.sync(demoDir + '/current');

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
fs.writeFileSync('demo/index.json', JSON.stringify({image_sets: imageSets}, null, 2));

// Add custom methods for screenshots
// https://github.com/admc/wd/tree/v1.1.1#adding-custom-methods
wd.addPromiseChainMethod('screenshotLarge', function screenshotLargeFn (filepath) {
  // Resize browser and screenshot
  return this
    // https://github.com/admc/wd/blob/v1.1.1/lib/commands.js#L569-L577
    .setWindowSize(1024, 768)
    // Give our browser time to handle resize, it caused some weird UI issues
    .then(function () { return new Promise(function (resolve) { setTimeout(resolve, 100); }); })
    // https://github.com/admc/wd/blob/v1.1.1/lib/commands.js#L1108-L1114
    .saveScreenshot(filepath);
});
wd.addPromiseChainMethod('screenshotSmall', function screenshotLargeFn (filepath) {
  return this.setWindowSize(360, 480).saveScreenshot(filepath);
});

// Define a function to gather screenshots
function gatherScreenshots(params, cb) {
  // Create our browser
  // DEV: Typically we would prefer callbacks over promises but chaining is quite nice
  var browser = wd.promiseChainRemote();
  var name = params.name; assert(name);
  var urlPath = params.urlPath; assert(urlPath);
  var saveRefImages = params.saveRefImages !== false;

  // Add logging for feedback
  browser.on('status', function handleStatus (info) {
    console.log('Status (' + name + '):', info.trim());
  });
  browser.on('command', function handleCommand (eventType, command, response) {
    // If this is a response, ignore it
    if (eventType === 'RESPONSE') {
      return;
    }
    console.log('Command (' + name + '):', eventType, command, (response || ''));
  });

  // Perform our screenshot collection
  // Initial ref image setup
  browser = browser
    .init({browserName: 'chrome'})
    .get('http://getbootstrap.com' + urlPath)
    .execute(functionToString(function cleanPage () {
      // Remove "Bootstrap 4" banner
      var bannerEl = document.querySelector('.v4-tease');
      if (!bannerEl) { throw new Error('Unable to find ".v4-tease"'); }
      bannerEl.parentNode.removeChild(bannerEl);

      // Remove ads
      var adEl = document.querySelector('#carbonads-container');
      if (!adEl) { throw new Error('Unable to find "#carbonads-container"'); }
      adEl.parentNode.removeChild(adEl);
    }).body);
  if (saveRefImages) {
    browser = browser
      .screenshotLarge(demoDir + '/ref/' + name + '.large.png')
      .screenshotSmall(demoDir + '/ref/' + name + '.small.png');
  }

  // Modified current image setup
  browser = browser
    .execute(functionToString(function alterPage () {
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
    }).body)
    .screenshotLarge(demoDir + '/current/' + name + '.large.png')
    .screenshotSmall(demoDir + '/current/' + name + '.small.png');

  // Close our our browser on finish
  browser
    .fin(function handleFin () { return browser.quit(); })
    .done(function handleDone () { cb(); });
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
