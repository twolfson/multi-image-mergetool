#!/usr/bin/env bash
# Exit on first error
set -e

# Enable globstar
shopt -s globstar

# On keyboard interrupt, update our signature info
trap 'bin/test-browser-update-screenshots-signature.sh test/browser/expected-screenshots' INT

# Compare our images
bin/multi-image-mergetool \
  --current-images test/browser/actual-screenshots/**/*.png \
  --ref-images $(echo test/browser/actual-screenshots/**/*.png | sed "s/actual-screenshots/expected-screenshots/g") \
  --diff-images $(echo test/browser/actual-screenshots/**/*.png | sed "s/actual-screenshots/diff-screenshots/g")

# If we had no errors, update screenshot signature
bin/test-browser-update-screenshots-signature.sh test/browser/expected-screenshots
