(function () {
  "use strict";

  var connect = require('connect')
    , fs = require('fs')
    , steve = require('./steve')
    , path = require('path')
    , versionutils = require('./lib/version')
    , app = connect.createServer()
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

    pkgDir = path.join(__dirname, 'var', 'public', 'releases');
    versionutils.get(pkgDir, req.query.channel, function (errs, ver) {
      if (errs) {
        console.error(errs);
        res.error(errs);
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

  app.use(connect.static(path.join(__dirname, 'public')));
  app.use(connect.static(path.join(__dirname, 'var', 'public')));
  app.use(steve);
  app.use('/webappcenter/update', restGetBestVersion);
  
  module.exports = app;
}());
