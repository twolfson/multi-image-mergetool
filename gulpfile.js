// Load in our dependencies
var browserify = require('browserify');
var gulp = require('gulp');
var gulpBuffer = require('gulp-buffer');
var gulpLivereload = require('gulp-livereload');
var gulpNotify = require('gulp-notify');
var gulpSourcemaps = require('gulp-sourcemaps');
var rimraf = require('rimraf');
var vinylSourceStream = require('vinyl-source-stream');
var watchify = require('watchify');

// Set up our configuration
var config = {
  allowFailures: false
};

// Define our build tasks
gulp.task('build-clean', function clean (done) {
  // Remove all compiled files in `dist/`
  rimraf(__dirname + '/dist/', done);
});

gulp.task('build-css', function buildJs () {
  var bootstrapPath = require.resolve('bootstrap/dist/css/bootstrap.css');
  return gulp.src([bootstrapPath, __dirname + '/lib/css/*.css'])
    .pipe(gulp.dest('dist/css'))
    .pipe(gulpLivereload());
});

// Create a browserify instance
// https://github.com/gulpjs/gulp/blob/v3.9.1/docs/recipes/browserify-uglify-sourcemap.md
// https://github.com/substack/watchify/tree/v3.7.0#watchifyb-opts
var browserifyObj = browserify({
  cache: {}, packageCache: {},
  debug: true, // Enable source maps
  entries: __dirname + '/lib/js/index.js'
});
gulp.task('build-js', function buildJs () {
  // Bundle browserify content
  var jsStream = browserifyObj.bundle();

  // If we are allowing failures, then log them
  if (config.allowFailures) {
    jsStream.on('error', gulpNotify.onError());
  }

  // Coerce browserify output into a Vinyl object with buffer content
  jsStream = jsStream
    .pipe(vinylSourceStream('index.js'))
    .pipe(gulpBuffer());

  // Extract browserify inline sourcemaps into in-memory file
  jsStream = jsStream.pipe(gulpSourcemaps.init({loadMaps: true}));

  // Output sourcemaps in-memory to Vinyl file
  jsStream = jsStream.pipe(gulpSourcemaps.write('./'));

  // Return our stream
  return jsStream
    .pipe(gulp.dest('dist/js'))
    .pipe(gulpLivereload());
});

gulp.task('build', ['build-css', 'build-js']);

// Define our development tasks
gulp.task('livereload-update', function livereloadUpdate () {
  gulpLivereload.reload();
});

// DEV: `['build']` requires that our build task runs once
gulp.task('develop', ['build'], function develop () {
  // Set up our tasks to allow failures
  config.allowFailures = true;

  // Start a livereload server
  gulpLivereload.listen();

  // Integrate watchify on browserify
  browserifyObj.plugin(watchify);
  browserifyObj.on('update', function handleBUpdate () {
    // DEV: At some point `gulp.run` will be deprecated, move to `gulp.series` when it does
    gulp.start('build-js');
  });
  // DEV: Trigger a browserify build to make watchify start watching files
  browserifyObj.bundle().on('data', function () {});

  // When one of our src files changes, re-run its corresponding task
  gulp.watch(['lib/**/*', '!lib/{css,js}/**/*'], ['livereload-update']);
  gulp.watch(['lib/css/**/*'], ['build-css']);
});
