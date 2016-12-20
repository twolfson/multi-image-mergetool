#!/usr/bin/env bash
# Exit on first error
set -e

# Enable globstar
shopt -s globstar

# Compare our images
bin/multi-image-mergetool \
  --current-images test/browser/actual-screenshots/**/*.png \
  --ref-images $(echo test/browser/actual-screenshots/**/*.png | sed "s/actual-screenshots/expected-screenshots/g") \
  --diff-images $(echo test/browser/actual-screenshots/**/*.png | sed "s/actual-screenshots/diff-screenshots/g")

# Update our signature info
bin/test-browser-update-screenshots-signature.sh test/browser/expected-screenshots
