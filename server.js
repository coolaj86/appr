(function () {
  "use strict";

  var connect = require('connect')
    , steve = require('./steve')
    , path = require('path')
    , app = connect.createServer()
    , wac = require('./lib/webappcenter')
    ;

  if (!connect.router) {
    connect.router = require('connect_router');
  }

  app.use(connect.static(path.join(__dirname, 'public')));
  app.use(connect.static(path.join(__dirname, 'var', 'public')));
  app.use(steve);
  app.use('/webappcenter', connect.router(wac));
  
  module.exports = app;
}());
