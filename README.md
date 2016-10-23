# multi-image-mergetool [![Build status](https://travis-ci.org/twolfson/multi-image-mergetool.svg?branch=master)](https://travis-ci.org/twolfson/multi-image-mergetool)

Resolve multiple image conflicts at the same time

TODO: Add JSON reporter to Gemini or build out `multi-image-assert`
TODO: Simplest API will be `gemini-test --reporter json || multi-image-mergetool --gemini` (loads Gemini config, finds screens based on that, (skips initial assertion), starts server + opens browser window)
TODO: Move to statically saved images instead of Gemini generated ones
TODO: Test out via `karma` and Sauce Labs/BrowserStack?
TODO: Move from Jade to HTML so we can have `gh-pages` demo
TODO: Add gh-pages demonstration of tool (with mock server responses)
TODO: Clean up scripts and dependencies

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

## Examples
_(Coming soon)_

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint via `npm run lint` and test via `npm test`.

## Unlicense
As of Oct 22 2016, Todd Wolfson has released this repository and its contents to the public domain.

It has been released under the [UNLICENSE][].

[UNLICENSE]: UNLICENSE
