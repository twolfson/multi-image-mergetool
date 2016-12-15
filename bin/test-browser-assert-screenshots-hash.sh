#!/usr/bin/env bash
# Exit on first error
set -e

# Enable globstar
shopt -s globstar

# Update our sha256 info for both folders
# DEV: We update SHA relatively so we can `diff` actual contents to expected contents
cd test/browser/actual-screenshots
sha256sum **/*.png > contents.sha256
cd - &> /dev/null

# DEV: In CI, we don't have expected screenshots so opt-out of a SHA
if test "$(echo **/*.png)" != ""; then
  cd test/browser/expected-screenshots
  sha256sum **/*.png > contents.sha256
  cd - &> /dev/null
fi

# Compare our screenshot contents
diff test/browser/expected-screenshots/contents.sha256 test/browser/actual-screenshots/contents.sha256
