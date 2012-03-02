(function () {
  "use strict";

  var connect = require('steve')
    , request = require('ahr2')
    , fs = require('fs')
    , semver = require('semver')
    ;

  function semverCompare(a, b) {
    return semver.lt(a, b) ? 1 : -1;
  }

  function create(options) {
    var server
      ;

    function checkVersion(req, res) {
      fs.readdir(options.publicDir + '/releases', function (err, nodes) {
        if (err) {
          // TODO this is BAD, alert the guards
          console.error(err.stack);
          res.error(err);
        }

        nodes = nodes || [];
        nodes.sort(semverCompare);

        res.json(nodes[0]);
      })
    }

    function router(app) {
      app.get('/version', checkVersion);
    }

    server = connect.createServer(
        connect.favicon()
        // Y U MAKE VARIABLE NAMES LIKE THIS???
      , function (q,s,n) {
          n();
        }
      , connect.static(options.publicDir)
      , connect.router(router)
      , function (req, res) {
          res.json("hello from appr");
        }
    );

    return server;
  }

  module.exports.create = create;
}());
