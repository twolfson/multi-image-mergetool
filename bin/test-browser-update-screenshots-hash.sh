#!/usr/bin/env bash
# Exit on first error
set -e

# Enable globstar
shopt -s globstar

# Verify we received our directories
directory="$1"
if test "$directory" = ""; then
  echo "Expected directory to be defined but it wasn\'t. Please pass in a directory parameter" 1>&2
  exit 1
fi

# Navigate into our directory
# DEV: We update SHA relatively so we can `diff` actual contents to expected contents
cd "$directory"

# Normalize our images via Node.js
# DEV: PhantomJS generates images with different data than pngjs so hashes aren't consistent otherwise
# DEV: We could do this via ImageMagick and pngcrush but this is simpler dependency-wise
node --eval "
  // Load in our dependencies
  var assert = require('assert');
  var PNG = require('pngjs').PNG;
  var fs = require('fs');

  // For each of our images
  // DEV: Node.js will exit automatically when all processes are done
  var filepathArr = process.argv.slice(1);
  assert.notEqual(filepathArr.length, 0, 'Expected at least 1 filepath');
  filepathArr.forEach(function normalizeFilepath (filepath) {
    // Load our image
    fs.createReadStream(filepath)
      .pipe(new PNG())
      .on('parsed', function () {
        // When our image is done loading, re-pack it
        this.pack().pipe(fs.createWriteStream(filepath));
      });
  });
  " -- **/*.png

# Generate our hash
sha256sum **/*.png > contents.sha256

# Move back to the previous directory
cd - &> /dev/null
