(function () {
  "use strict";

  var path = require('path')
    , fs = require('fs')
    , versionutils = require('./version')
    , semver = require('semver')
    ;

  function restGetBestVersion(req, res) {
    var pkgDir
      ;

    console.log(req.query.channel);
    if (!req.query.version) {
      res.error("You must provide a referece version");
      res.json();
      return;
    }

    pkgDir = path.join(__dirname, '..', 'var', 'public', 'releases');
    versionutils.get(pkgDir, req.query.channel, function (errs, ver) {
      if (errs) {
        console.error(errs);
        res.error(errs);
        res.json();
        return;
      }

      console.log('comparever', ver, req.query.version);
      if (semver.lte(ver, req.query.version)) {
        res.error("already up-to-date bro");
        res.json();
        return;
      }

      fs.stat(path.join(pkgDir, ver, 'data.tar.gz'), function (err, meta) {
        if (err) {
          res.error(err);
          res.json();
          return;
        }

        meta.semver = ver;
        meta.href = '/releases/' + ver + '/data.tar.gz';
        res.json(meta);
      });
    });
  }

  function router(routes) {
    routes.get('/update', restGetBestVersion);
  }

  module.exports = router;
}());
