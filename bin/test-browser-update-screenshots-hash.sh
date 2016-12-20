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

# Normalize our images via ImageMagicku
for filepath in **/*.png; do
  convert "$filepath" "$filepath.bmp" &
done
wait

# Generate our hash
sha256sum **/*.png.bmp > contents.sha256

# Move back to the previous directory
cd - &> /dev/null
