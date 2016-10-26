// Load in our dependencies
var async = require('async');
var chalk = require('chalk');
var glob = require('glob');
var program = require('commander');
var opener = require('opener');
var generateServer = require('./server');
var ImageSet = require('./image-set');
var logger = require('./logger');

// Set up our application
program.name = require('../package').name;
program.version(require('../package').version);

// Define our constants
var ICON_SUCCESS = chalk.green('✓');
var ICON_FAIL = chalk.red('✘');

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

  // Log CLI info to user
  logger.verbose.log('CLI arguments received', argv);

  // TODO: Add skipping initial comparison as a GitHub issue maybe?
  // DEV: We don't support skipping initial comparison
  //   The reason is we would have to persist approval/disapprovals in case of any process reboots
  //   as well as guarantee initial diff images
  //   Maybe this is possible with a custom JSON reporter for Gemini, it needs exploration and cost analysis

  // Add in development constants
  // jscs:disable maximumLineLength
  // TODO: We need to derive `refImages` from `currentImages` to support new images
  //   We explored possibilities here: https://gist.github.com/twolfson/cd225d49b4b8a3ad51fbc8cd52433dcd
  //   Currently thinking 4 solutions (starting with glob-less only for now)
  //    - `--ref-images path/to/ref1.png path/to/ref2.png --current-images path/to/current1.png path/to/current2.png` - See glob-less solution
  //    - `--loader gemini` - Looks at proper folders and loads from them
  //    - `--loader separate-folders --ref-folder path/to/expected_screenshots --current-folder path/to/actual_screenshots` - Looks for files with same paths from their root folders
  //        - Folder parameters would be required
  //    - `--loader same-folders --folder path/to/screenshots --ref-pattern 'ref.png' --current-pattern 'current.png'` - Looks for leaf folders in `--folder` and uses images matching `--ref-pattern` and `--current-pattern`
  //        - Requires all parameters `--folder`, `--ref-pattern`, `--current-pattern` (maybe use `*ref*` and `*current*` as defaults but prob not for now)
  // jscs:enable maximumLineLength
  //    With these preset variants, we could easily use a `--diff-pattern` as well for non-temporary diff paths
  program.currentImages = glob.sync('gemini-report/images/**/*~current.png');
  // program.currentImages = glob.sync('gemini-report/**/default-large/*~current.png');
  program.refImages = program.currentImages.map(function resolveRefImage (currentImg) {
    // gemini-report/images/root/default-large/Chrome~current.png ->
    //  gemini/screens/root/default-large/Chrome.png
    return currentImg.replace('gemini-report/images', 'gemini/screens')
      .replace('~current.png', '.png');
  });

  // Generate our image sets
  var imageSets = ImageSet.generateSets(program.currentImages, program.refImages, program);

  // Run our image comparisons
  var imagesEqualCount = 0;
  logger.info('Comparing images...');
  async.each(imageSets, function compareImageSet (imageSet, cb) {
    imageSet.compare(function handleComparison (err, imagesEqual) {
      // If there was an error (e.g. file not found), callback with it
      if (err) {
        return cb(err);
      }

      // Otherwise, log our result and update our counter
      // https://github.com/gemini-testing/gemini/blob/v4.13.0/lib/reporters/flat-factory/flat.js#L41-L78
      if (imagesEqual) {
        logger.info(ICON_SUCCESS + ' ' + imageSet.refImg);
        imagesEqualCount += 1;
      } else {
        logger.info(ICON_FAIL + ' ' + imageSet.refImg);
      }

      // Callback
      cb(null);
    });
  }, function handleResults (err) {
    // If there was an error, throw it
    if (err) {
      throw err;
    }

    // Log about our matching images
    logger.info('Images matched: ' + imagesEqualCount + ' of ' + imageSets.length);

    // If all images matched, then exit
    if (imagesEqualCount === imageSets.length) {
      process.exit(0);
      return;
    }

    // Generate our server with our image sets
    var server = generateServer(imageSets, program);

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
    if (program.browserOpen) {
      opener(url);
    }
  });
};

// Export our CLI bindings
module.exports = program;