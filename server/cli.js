// Load in our dependencies
var async = require('async');
var assert = require('assert');
var cliSpinners = require('cli-spinners');
var glob = require('glob');
var opener = require('opener');
var parser = require('yargs');
var generateServer = require('./index');
var Multispinner = require('multispinner');
var MultispinnerSpinners = require('multispinner/lib/spinners');
var ImageSet = require('./image-set');
var logger = require('./logger');
var pkg = require('../package.json');

// Set up our options
// https://github.com/yargs/yargs/tree/v6.3.0#optionkey-opt
// DEV: We don't support skipping initial diff as it requires persisting results between process reboots
//   which isn't cost effective for maintenance at the moment
// DEV: Image loaders explored in https://gist.github.com/twolfson/cd225d49b4b8a3ad51fbc8cd52433dcd
parser
  // DEV: Order of usage/example options follow the same order as options themself
  .usage('$0 [options] --current-images <current-images...> --ref-images <ref-images...>')
  .example('Load from paths:')
  .example('  $0 --current-images current1.png current2.png --ref-images ref1.png ref2.png')
  .example('  $0 --current-images current1.png current2.png --ref-images ref1.png ref2.png ' +
    '--diff-images diff1.png diff2.png')
  .example('Load from `gemini` and `gemini-report` folders:')
  .example('  $0 --loader gemini')
  // jscs:disable maximumLineLength
  // Look for files with same paths from their root folders
  // - `--loader separate-folders --ref-folder path/to/expected_screenshots --current-folder path/to/actual_screenshots`
  //     - Folder parameters would be required
  //     - `--loader separate-folders --ref-folder path/to/expected_screenshots --current-folder path/to/actual_screenshots --diff-folder path/to/diff_screenshots`
  // Look for leaf folders in `--folder` and uses images matching `--ref-pattern` and `--current-pattern`
  // - `--loader same-folders --folder path/to/screenshots --ref-pattern 'ref.png' --current-pattern 'current.png'`
  //     - Requires all parameters `--folder`, `--ref-pattern`, `--current-pattern` (maybe use `*ref*` and `*current*` as defaults but prob not for now)
  //     - `--loader same-folders --folder path/to/screenshots --ref-pattern 'ref.png' --current-pattern 'current.png' --diff-pattern 'diff.png'`
  // jscs:enable maximumLineLength
  .option('current-images', {
    describe: 'Current images for comparison (required if no --loader)',
    type: 'array'
  })
  .option('ref-images', {
    describe: 'Locations to load/save reference images (required if no --loader)',
    type: 'array'
  })
  .option('diff-images', {
    describe: 'Locations to save diff images',
    type: 'array'
  })
  .option('loader', {
    choices: ['gemini'/*, 'separate-folders', 'same-folders'*/],
    describe: 'Loading mechanism to find images',
    type: 'string'
  })
  .option('assert', {
    describe: 'Only perform assertions (no server). If all images match, exits with 0. Otherwise, exits with 1',
    type: 'boolean'
  })
  .option('port', {
    alias: 'p',
    describe: 'Port for server to listen on',
    default: 2020,
    type: 'number'
  })
  .option('hostname', {
    alias: 'h',
    describe: 'Hostname for server to listen on',
    default: 'localhost',
    type: 'string'
  })
  .option('verbose', {
    describe: 'Enable verbose logging',
    type: 'boolean'
  })
  .option('no-browser-open', {
    describe: 'Prevent browser window from opening automatically',
    type: 'boolean'
  });

// Set up our package, only allow valid arguments, and disable line wrapping
// DEV: We set up `version` and `help` at end since they are less important and order matters to yargs
parser
  .version(pkg.version)
  .help(true)
  .strict()
  .wrap(null);

// Define normalization for loaders/directories/patterns
function checkFn(params) {
  if (params.loader === undefined) {
    // DEV: We specify `current` first to match order of examples/options
    assert(params.currentImages, 'Expected `--current-images` or `--loader` to be defined but they weren\'t');
    assert(params.refImages, 'Expected `--ref-images` to be defined but it wasn\'t');
  }
  return true;
}
parser.check(checkFn);

// Expose generateServer and opener binding for easy testing
exports.generateServer = generateServer;
exports.opener = opener;

// Expose our parse method
exports._parse = function (argv, callback) {
  // Parse our arguments
  var params = parser.parse(argv);

  // Re-run checkFn for sanity (already run by `yargs`)
  // DEV: Sanity edge case would be someone directly calling `cli`
  checkFn(params);

  // If we have no loader, verify we have
  var currentImages, refImages, diffImages;
  if (params.loader === undefined) {
    currentImages = params.currentImages;
    refImages = params.refImages;
    diffImages = params.diffImages;
  // Otherwise, if our loader is Gemini, resolve its references
  } else if (params.loader === 'gemini') {
    currentImages = glob.sync('gemini-report/images/**/*~current.png');
    refImages = currentImages.map(function resolveRefImage (currentImage) {
      // gemini-report/images/root/default-large/Chrome~current.png ->
      //  gemini/screens/root/default-large/Chrome.png
      return currentImage.replace('gemini-report/images', 'gemini/screens')
        .replace('~current.png', '.png');
    });
    diffImages = currentImages.map(function resolveRefImage (currentImage) {
      // gemini-report/images/root/default-large/Chrome~current.png ->
      //   gemini-report/images/root/default-large/Chrome~diff.png
      return currentImage.replace('~current.png', '~diff.png');
    });
  // Otherwise, complain about an invalid loader
  } else {
    return callback(new Error('Unexpected loader: ' + params.loader));
  }

  // Configure our logger singleton
  logger.configure(params);

  // Log CLI info to user
  logger.verbose.info('CLI arguments received', argv);

  // Generate our image sets
  var imageSets;
  try {
    imageSets = ImageSet.generateSets(currentImages, refImages, {
      diffImages: diffImages
    });
  } catch (err) {
    return callback(err);
  }

  // Run our image comparisons
  // http://caolan.github.io/async/docs.html#eachLimit
  // DEV: We restrict to 10 comparisons at a time to not overwhelm CPU/RAM
  var imagesEqualCount = 0;
  logger.info('Comparing images...');
  // Output multiple spinners for user feedback
  // https://github.com/codekirei/node-multispinner/blob/318a09dd41acd41eab90ca543f61eff25a12a860/extras/api.md
  // https://github.com/codekirei/node-multispinner/blob/318a09dd41acd41eab90ca543f61eff25a12a860/extras/api.md#options-optional
  var multispinner = imageSets.length ? new Multispinner([imageSets[0].id], {frames: cliSpinners.dots.frames}) : null;
  async.eachLimit(imageSets, 10, function compareImageSet (imageSet, cb) {
    // Add a new spinner for user feedback
    // https://github.com/codekirei/node-multispinner/blob/318a09dd41acd41eab90ca543f61eff25a12a860/index.js#L53-L58
    // https://github.com/codekirei/node-multispinner/blob/318a09dd41acd41eab90ca543f61eff25a12a860/lib/spinners.js#L45-L63
    // https://github.com/codekirei/node-multispinner/blob/318a09dd41acd41eab90ca543f61eff25a12a860/lib/spinners.js#L102-L108
    // DEV: Relevant issue: https://github.com/codekirei/node-multispinner/issues/2
    var imageSetId = imageSet.id;
    multispinner.spinners[imageSetId] = MultispinnerSpinners.prototype.spinnerObj(imageSetId);
    imageSet.compare(function handleComparison (err, imagesEqual) {
      // If there was an error (e.g. file not found), callback with it
      if (err) {
        multispinner.error(imageSetId);
        return cb(err);
      }

      // Otherwise, log our result and update our counter
      // https://github.com/gemini-testing/gemini/blob/v4.13.0/lib/reporters/flat-factory/flat.js#L41-L78
      if (imagesEqual) {
        multispinner.success(imageSetId);
        imagesEqualCount += 1;
      } else {
        multispinner.error(imageSetId);
        if (imageSet.isNew) {
          multispinner.spinners[imageSetId].text += ' (new)';
        }
      }

      // Callback
      cb(null);
    });
  }, function handleResults (err) {
    // Monkey-patch over multispinner instance to prevent waiting for it to finish
    // DEV: Without this monkey-patch, our output is overwritten =/
    // DEV: Relevant issue: https://github.com/codekirei/node-multispinner/issues/3
    // https://github.com/codekirei/node-multispinner/blob/318a09dd41acd41eab90ca543f61eff25a12a860/index.js#L94-L112
    multispinner.allCompleted = function () { return true; };
    multispinner.loop();
    multispinner.loop = function () {};

    // If there was an error, throw it
    if (err) {
      return callback(err);
    }

    // Log about our matching images
    logger.info('Images matched: ' + imagesEqualCount + ' of ' + imageSets.length);

    // If all images matched, then exit
    if (imagesEqualCount === imageSets.length) {
      return callback(null, 0);
    }

    // If we are performing an assert, then exit
    if (params.assert) {
      return callback(null, 1);
    }

    // Generate our server with our image sets
    var server = exports.generateServer(imageSets, params);

    // Start listening on our server
    server.listen(params.port, params.hostname);

    // Save our server URL
    // DEV: We could use `url` but this is simpler
    var url = 'http://' + params.hostname + ':' + params.port + '/';

    // Notify user our server is running
    // DEV: `--help` and `--version` will exit the process early
    // DEV: Directly inspired by https://github.com/gemini-testing/gemini-gui/blob/v4.4.0/lib/cli.js#L30-L33
    logger.info('Server is listening on ' + url);

    // Open browser window if requested
    if (!params.noBrowserOpen) {
      exports.opener(url);
    }

    // Callback with no exit code
    callback(null, null);
  });
};

exports.parse = function (argv) {
  // Run normal parser function
  exports._parse(argv, function handleParse (err, exitCode) {
    // If we encounter an error, then throw it
    if (err) {
      throw err;
    }

    // Otherwise, if there's an exit code, then use it
    if (exitCode !== null) {
      process.exit(exitCode);
    }

    // Otherwise, do nothing (void is semantic for noop here)
    void 0;
  });
};
