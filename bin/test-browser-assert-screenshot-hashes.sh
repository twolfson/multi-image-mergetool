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
for src_filepath in test/browser/actual-screenshots/**/*.png; do
  # Resolve our new filepath
  # test/browser/actual-screenshots/accept-all-similar-images.png
  #   -> test/browser/expected-screenshots/accept-all-similar-images.png
  #   -> test/browser/expected-screenshots/accept-all-similar-images.png.sha256
  target_filepath="$(echo "$src_filepath" | sed "s/actual-screenshots/expected-screenshots/")"
  target_filepath="$target_filepath.sha256"

  # Output its new hash
  sha256sum "$src_filepath"
done
