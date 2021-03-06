# multi-image-mergetool changelog
1.32.1 - Fixed Sinon context binding in tests

1.32.0 - Improved demo accuracy. Fixes #8

1.31.0 - Added demo page

1.30.0 - Added support for new images

1.29.0 - Moved to Backbone with one-way flow and mutation based rendering for consolidated render functions

1.28.0 - Updated CI image comparison logic to be more performant

1.27.0 - Refactored render logic into standalone `render` functions, making potential for virtual DOM easier

1.26.0 - Moved from Domo to hyperscript for modern library and virtual DOM/declarative UI flexibility

1.25.0 - Revisited screenshot validation to make it less `git` noisy and more accurate of filesystem expectations

1.24.2 - Removed development `imageSets` limit of 20

1.24.1 - Moved to stubbing Multispinner via ES5 getters/setters instead of `stdout.write`

1.24.0 - Added validation for screenshots from test suite

1.23.1 - Updated screenshot in README

1.23.0 - Added throttling to image comparison and loading spinners

1.22.1 - Fixed lint error and tests

1.22.0 - Added cachebusting tests

1.21.0 - Added performance tests

1.20.1 - Added image generation inside of test utilities

1.20.0 - Relocated result container generation ImageSet and moved body level bindings to classes

1.19.0 - Relocated results generation to its own class

1.18.1 - Enabled disabled assertions

1.18.0 - Normalized to `imageSet` in browser/server where appropriate

1.17.0 - Relocated finding matching image sets to `ImageSet.findSimilarImageSets()` method

1.16.0 - Moved from `global.application` to `GlobalState`

1.15.0 - Create ImagetSet constructor and consolidated acceptChanges/updateReferenceImage actions

1.14.7 - Added browser tests for overlay

1.14.6 - Cleaned up copy/pasted components between tests

1.14.5 - Fixed up test suite

1.14.4 - Added browser tests for "Update similar images"

1.14.3 - Added browser tests for "Accept similar images"

1.14.2 - Added test to verify screenshot in README is up to date

1.14.1 - Added screenshot to README and updated test images to make overlay more obvious

1.14.0 - Added support for `--assert`

1.13.1 - Moved from `testFilesUtils` to `fsUtils` to properly test `mkdirp` in `ImageSet`

1.13.0 - Added CLI tests and repaired support for no `--diff-images`

1.12.2 - Repaired Travis CI by adding image preloading to browser tests and fixing Node.js req.body call

1.12.1 - Added browser tests for "Accept changes" button

1.12.0 - Added server tests for /update-image-set/:filepath

1.11.1 - Added server tests for /images/:filepath

1.11.0 - Added initial server tests

1.10.0 - Added tests for "Find similar images" and repaired upsizing of small images in similar results

1.9.1 - Added screenshot uploading for Travis CI and repaired CI tests via compiling first

1.9.0 - Fixed mkdirp for custom diff screenshots and added script to assert local screenshots

1.8.0 - Repaired overlay hiding on image set collapse

1.7.0 - Added support for `--ref-images`, `--current-images`, `--diff-images`, and `--loader`

1.6.0 - Added screenshot recording to tests

1.5.0 - Added basic application tests for titles, statuses, and collapses

1.4.1 - Repaired broken test due to path change

1.4.0 - Relocated browser and server files to separate folders for clearer intent/testing

1.3.0 - Moved CSS to standalone files

1.2.2 - Added .npmignore to .gitignore

1.2.1 - Removed redundant build step from release

1.2.0 - Moved scripts to JS files and added build chain

1.1.0 - Added support for accepting similar images

1.0.0 - Initial release
