(function () {
  "use strict";

  var server = require('./lib/index').create({publicDir: __dirname + '/public'})
    ;

  module.exports = server;
}());
