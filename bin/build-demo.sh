#!/usr/bin/env bash
# Exit on first error
set -e

# Collect our screenshots
node bin/_build-demo-screenshots.js

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
# DEV: If image signatures continue to break, look into using `getWindowSize()` and `waitFor()` to wait for browser to update
bin/test-browser-update-screenshots-signature.sh demo

# Compile and copy our latest assets
npm run build
cp -r browser-dist demo/browser-dist

# Generate our demo JS
./node_modules/.bin/browserify --transform brfs browser/js/demo.js > demo/demo.js

# Generate our demo page with injected JS
# DEV: By using `stdin`, we can get `stdout` output and easily rename
jade_src="server/views/demo.jade"
cat "$jade_src" | \
  ./node_modules/.bin/jade --path "$jade_src" --obj demo/index.json \
  > demo/index.html
