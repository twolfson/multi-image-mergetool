#!/usr/bin/env bash
# Exit on first error
set -e

# Collect our screenshots
# DEV: We use Xvfb despite windows being hidden to support Travis CI as it has no X11 otherwise
# https://github.com/segmentio/nightmare/tree/2.9.1#debugging
DEBUG=nightmare:actions* ./node_modules/.bin/xvfb-maybe node bin/_build-demo-screenshots.js

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
bin/test-browser-update-screenshots-signature.sh demo

# Compile and copy our latest assets
npm run build
rm -r demo/browser-dist || true
cp -r browser-dist demo/browser-dist

# Generate our demo JS
./node_modules/.bin/browserify --transform brfs browser/js/demo.js > demo/demo.js

# Generate our demo page with gh-pages ready URLs
# DEV: By using `stdin`, we can get `stdout` output and easily rename
jade_src="server/views/demo.jade"
cat "$jade_src" | \
  ./node_modules/.bin/jade --path "$jade_src" --obj demo/index.json | \
  tee demo/debug.html | \
  sed "s/\/browser-dist/\/multi-image-mergetool\/browser-dist/g" | \
  sed "s/\/images/\/multi-image-mergetool\/images/g" | \
  sed "s/\/demo.js/\/multi-image-mergetool\/demo.js/g" | \
  cat > demo/index.html
