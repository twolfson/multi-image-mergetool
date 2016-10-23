// Load in our dependencies
var Console = require('console').Console;
var Writable = require('stream').Writable;

// Create a `/dev/null` stream
// DEV: Based on https://github.com/thlorenz/dev-null/blob/v0.1.1/index.js
var devNull = new Writable();
devNull._write = function (_, __, cb) { setImmediate(cb); };

// Define null and normal loggers
// https://github.com/nodejs/node/blob/v6.9.1/lib/console.js#L100-L101
// DEV: Supported back to Node.js@0.10 so we are fine
//   https://github.com/nodejs/node/blob/v0.10.48/lib/console.js#L134-L135
var normalConsole = new Console(process.stdout, process.stderr);
var nullConsole = new Console(devNull, devNull);

// Export our default and verbose loggers
module.exports = normalConsole;
module.exports.verbose = nullConsole;

// Export a method to export a proper verbose logger
module.exports.configure = function (options) {
  module.exports.verbose = options.verbose ? normalConsole : nullConsole;
};
