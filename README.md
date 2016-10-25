# multi-image-mergetool [![Build status](https://travis-ci.org/twolfson/multi-image-mergetool.svg?branch=master)](https://travis-ci.org/twolfson/multi-image-mergetool)

Resolve multiple image conflicts at the same time

TODO: Add JSON reporter to Gemini or build out `multi-image-assert`
TODO: Simplest API will be `gemini-test --reporter json || multi-image-mergetool --preset gemini` (loads Gemini config, finds screens based on that, (skips initial assertion), starts server + opens browser window)
TODO: Move to statically saved images instead of Gemini generated ones
TODO: Test out via `karma` and Sauce Labs/BrowserStack?
TODO: Move from Jade to HTML so we can have `gh-pages` demo
TODO: Add gh-pages demonstration of tool (with mock server responses)
TODO: Clean up scripts and dependencies
TODO: Include performance tests in final test suite
TODO: Document CLI flags (`--help`)
TODO: Remove our TODOs and console.logs
TODO: Add `--preset gemini` flag support
TODO: Remove rawgit dependencies

## Getting Started
Install the module with: `npm install multi-image-mergetool`

```js
var multiImageMergetool = require('multi-image-mergetool');
multiImageMergetool(); // 'awesome'
```

## Donations
Support this project and [others by twolfson][projects] via [donations][support-me]

[projects]: http://twolfson.com/projects
[support-me]: http://twolfson.com/support-me

## Documentation
_(Coming soon)_

### Architecture choices
We chose to use a server/browser implementation over a desktop application (e.g. Electron) for more flexibility with little development cost. It allows us to support virtualized environments (e.g. Vagrant, Docker) without asking our users to bend over backwards.

## Examples
_(Coming soon)_

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
