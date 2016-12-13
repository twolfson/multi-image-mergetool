#!/usr/bin/env bash
# Exit on first error
set -e

# Enable globstar
shopt -s globstar

# Remove existing expected hashes
# DEV: We will be leveraging `git` for a quick/cheap file comparison (as we don't care about contents)
# DEV: By using removal, we can verify we didn't lose any hashes (i.e. a screenshot was deleted)
rm test/browser/expected-screenshots/**/*.png.sha256 &> /dev/null || true

# Compute new hashes
for filepath in test/browser/actual-screenshots/**/*.png; do
  echo "$filepath"
done
