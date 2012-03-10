(function () {
  'use strict';

  module.exports.get = function (host, callback) {
    var url, 
        err;

    if (host) {
      url = host + '/rdm.png';
    } else {
      err = "Error, host is undefined";
    }
    
    if (typeof callback === 'function') {
      callback(err, url);
    }
  } 
}());
