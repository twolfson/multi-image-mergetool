# multi-image-mergetool changelog
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
