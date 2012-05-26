/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
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
          res.end();
          return;
        }

        nodes = nodes || [];
        nodes.sort(semverCompare);

        res.json(nodes[0]);
        res.end();
      });
    }

    function router(app) {
      app.get('/version', checkVersion);
    }

    server = connect.createServer()
      .use(connect.favicon())
      .use(function (req, res, next) {
          next();
        })
      .use(connect.static(options.publicDir))
      .use(connect.router(router))
      .use(function (req, res) {
          res.json("hello from appr");
          res.end();
        })
      ;

    return server;
  }

  module.exports.create = create;
}());
