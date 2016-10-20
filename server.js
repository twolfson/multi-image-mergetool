// Load in our dependencies
var express = require('express');

// Define our constants
exports.LISTEN_PORT = 3000;
exports.LISTEN_HOSTNAME = 'localhost';

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

  // START: Prototype routes
  // Host gemini images directly
  app.use('/gemini-report', express.static(__dirname + '/gemini-report'));
  // END: Prototype routes

  // Listen on our port
  app.listen(exports.LISTEN_PORT, exports.LISTEN_HOSTNAME);

}

// If we are the main script
if (require.main === module) {
  // Start our server
  main();

  // Notify user of our server running
  console.log('Server running at http://' + exports.LISTEN_HOSTNAME + ':' + exports.LISTEN_PORT + '/');
}
