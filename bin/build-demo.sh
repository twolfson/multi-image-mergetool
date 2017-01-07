#!/usr/bin/env bash
# Exit on first error
set -e

# Start our webdriver server
export DISPLAY=":99"
Xvfb "$DISPLAY" &
xvfb_pid="$!"
./node_modules/.bin/webdriver-manager start &
webdriver_pid="$!"
echo "$xvfb_pid $webdriver_pid"
jobs
jobs -x -r
trap -- 'kill -s SIGINT -$xvfb_pid; kill -s SIGINT -$webdriver_pid' EXIT

# Wait for our server to start
sleep 3
npm run verify-webdriver-running

sleep 1

exit 0


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
