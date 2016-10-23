// Load in our dependencies
var program = require('commander');

// Set up our application
program.name = require('../package').name;
program.version(require('../package').version);

// Export our CLI bindings
module.exports = program;
