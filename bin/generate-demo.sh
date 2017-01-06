#!/usr/bin/env bash
# Exit on first error
set -e

# Collect our screenshots
node bin/_gather-demo-screenshots.js

# Generate diffs for our images
# DEV: We ignore failure as it's expected
set +e
node bin/multi-image-mergetool \
    --assert \
    --current-images demo/images/current/*.png \
    --ref-images $(echo demo/images/current/*.png | sed "s/current/ref/g") \
    --diff-images $(echo demo/images/current/*.png | sed "s/current/diff/g")
set -e

# Update our image signatures
# TODO: Add signature comparison to test suite -- likely via Travis CI (generate demo, verify no git changes)
bin/test-browser-update-screenshots-signature.sh demo

# Compile and copy our latest assets
npm run build
cp -r browser-dist demo/browser-dist

# Generate our demo page
./node_modules/.bin/jade server/views/index.jade --obj demo/index.json --out demo
