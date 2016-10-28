// Load in our dependencies
var assert = require('assert');
var bodyParser = require('body-parser');
var HttpError = require('http-errors');
var express = require('express');
var path = require('path');

// Define our server builder
function generateServer(imageSets, options) {
  // Create our server
  var server = express();

  // Configure our views
  // http://expressjs.com/en/guide/using-template-engines.html
  server.set('views', __dirname);
  server.set('view engine', 'jade');

  // Set up body handling support
  // DEV: We are setting high limit with 1MB but we'll see if people exceed that...
  // https://github.com/expressjs/body-parser/tree/1.15.2#bodyparserurlencodedoptions
  server.use(bodyParser.urlencoded({extended: false, limit: '1MB'}));

  // Expose our images statically
  // TODO: Verify we don't leak any sensitive file paths (e.g. `/etc/passwd`)
  var imageSetsByFilepath = {};
  imageSets.forEach(function saveImageFilepath (imageSet) {
    imageSetsByFilepath[imageSet.currentImg] = imageSet;
    imageSetsByFilepath[imageSet.refImg] = imageSet;
    // DEV: We could have a security issue if someone symlinks `/tmp/...` to `/etc/passwd` =/
    //   but that's kind of unavoidable since the inode is constantly changing due to being a diff
    assert(imageSet.diffImg, 'Expected `imageSet.diffImg` to be defined but it wasn\'t. ' +
      'Please verify `imageSet.compare()` has been run first');
    imageSetsByFilepath[imageSet.diffImg] = imageSet;
  });
  function resolveImageSet(req, res, next) {
    // Attempt to recognize our image
    // Usage: `/images/gemini-report/images/root/Chrome~current.png`
    // Malicious usage: `/images/../../../../../etc/passwd`
    // DEV: We use `hasOwnProperty` to avoid exploits on `Object.prototype` (e.g. `/hasOwnProperty`)
    var requestedFilepath = req.params.filepath;
    if (!imageSetsByFilepath.hasOwnProperty(requestedFilepath)) {
      return next(new HttpError.NotFound());
    }

    // Otherwise, expose our filepath/image and continue
    req.requestedFilepath = requestedFilepath;
    req.imageSet = imageSetsByFilepath[requestedFilepath];
    next();
  }
  server.get('/images/:filepath', [
    resolveImageSet,
    function serveImages (req, res, next) {
      // Normalize our path to an absolute path
      // `/tmp/123456/gemini-report/images/root/Chrome~current.png.diff.png`
      // `gemini-report/images/root/Chrome~current.png` -> `$PWD/gemini-report/images/root/Chrome~current.png`
      var requestedFilepath = req.requestedFilepath;
      assert(req.requestedFilepath);
      if (!path.isAbsolute(requestedFilepath)) {
        requestedFilepath = path.join(process.cwd(), requestedFilepath);
      }

      // Otherwise, send our image
      // DEV: We don't use `send` as we want to avoid caching (e.g. for diffs)
      res.sendFile(requestedFilepath);
    }
  ]);

  // Define our application's page
  server.get('/', function rootShow (req, res, next) {
    res.render('index.jade', {image_sets: imageSets});
  });

  // Define our image update route
  // TODO: Add CSRF support (totally possible attack vector sadly =/)
  //    Probably use cookies or RocksDB
  server.post('/update-image-set/:filepath', [
    resolveImageSet,
    function updateImageSetSave (req, res, next) {
      // Verify we got our input
      // DEV: We could use `body-parser-multidict` but it's not always compatible (i.e. different API)
      if (!req.body.hasOwnProperty('ref')) {
        return next(new HttpError.BadRequest('Missing "ref" key on request'));
      }

      // Update our reference image
      req.imageSet.updateRef(req.body.ref, function handleResult (err, imagesEqual) {
        // If there was an error (e.g. couldn't read file), then callback with error
        if (err) {
          return next(err);
        }

        // Otherwise, send back result
        res.json({imagesEqual: imagesEqual});
      });
    }
  ]);
  // TODO: Remove `/overlay` as it should be its own repo entirely
  server.get('/overlay', function overlayShow (req, res, next) {
    res.render('overlay.jade');
  });

  // Return our server
  return server;
}

// Export our server builder
module.exports = generateServer;
