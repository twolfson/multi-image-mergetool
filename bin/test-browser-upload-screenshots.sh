#!/usr/bin/env bash
# Based on https://github.com/twolfson/twolfson.com/blob/3.102.0/test/perceptual-tests/upload-screenshots.sh
#   and https://gist.github.com/twolfson/ad9084fb286e1baee969bbe5eabebe5f
# Exit on first error
set -e

# Install underscore-cli for hacking
if ! which underscore &> /dev/null; then
  npm install -g underscore-cli
fi

# Navigate to pereceptual-test directory
# cd test/browser

# Prepare location to collect delete commands
if test "$TRAVIS_BUILD_NUMBER" = ""; then
  TRAVIS_BUILD_NUMBER="dev"
fi
output_dir="tmp/travis/$TRAVIS_BUILD_NUMBER"
download_cmds=""
delete_cmds=""

for filepath in test/test-files/dot.png; do
  filename="$(basename filepath)"
  content_type="image/png"
  result="$(curl -X POST "http://imgur.com/upload" \
    -H "Referer: http://imgur.com/upload" \
    -F "Filedata=@\"$filepath\";filename=$filename;type=$content_type")"
  # result='{"data":{"hashes":["Jaq8ROu"],"hash":"Jaq8ROu","deletehash":"RjCdxTOatwK0UF1","album":false,"edit":false,"gallery":null,"animated":false,"height":10,"width":10,"ext":".png"},"success":true,"status":200}'
  if test "$(echo "$result" | underscore extract 'success')" != "true"; then
    echo "There was a problem uploading \"$filepath\"" 1>&2
    echo "$result" 1>&2
  else
    # {data: ...} -> Jaq8ROu
    filehash="$(echo "$result" | underscore extract --outfmt text 'data.hash')"
    # Jaq8ROu -> http://i.imgur.com/Jaq8ROu.png
    url="http://i.imgur.com/${filehash}.png"
    # wget "tmp/travis/1234/overlay-hidden.png" "http://i.imgur.com/Jaq8ROu.png"
    download_cmds="${download_cmds}wget -O \"$output_dir/$filepath\" \"$url\" \n"
  fi
done

echo "All uploads complete!"
echo ""
echo "Download via:"
echo "    mkdir -p $output_dir/actual-screenshots"
# DEV: `echo -e` processes line feeds
echo -e "    $download_cmds"
