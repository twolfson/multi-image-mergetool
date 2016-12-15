#!/usr/bin/env bash
# Exit on first error
set -e

# Update our sha256 info for both folders
# DEV: In CI, we don't have expected screenshots so opt-out of a SHA
if test "$(echo test/browser/expected-screenshots**/*.png)" != ""; then
  # DEV: Run our updates in parallel for performance
  $(
    bin/test-browser-update-screenshots-hash.sh test/browser/actual-screenshots &
    bin/test-browser-update-screenshots-hash.sh test/browser/expected-screenshots &
  )
else
  bin/test-browser-update-screenshots-hash.sh test/browser/actual-screenshots
fi

# Compare our screenshot contents
diff --unified \
  test/browser/expected-screenshots/contents.sha256 \
  test/browser/actual-screenshots/contents.sha256
