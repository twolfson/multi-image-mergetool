// Load in our dependencies
var program = require('commander');
var opener = require('opener');
var generateServer = require('./server');

// Set up our application
program.name = require('../package').name;
program.version(require('../package').version);

// Set up our options
program
  .option('-p, --port', 'Port for server to listen on', 2020)
  .option('-h, --hostname', 'Hostname for server to listen on', 'localhost')
  .option('--open-browser', 'Open browser window automatically', true);

// Override parse to start listening immediately
// https://github.com/tj/commander.js/blob/v2.9.0/index.js#L438-L443
var _parse = program.parse;
program.parse = function (argv) {
  // Call our normal parse
  _parse.call(this, argv);

  // Generate our server
  var server = generateServer(program);

  // Start listening on our server
  server.listen(program.port, program.hostname);

  // Save our server URL
  // TODO: Does express know this off hand?
  // DEV: We could use `url` but this is simpler
  var url = 'http://' + program.hostname + ':' + program.port + '/';

  // Notify user our server is running
  // DEV: `--help` and `--version` will exit the process early
  // DEV: Directly inspired by https://github.com/gemini-testing/gemini-gui/blob/v4.4.0/lib/cli.js#L30-L33
  console.log(program.name + ' is listening on ' + url);

  // Open browser window if requested
  if (program.openBrowser) {
    opener(url);
  }
};

// Export our CLI bindings
module.exports = program;
