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

# Retrieve image signatures via ImageMagick
# http://www.imagemagick.org/script/identify.php
# http://www.imagemagick.org/script/escape.php
# DEV: We write signature first so alignment is consistent
# image.png -> abcdef12345... path/to/image.png
parallel --keep-order "identify -format \"%# %i\" \"{}\"" ::: **/*.png > contents.sig

# Move back to the previous directory
cd - &> /dev/null
