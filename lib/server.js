// Load in our dependencies
var express = require('express');

// Define our server builder
function generateServer(imageSets, options) {
  // Create our server
  var server = express();

  // Configure our views
  // http://expressjs.com/en/guide/using-template-engines.html
  server.set('views', __dirname);
  server.set('view engine', 'jade');

  // Define our routes
  server.get('/', function rootShow (req, res, next) {
    res.render('index.jade');
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
