/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";

  var path = require('path')
    , server = require('./server')
        .create({publicDir: path.join(__dirname, '..', 'webclient-deployed')})
    ;

  module.exports = server;
}());
