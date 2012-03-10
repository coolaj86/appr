(function () {
    'use strict';

    var reqwest = require('reqwest'),
        fails = 0;

    module.exports.get = function (host, callback) {
        callback = (typeof callback === 'function') ? callback : function () {};
        reqwest({
            'method': 'GET',
            'url': host + '/build',
            'crossOrigin': true,
            'success': function (data) {
                fails = 0;
                callback(null, data);
            },
            'error': function (err) {
                setTimeout(function () {
                    get(host, callback);
                }, 100, this);

                fails += 1;

                return;
            }
        });
    };
}());
