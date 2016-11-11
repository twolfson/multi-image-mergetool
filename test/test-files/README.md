# multi-image-mergetool test-files
## Images
We have generated the following images via Pinta and `pngcrush`:

- checkerboard.png
- dot.png

We have generated the following images via our library itself:

- checkerboard-dot-diff.png

```bash
cd test/test-files
multi-image-mergetool \
    --current-images dot.png \
    --ref-images checkerboard.png \
    --diff-images checkerboard-dot-diff.png \
    --no-browser-open
pngcrush checkerboard-dot-{diff,diff2}.png
mv checkerboard-dot-{diff2,diff}.png
```
