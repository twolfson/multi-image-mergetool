// Karma configuration
// Generated on Mon Nov 07 2016 04:42:50 GMT-0800 (PST)

// Enable PhantomJS global for this page
/* globals page:false */
module.exports = function (config) {
  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['browserify', 'mocha'],

    // list of files / patterns to load in the browser
    // DEV: Non-test `browser` files will be loaded via `require`
    files: [
      'test/browser/*.js',
      // Include CSS for better screenshots
      {pattern: 'browser-dist/css/*.css', watched: false, included: true}
    ],

    // list of files to exclude
    exclude: [
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'test/browser/**/*.js': ['browserify']
    },

    // configure browserify
    // https://github.com/nikku/karma-browserify/tree/v5.1.0#browserify-config
    browserify: {
      debug: true
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['PhantomJSScreenshot'],
    customLaunchers: {
      // http://stackoverflow.com/questions/34694765/take-screenshot-from-karma-while-running-tests-in-phantomjs-2/34695107#34695107
      // DEV: This works by using `page` variable set in its template
      //   https://github.com/karma-runner/karma-phantomjs-launcher/blob/v1.0.2/capture.template.js#L2-L12
      PhantomJSScreenshot: {
        base: 'PhantomJS',
        options: {
          onCallback: function (data) {
            if (data.type === 'render') {
              // Prevent us from writing to any absolute paths or ones that go up a directory
              // DEV: Unforuntately, this throw will be silent
              if (data.filename.indexOf('/') !== -1 || data.filename.indexOf('..') !== -1) {
                throw new Error('Malicious filename found: ' + data.filename);
              }
              page.render('test/browser/actual-screenshots/' + data.filename + '.png');
            }
          }
        }
      }
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  });
};
