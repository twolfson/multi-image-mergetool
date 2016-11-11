# multi-image-mergetool test-files
## Images
We have generated the following images via Pinta and `pngcrush`:

- checkerboard.png
- dot.png

We have generated the following images via our library itself:

- checkerboard-dot-diff.png

```bash
node --eval "
// DEV: All paths are resolved from root PWD
var looksSameComparator = require('./server/image-comparators/looks-same');
looksSameComparator({
  refImg: './test/test-files/checkerboard.png',
  currentImg: './test/test-files/dot.png',
  diffImg: './test/test-files/checkerboard-dot-diff.png',
}, console.log);
"
pngcrush ./test/test-files/checkerboard-dot-{diff,diff2}.png
mv ./test/test-files/checkerboard-dot-{diff2,diff}.png
```
