#!/usr/bin/env bash
# Exit on first error
set -e

# Update our image signatures for both folders
# DEV: In CI, we don't have expected screenshots so opt-out of updates
if test "$(echo test/browser/expected-screenshots**/*.png)" != ""; then
  # DEV: Run our updates in parallel for performance
  bin/test-browser-update-screenshots-signature.sh test/browser/actual-screenshots &
  bin/test-browser-update-screenshots-signature.sh test/browser/expected-screenshots &
else
  bin/test-browser-update-screenshots-signature.sh test/browser/actual-screenshots &
fi
wait

# Compare our screenshot contents
set +e
diff --unified \
  test/browser/expected-screenshots/contents.sig \
  test/browser/actual-screenshots/contents.sig
exit_code="$?"
set -e

# Output human feedback and exit
if test "$exit_code" = "0"; then
  echo "Screenshots are in sync 🎉" 1>&2
else
  echo "Screenshots out of sync, update them via \`npm run test-browser-mergetool-screenshots\`" 1>&2
fi
exit "$?"
