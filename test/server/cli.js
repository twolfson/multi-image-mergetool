// Load in our dependencies
var fs = require('fs');
var async = require('async');
var expect = require('chai').expect;
var childUtils = require('./utils/child');
var cli = require('../../server/cli');
var cliUtils = require('./utils/cli');
var testFilesUtils = require('./utils/test-files');
var multiImageMergetoolFilepath = __dirname + '/../../bin/multi-image-mergetool';
var checkerboardFilepath = __dirname + '/../test-files/checkerboard.png';
var dotFilepath = __dirname + '/../test-files/dot.png';

// Start our tests
// DEV: `cliUtils.parse` stubs `logger.info`, `generateServer`, and `opener` (browser opener)
describe('An in-process CLI invocation', function () {
  describe('with matching images', function () {
    cliUtils.parse([
      'node', multiImageMergetoolFilepath,
      '--current-images', dotFilepath, checkerboardFilepath,
      '--ref-images', dotFilepath, checkerboardFilepath
    ], {
      expectedExitCode: 0
    });

    it('exits cleanly', function () {
      // Asserted by expectedExitCode
    });

    it('contains matching output', function () {
      expect(this.loggerInfo).to.match(/✓.+test-files\/dot\.png/);
      expect(this.loggerInfo).to.match(/✓.+test-files\/checkerboard\.png/);
      expect(this.loggerInfo).to.contain('Images matched: 2 of 2');
    });
  });

  describe('with non-matching images', function () {
    cliUtils.parse([
      'node', multiImageMergetoolFilepath,
      '--current-images', dotFilepath,
      '--ref-images', checkerboardFilepath
    ], {
      expectedExitCode: null
    });

    it('does not exit', function () {
      expect(this.err).to.equal(null);
      expect(this.exitCode).to.equal(null);
    });

    it('contains non-matching output', function () {
      expect(this.loggerInfo).to.match(/✘.+test-files\/checkerboard\.png/);
      expect(this.loggerInfo).to.contain('Images matched: 0 of 1');
    });

    it('starts a server', function () {
      var generateServerSpy = cli.generateServer;
      expect(generateServerSpy.callCount).to.equal(1);
      expect(this.generateServerPort).to.equal(2020);
      expect(this.generateServerHostname).to.equal('localhost');
    });

    it('opens a browser', function () {
      var openerSpy = cli.opener;
      expect(openerSpy.callCount).to.equal(1);
      expect(openerSpy.args[0]).to.deep.equal(['http://localhost:2020/']);
    });

    it('creates a diff file', function () {
      var generateServerSpy = cli.generateServer;
      expect(generateServerSpy.callCount).to.equal(1);
      var imageSets = generateServerSpy.args[0][0];
      expect(imageSets[0].diffImg).to.be.a('String');
      expect(fs.statSync(imageSets[0].diffImg)).to.not.equal(null);
    });
  });

  describe('with --diff-images argument', function () {
    var diffFilepath = __dirname + '/../test-files/tmp/cli/diff-images-argument.png';
    testFilesUtils.tmpFile(diffFilepath);
    cliUtils.parse([
      'node', multiImageMergetoolFilepath,
      '--current-images', dotFilepath,
      '--ref-images', checkerboardFilepath,
      '--diff-images', diffFilepath
    ], {
      expectedExitCode: null
    });

    it('does not exit', function () {
      expect(this.err).to.equal(null);
      expect(this.exitCode).to.equal(null);
    });

    it('uses our custom diff file', function () {
      var generateServerSpy = cli.generateServer;
      var imageSets = generateServerSpy.args[0][0];
      expect(imageSets[0].diffImg).to.equal(diffFilepath);
      expect(fs.statSync(imageSets[0].diffImg)).to.not.equal(null);
    });
  });

  describe('with uneven current/ref images', function () {
    cliUtils.parse([
      'node', multiImageMergetoolFilepath,
      '--current-images', dotFilepath, dotFilepath,
      '--ref-images', checkerboardFilepath
    ], {
      expectedExitCode: null
    });

    it('calls back with an error', function () {
      expect(this.err).to.not.equal(null);
      expect(this.err.message).to.contain(
        '2 current images and 1 reference images were received. We expect these numbers to line up');
    });
  });

  describe('with uneven current/diff images', function () {
    var diffFilepath = __dirname + '/../test-files/tmp/cli/uneven-current-diff.png';
    cliUtils.parse([
      'node', multiImageMergetoolFilepath,
      '--current-images', dotFilepath, dotFilepath,
      '--ref-images', checkerboardFilepath, checkerboardFilepath,
      '--diff-images', diffFilepath
    ], {
      expectedExitCode: null
    });

    it('calls back with an error', function () {
      expect(this.err).to.not.equal(null);
      expect(this.err.message).to.contain(
        '2 current images and 1 diff images were received. We expect these numbers to line up');
    });
  });

  describe('with --loader gemini', function () {
    // Set up temporary files
    var testDir = __dirname + '/../test-files/tmp/cli/loader-gemini';
    var currentFilepath = testDir + '/gemini-report/images/root/default-large/my-browser~current.png';
    var refFilepath = testDir + '/gemini/screens/root/default-large/my-browser.png';
    var diffFilepath = testDir + '/gemini-report/images/root/default-large/my-browser~diff.png';
    var tmpFilepathArr = [refFilepath, currentFilepath, diffFilepath];
    testFilesUtils.tmpFiles(tmpFilepathArr);
    before(function copyFileContents (done) {
      var contents = fs.readFileSync(__dirname + '/../test-files/dot.png');
      async.forEach(tmpFilepathArr, function writeContents (tmpFilepath, cb) {
        fs.writeFile(tmpFilepath, contents, cb);
      }, done);
    });

    // Run our parser in the corresponding directory
    var originalDir;
    before(function pushDirectory () {
      originalDir = process.cwd();
      process.chdir(testDir);
    });
    after(function popDirectory () {
      process.chdir(originalDir);
    });
    cliUtils.parse([
      'node', multiImageMergetoolFilepath,
      '--loader', 'gemini',
      '--verbose'
    ], {
      expectedExitCode: 0
    });

    // Perform our assertions
    it('has no errors', function () {
      // Asserted by `expectedExitCode`
    });
    it('compares our images', function () {
      expect(this.loggerInfo).to.contain(
        'current image "gemini-report/images/root/default-large/my-browser~current.png"');
      expect(this.loggerInfo).to.contain(
        'ref image "gemini/screens/root/default-large/my-browser.png"');
      expect(this.loggerInfo).to.contain(
       'diff image "gemini-report/images/root/default-large/my-browser~diff.png"');
    });
  });
});

// DEV: These are sanity checks for parse wrapper
describe('A CLI invocation', function () {
  describe('with matching images', function () {
    childUtils.spawn('node', [
      multiImageMergetoolFilepath,
      '--current-images', dotFilepath,
      '--ref-images', dotFilepath
    ]);

    it('exits cleanly', function () {
      expect(this.err).to.equal(null);
      expect(this.stdout).to.match(/✓.+test-files\/dot\.png/);
      expect(this.stdout).to.contain('Images matched: 1 of 1');
    });
  });

  describe('with uneven image counts', function () {
    childUtils.spawn('node', [
      multiImageMergetoolFilepath,
      '--current-images', dotFilepath, dotFilepath,
      '--ref-images', dotFilepath
    ]);

    it('exits uncleanly', function () {
      expect(this.err).to.have.property('status', 1);
      expect(this.err.stderr).to.contain(
        '2 current images and 1 reference images were received. We expect these numbers to line up');
    });
  });
});
