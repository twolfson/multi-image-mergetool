#!/usr/bin/env bash
# Exit on first error
set -e

# Enable globstar
shopt -s globstar

# Verify we received our directories
directory="$1"
if test "$directory" != ""; then
  echo "Expected directory to be defined but it wasn\'t. Please pass in a directory parameter" 1>&2
  exit 1
fi

# Navigate into our directory
# DEV: We update SHA relatively so we can `diff` actual contents to expected contents
cd "$directory"

# Normalize each of our images via Node.js
# DEV: PhantomJS generates images with different data than pngjs so hashes aren't consistent otherwise
# DEV: We could do this via ImageMagick and pngcrush but this is simpler dependency-wise
for filepath in **/*.png; do
  node --eval "
    // Load in our dependencies
    var PNG = require('pngjs').PNG;
    var fs = require('fs');

    // Load our image
    var filepath = process.argv[1];
    require('assert')(filepath, 'Expected filepath to be defined but it wasn\'t');
    fs.createReadStream(filepath)
      .pipe(new PNG())
      .on('parsed', function () {
        // When our image is done loading, re-pack it
        this.pack().pipe(fs.createWriteStream(filepath));
      });
    "
done

# Generate our hash
sha256sum **/*.png > contents.sha256

# Move back to the previous directory
cd - &> /dev/null
