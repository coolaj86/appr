/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";

  var connect = require('steve')
    , request = require('ahr2')
    , fs = require('fs.extra')
    , path = require('path')
    , semver = require('semver')
    , connectRouter = require('connect_router')
    , MAJOR = 0
    , MINOR = 1
    , PATCH = 2
    , LEVEL = {
          "major": MAJOR
        , "minor": MINOR
        , "patch": PATCH
      }
    ;

  // Most recent will be 0, invalid at bottom
  function semverCompare(a, b) {
    return semver.lt(a, b) ? 1 : -1;
  }
  function semverFilter(a) {
    return semver.valid(a);
  }
  function bumpVer(ver, VER) {
    var trio = semver.valid(ver).split('.')
      ;

    trio[VER] = Number(trio[VER]) + 1;
    if (VER === MAJOR) {
        trio[MINOR] = 0;
        trio[PATCH] = 0;
    }
    if (VER === MINOR) {
        trio[PATCH] = 0;
    }

    return trio.join('.');
  }

  function create(options) {
    var server
      , pkgDir = path.join(options.publicDir, 'releases')
      , curVer = fs.readdirSync(pkgDir).filter(semverFilter).sort(semverCompare)[0] || '0.0.0'
      ;

    function checkVersion(req, res) {
      res.json(curVer);
      res.end();
    }

    function nextVersion(req, res, next) {
      res.json(bumpVer(curVer, LEVEL[req.params.level]));
    }

    function createVersion(req, res, next) {
      var fws
        , tmpFile = 'delete.me.tmp'
        , authVal = req.headers.authorization.replace(/.*\s*Basic\s*/g, '')
        , newVer = bumpVer(curVer, LEVEL[req.params.level])
        ;

      // Authorization: Basic c29tZXRoaW5na2luZGFzZWNyZXQ6eWtub3c=
      // somethingkindasecret:yknow
      if ('c29tZXRoaW5na2luZGFzZWNyZXQ6eWtub3c=' !== authVal) {
          //|| !/tar|gz/.exec(req.headers.contentType)) {
        console.log(authVal);
        next();
        return;
      }

      function tellEmHowItIs(e) {
        if (e) {
          res.error(e);
          res.json();
          return;
        }

        curVer = newVer;
        res.json(curVer);
        res.end();
      }

      function moveFile() {
        var releaseDir = path.join(pkgDir, newVer);
        fs.mkdir(releaseDir, function (e) {
          var releaseFile = path.join(releaseDir, 'client-' + newVer + '.tgz');
          fs.move(tmpFile, releaseFile, function (er) {
            // for old versions
            var releaseFileAlias = path.join(releaseDir, 'browser.tgz');
            fs.link(releaseFile, releaseFileAlias, function (err) {
              tellEmHowItIs(e || er || err);
            });
          });
        });
      }

      fws = fs.createWriteStream(tmpFile);
      req.pipe(fws);
      req.on('end', moveFile);
    }

    function router(app) {
      app.get('/version', checkVersion);
      app.get('/version/:level', nextVersion);
      // major, minor, patch
      app.post('/version/:level', createVersion);
    }

    server = connect.createServer()
      .use(connect.favicon(path.join(options.publicDir, 'offline-assets', 'favicon.ico')))
      .use(connect.static(options.publicDir))
      .use(connectRouter(router))
      .use(function (req, res) {
          res.json("hello from appr");
          res.end();
        })
      ;

    return server;
  }

  module.exports.create = create;
}());
