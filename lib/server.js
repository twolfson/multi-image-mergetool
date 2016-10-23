// Load in our dependencies
var assert = require('assert');
var express = require('express');

// Define our server builder
function generateServer(imageSets, options) {
  // Create our server
  var server = express();

  // Configure our views
  // http://expressjs.com/en/guide/using-template-engines.html
  server.set('views', __dirname);
  server.set('view engine', 'jade');

  // Expose our images statically
  // TODO: Verify we don't leak any sensitive file paths (e.g. `/etc/passwd`)
  var validImages = {};
  imageSets.forEach(function saveImageFilepath (imageSet) {
    validImages[imageSet.currentImg] = true;
    validImages[imageSet.refImg] = true;
    // DEV: We could have a security issue if someone symlinks `/tmp/...` to `/etc/passwd` =/
    //   but that's kind of unavoidable since the inode is constantly changing due to being a diff
    assert(imageSet.diffImg, 'Expected `imageSet.diffImg` to be defined but it wasn\'t. ' +
      'Please verify `imageSet.compare()` has been run first');
    validImages[imageSet.diffImg] = true;
  });
  server.use('/images', function serveImages (req, res, next) {
    // If we don't recognize the image, then 404
    // Usage: `/images/gemini-report/images/root/Chrome~current.png`
    // Malicious usage: `images/../../../../../etc/passwd`
    var requestedFilepath = req.url;
    if (!validImages[requestedFilepath]) {
      return next();
    }

    // Otherwise, send our image
    // DEV: We don't use `send` as we want to avoid caching (e.g. for diffs)
    res.sendFile(requestedFilepath);
  });

  // Define our routes
  server.get('/', function rootShow (req, res, next) {
    res.render('index.jade', {image_sets: imageSets});
  });

  // TODO: Remove `/overlay` as it should be its own repo entirely
  server.get('/overlay', function overlayShow (req, res, next) {
    res.render('overlay.jade');
  });

  // Return our server
  return server;
}

// Export our server builder
module.exports = generateServer;
