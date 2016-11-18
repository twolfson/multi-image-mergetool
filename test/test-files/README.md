# multi-image-mergetool test-files
## Images
We have generated the following images via Pinta and `pngcrush`:

- diagonal.png
- dot.png

We have generated the following images via our library itself:

- diagonal-dot-diff.png

```bash
cd test/test-files
multi-image-mergetool \
    --assert \
    --current-images dot.png \
    --ref-images diagonal.png \
    --diff-images diagonal-dot-diff.png
pngcrush diagonal-dot-{diff,diff2}.png
mv diagonal-dot-{diff2,diff}.png
```
