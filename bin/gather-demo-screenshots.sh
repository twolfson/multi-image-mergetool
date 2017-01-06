#!/usr/bin/env bash
# Exit on first error
set -e

# Collect our screenshots
node bin/_gather-demo-screenshots.js

# Generate diffs for our images
node bin/multi-image-mergetool \
    --assert \
    --current-images demo/current/*.png \
    --ref-images $(echo demo/current/*.png | sed "s/current/ref/g") \
    --diff-images $(echo demo/current/*.png | sed "s/current/diff/g")

# Update our image signatures
bin/test-browser-update-screenshots-signature.sh demo
