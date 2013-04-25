(function () {
  "use strict";

  var restVersion = module.exports
    , semver = require('semver')
    , semverutils = require('semver-utils')
    , fs = require('fs')
    , MAJOR = 'major'
    , MINOR = 'minor'
    , PATCH = 'patch'
    ;

  // Most recent will be 0, invalid at bottom
  function semverCompare(a, b) {
    return semver.lt(a, b) ? 1 : -1;
  }

  restVersion.get = function (pkgDir, _channel, cb) {
    var channel = _channel || 'stable'
      ;

    fs.readdir(pkgDir, function (err, dirs) {
      var curVer
        ;

      if (err) {
        cb(err);
        return;
      }

      function semverFilter(a) {
        if (!semver.valid(a)) {
          return false;
        }

        var ver = semverutils.parse(a)
          ;

        // If you're on the alpha or beta channel, but the stable
        // is most up-to-date, you should get the stable channel's version
        // assuming that stable is marked by being undefined, that's true
        console.log(ver);
        if (('undefined' !== typeof ver.release) && channel !== ver.release) {
          return false;
        }

        return true;
      }

      console.log(dirs);
      dirs = dirs.filter(semverFilter);
      console.log(dirs);
      curVer = dirs.sort(semverCompare)[0] || null;
      if (!curVer) {
        cb('no versions available');
        return;
      }

      cb(null, curVer);
    });
  };

  restVersion.bump = function (ver, grade) {
    var trio = semverutils.parse(ver)
      ;

    if (!trio) {
      return null;
    }

    trio[grade] = Number(trio[grade]) + 1;
    trio.build = undefined;
    trio.release = undefined;
    if (grade === MAJOR) {
      trio.minor = 0;
      trio.patch = 0;
    }
    else if (grade === MINOR) {
      trio.patch = 0;
    }
    else if (grade === PATCH) {
      // nada
    }

    return semverutils.stringify(trio);
  };
}());
