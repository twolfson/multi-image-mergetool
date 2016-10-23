// Load in our dependencies
var program = require('commander');
var opener = require('opener');
var generateServer = require('./server');
var logger = require('./logger');

// Set up our application
program.name = require('../package').name;
program.version(require('../package').version);

// Set up our options
program
  .option('-p, --port <port>', 'Port for server to listen on (default: 2020)', 2020)
  .option('-h, --hostname <hostname>', 'Hostname for server to listen on (default: localhost)', 'localhost')
  .option('--verbose', 'Enable verbose logging')
  .option('--no-browser-open', 'Prevent browser window from opening automatically');

// Override parse to start listening immediately
// https://github.com/tj/commander.js/blob/v2.9.0/index.js#L438-L443
var _parse = program.parse;
program.parse = function (argv) {
  // Call our normal parse
  _parse.call(this, argv);

  // Configure our logger singleton
  logger.configure(program);

  // Add in development constants
  // TODO: Sort out image input info (probably 2 different globs, 1 for ref, 1 for current)
  //   We are moving away from using Gemini's JSON reporter and more about
  logger.verbose.log('CLI arguments received', argv);

  // Generate our server
  var server = generateServer(program);

  // Start listening on our server
  server.listen(program.port, program.hostname);

  // Save our server URL
  // DEV: We could use `url` but this is simpler
  var url = 'http://' + program.hostname + ':' + program.port + '/';

  // Notify user our server is running
  // DEV: `--help` and `--version` will exit the process early
  // DEV: Directly inspired by https://github.com/gemini-testing/gemini-gui/blob/v4.4.0/lib/cli.js#L30-L33
  logger.info('Server is listening on ' + url);

  // Open browser window if requested
  if (program.openBrowser) {
    opener(url);
  }
};

// Export our CLI bindings
module.exports = program;
