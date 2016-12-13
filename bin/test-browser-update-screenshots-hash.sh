#!/usr/bin/env bash
# Exit on first error
set -e

# Enable globstar
shopt -s globstar

# Update our sha256 info
output_file="test/browser/expected-screenshots/contents.sha256"
sha256sum test/browser/actual-screenshots/**/*.png > "$output_file"
