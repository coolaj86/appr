(function () {
  "use strict";

  var server = require('./lib/index').create(__dirname + '/public')
    ;

  module.exports = server;
}());
