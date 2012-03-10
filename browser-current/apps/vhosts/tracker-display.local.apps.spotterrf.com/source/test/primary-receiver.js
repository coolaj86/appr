(function () {
  'use strict';

  var settings = require('./settings');

  module.exports.get = function (host, callback) {
    settings.get(host, function (err, json_settings) {
      var primary_receiver;

      if (err) {
        callback(err);
        return;
      }

      if (typeof json_settings === 'undefined') {
        err = {'message': 'settings undefined'};
        callback(err);
        return;
      }
 
      primary_receiver = json_settings.gmti_primary_receiver;

      if (undefined !== callback) {
        callback(err, primary_receiver);
      }      
    });
  }  

  module.exports.set = function (host, receiver, callback) {
    var json_receiver = {'gmti_primary_receiver': receiver};

    settings.post(host, json_receiver, function (err, json_settings) {
      if (undefined !== callback) {
        callback(err, json_settings);
      }
    });
  }
}());
