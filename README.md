# multi-image-mergetool [![Build status](https://travis-ci.org/twolfson/multi-image-mergetool.svg?branch=master)](https://travis-ci.org/twolfson/multi-image-mergetool)

Resolve multiple image conflicts at the same time

This was built to resolve conflicts in full page test screenshots where auxilary content may have changed (e.g. navigation). We prefer full page screenshots over ignored content/component based screenshots as it is less brittle and catches unexpected issues.

**Features:**

- Find/resolve common image changes via overlay selection
- Support for any image configuration (e.g. same directory, same name/different directory, [Gemini][gemini-example], specific names)

**Demo:**

<http://twolfson.github.io/multi-image-mergetool>

**Screenshot:**

![Screenshot from tests](https://cloud.githubusercontent.com/assets/902488/21469486/c1308b5c-ca05-11e6-83a1-094b7f37ac98.png)

[gemini-example]: #gemini

## Getting Started
Install the module via:

```bash
# Install multi-image-mergetool globally
npm install -g multi-image-mergetool

# Run multi-image-mergetool against a Gemini test suite
multi-image-mergetool --loader gemini
# Comparing images...
# ✘ gemini/screens/root/default-small/Chrome.png
# ✘ gemini/screens/root/default-medium/Chrome.png
# ✓ gemini/screens/root/default-large/Chrome.png
# ✓ gemini/screens/root/z-default-large2/Chrome.png
# ✓ gemini/screens/root/z-default-large3/Chrome.png
# Images matched: 3 of 5
# Server is listening on http://localhost:2020/

# Browser window will automatically be opened

# Alternatively compare one-off images by their paths
multi-image-mergetool \
    --current-images path/to/current1.png path/to/current2.png \
    --ref-images path/to/ref1.png path/to/ref2.png

# Optionally define custom diff paths
multi-image-mergetool \
    --current-images path/to/current1.png path/to/current2.png \
    --ref-images path/to/ref1.png path/to/ref2.png \
    --diff-images path/to/diff1.png path/to/diff2.png
```

## Donations
Support this project and [others by twolfson][projects] via [donations][support-me]

[projects]: http://twolfson.com/projects
[support-me]: http://twolfson.com/support-me

## Documentation
### CLI
Our CLI supports the following options:

```
$ multi-image-mergetool --help
multi-image-mergetool [options] --current-images <current-images...> --ref-images <ref-images...>

Options:
  --current-images   Current images for comparison (required if no --loader)  [array]
  --ref-images       Locations to load/save reference images (required if no --loader)  [array]
  --diff-images      Locations to save diff images  [array]
  --loader           Loading mechanism to find images  [string] [choices: "gemini"]
  --assert           Only perform assertions (no server). If all images match, exits with 0. Otherwise, exits with 1  [boolean]
  --port, -p         Port for server to listen on  [number] [default: 2020]
  --hostname, -h     Hostname for server to listen on  [string] [default: "localhost"]
  --verbose          Enable verbose logging  [boolean]
  --no-browser-open  Prevent browser window from opening automatically  [boolean]
  --version          Show version number  [boolean]
  --help             Show help  [boolean]

Examples:
  Load from paths:
    multi-image-mergetool --current-images current1.png current2.png --ref-images ref1.png ref2.png
    multi-image-mergetool --current-images current1.png current2.png --ref-images ref1.png ref2.png --diff-images diff1.png diff2.png
  Load from `gemini` and `gemini-report` folders:
    multi-image-mergetool --loader gemini
```

**Notes:**

- The `--current-images`, `--ref-images`, and `--diff-images` must be the same length and order
    - It's okay if the ref images and diff images don't exist yet, we will show prompts in the UI to handle new images

### Architecture choices
We chose to use a server/browser implementation over a desktop application (e.g. Electron) for more flexibility with little development cost. It allows us to support virtualized environments (e.g. Vagrant, Docker) without asking our users to bend over backwards.

## Examples
### Gemini
This repository was initially inspired by [gemini-gui][] so we want to maintain support for a similar setup. To get [Gemini][] set up, run the following:

```bash
# Generate `gemini` and `gemini-report`
gemini-test --reporter html

# Use `multi-image-mergetool` with `gemini` folders
multi-image-mergetool --loader gemini
```

[Gemini]: https://github.com/gemini-testing/gemini
[gemini-gui]: https://github.com/gemini-testing/gemini-gui

**Notes:**

This isn't efficient due to comparing images twice and waiting for all screenshots to be taken before starting comparisons. Ideally we wrap `multi-image-mergetool` with a better integration or add data persistence to this library (unlikely). If you write a wrapper, please submit a PR updating this documentation.

## Development
### Setup
To get a local copy of `multi-image-mergetool` set up, run the following steps:

```bash
# Clone the repository
git clone https://github.com/twolfson/multi-image-mergetool
cd multi-image-mergetool

# Install our dependencies
npm install

# Compile our latest assets
npm run build

# Start our local multi-image-mergetool
npm run start-gemini
# or bin/multi-image-mergetool
```

### Building files
We use [gulp][] and [browserify][] to compile assets. These can be run once via:

```bash
npm run build
```

or continuously via:

```bash
npm run develop
```

`npm run develop` will additionally start a [LiveReload][] server

[gulp]: https://github.com/gulpjs/gulp
[browserify]: https://github.com/substack/node-browserify
[LiveReload]: http://livereload.com/extensions/

### Testing
We have test suites set up on [Mocha][] and [Karma][]. They can be run via:

```bash
npm test
```

[Mocha]: https://github.com/mochajs/mocha
[Karma]: https://github.com/karma-runner/karma

To exclusively run the browser or server tests, use:

```bash
npm run test-browser # Browser tests
npm run test-server # Server tests

# Additional helpers
npm run test-karma-develop # Watches/runs Karma tests on PhantomJS and asserts screenshots
```

Additionally, during testing we generate screenshots. We can assert and approve they are as expected via:

```bash
npm run test-browser-mergetool-screenshots
```

### Releasing
Our release process has a bunch of steps so we use [foundry][] to make them reproducable. To perform a new release, run the following:

- Update `CHANGELOG.md` with new release version
- Run `foundry release <version>`
    - This will take care of compiling `browser-dist`, updating `.npmignore` to match `.gitignore`, tagging repository, updating `package.json`, pushing commit/tag to GitHub, and publishing to `npm`

[foundry]: https://github.com/twolfson/foundry

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint via `npm run lint` and test via `npm test`.

## Prior art
`multi-image-mergetool` was inspired by:

- https://github.com/gemini-testing/gemini-gui
- https://applitools.com/
- [@twolfson's previous work on visual testing](http://twolfson.com/2014-02-25-visual-regression-testing-in-travis-ci)
- Initial proof of concept: <https://gist.github.com/twolfson/2745867438113ed97ad5a39b7a2a410e>
- Initial mockups: <https://gist.github.com/twolfson/c4236abadeada82e2686c940fb23341d>

## Unlicense
As of Oct 22 2016, Todd Wolfson has released this repository and its contents to the public domain.

It has been released under the [UNLICENSE][].

[UNLICENSE]: UNLICENSE
