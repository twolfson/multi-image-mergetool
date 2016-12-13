#!/usr/bin/env bash
# Exit on first error
set -e

# Download our README's screenshot
src_url="$(cat README.md | grep "cloud.githubusercontent.com" | sed -E "s/.+(http.+png).+/\1/")"
filename="$(basename "$src_url")"
expected_filepath="tmp/docs/$filename"
if ! test -f "$expected_filepath"; then
  mkdir -p "$(dirname "$expected_filepath")"
  wget "$src_url" --output-document "$expected_filepath"
fi

# Compare our screenshots
actual_filepath="test/browser/actual-screenshots/find-similar-matching.png"
if ! node bin/multi-image-mergetool --assert \
    --current-images "$actual_filepath" --ref-images "$expected_filepath"; then
  echo "Documentation screenshot doesn't match latest application screenshot" 1>&2
  echo "Please post latest screenshot to a GitHub issue and update the reference ($actual_filepath)" 1>&2
  exit 1
fi
