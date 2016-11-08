# multi-image-mergetool [![Build status](https://travis-ci.org/twolfson/multi-image-mergetool.svg?branch=master)](https://travis-ci.org/twolfson/multi-image-mergetool)

Resolve multiple image conflicts at the same time

This was built to resolve conflicts in full page test screenshots where auxilary content may have changed (e.g. navigation). We prefer full page screenshots over ignored content/component based screenshots as it is less brittle and catches unexpected issues.

**Features:**

- Find/resolve common image changes via overlay selection

## Getting Started
Install the module via:

```bash
# Install multi-image-mergetool globally
npm install -g multi-image-mergetool

# Run multi-image-mergetool
# DEV: Currently only Gemini folder structure is supported
multi-image-mergetool
# Comparing images...
# ✘ gemini/screens/root/default-small/Chrome.png
# ✘ gemini/screens/root/default-medium/Chrome.png
# ✓ gemini/screens/root/default-large/Chrome.png
# ✓ gemini/screens/root/z-default-large2/Chrome.png
# ✓ gemini/screens/root/z-default-large3/Chrome.png
# Images matched: 3 of 5
# Server is listening on http://localhost:2020/

# Browser window will automatically be opened
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

  Usage: multi-image-mergetool [options]

  Options:

    -h, --help                 output usage information
    -V, --version              output the version number
    -p, --port <port>          Port for server to listen on (default: 2020)
    -h, --hostname <hostname>  Hostname for server to listen on (default: localhost)
    --verbose                  Enable verbose logging
    --no-browser-open          Prevent browser window from opening automatically
```

### Architecture choices
We chose to use a server/browser implementation over a desktop application (e.g. Electron) for more flexibility with little development cost. It allows us to support virtualized environments (e.g. Vagrant, Docker) without asking our users to bend over backwards.

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
npm start
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

### Releasing
Our release process has a bunch of steps so we use [foundry][] to make them reproducable. To perform a new release, run the following:

- Update `CHANGELOG.md` with new release version
- Run `foundry release <version>`
    - This will take care of compiling `dist`, updating `.npmignore` to match `.gitignore`, tagging repository, updating `package.json`, pushing commit/tag to GitHub, and publishing to `npm`

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
