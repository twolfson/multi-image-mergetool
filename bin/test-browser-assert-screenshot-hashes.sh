#!/usr/bin/env bash
# Exit on first error
set -e

# Enable globstar
shopt -s globstar

# Update our sha256 info
output_file="test/browser/expected-screenshots/contents.sha256"
sha256sum test/browser/actual-screenshots/**/*.png > "$output_file"

# Use `git diff` to detect added/deleted/modified screenshots
# DEV: `sha256sum` has a `--check` option but it doesn't support checking if there's a new file
git_diff_output="$(git diff -- "$output_file")"
if test "$git_diff_output" != ""; then
  echo "Expected \"$output_file\" to be unchanged but it wasn\'t" 1>&2
  echo "$git_diff_output" 1>&2
  exit 1
fi
