(function () {
  'use strict';

  var settings = require('./settings');

  module.exports.get = function (host, callback) {
    settings.get(host, function (err, json_settings) {
      var transmit_channel = json_settings.capture_rf_channel;

      if (undefined !== callback) {
        callback(err, transmit_channel);
      }
    });
  }

  module.exports.set = function (host, channel, callback) {
    var json_channel = {'capture_rf_channel': channel};
  
    settings.post(host, json_channel, function (err, json_settings) {
      if (undefined !== callback) {
        callback(err, json_settings);
      }
    });
  } 
}());
