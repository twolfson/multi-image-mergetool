// Load in our dependencies
var express = require('express');

// Define our constants
var LISTEN_PORT = 3000;
var LISTEN_HOSTNAME = 'localhost';

// Define our main funciton
function main() {
  // Create our server
  var app = express();

  // Configure our views
  // http://expressjs.com/en/guide/using-template-engines.html
  app.set('views', __dirname);
  app.set('view engine', 'jade');

  // Define simple route
  app.get('/', function rootShow (req, res, next) {
    // Pass along query string variables directly as render data
    res.render('index.jade', req.query);
  });

  // Listen on our port
  app.listen(LISTEN_PORT, LISTEN_HOSTNAME);

}

// If we are the main script
if (require.main === module) {
  // Start our server
  main();

  // Notify user of our server running
  console.log('Server running at http://' + LISTEN_HOSTNAME + ':' + LISTEN_PORT + '/');
}
