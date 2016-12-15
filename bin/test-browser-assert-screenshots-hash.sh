#!/usr/bin/env bash
# Exit on first error
set -e

# Update our sha256 info for both folders
bin/test-browser-update-screenshots-hash.sh test/browser/actual-screenshots

# DEV: In CI, we don't have expected screenshots so opt-out of a SHA
if test "$(echo **/*.png)" != ""; then
  bin/test-browser-update-screenshots-hash.sh test/browser/expected-screenshots
fi

# Compare our screenshot contents
diff test/browser/expected-screenshots/contents.sha256 test/browser/actual-screenshots/contents.sha256
