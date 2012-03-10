(function () {
    'use strict';

    var reqwest = require('reqwest'),
        fails = 0;

    function get (host, callback) {
        reqwest({
            'method': 'GET',
            'url': host + '/settings',
            'crossOrigin': true,
            'type': 'json',
            'success': function (data) {
                fails = 0;
                callback(null, data);
            },
            'error': function (err) {
                if (fails < 5) {
                    setTimeout(function () {
                        get(host, callback);
                    }, 100, this);

                    fails += 1;

                    return;
                }

                callback(err);
            }
        });
    } 

    function post (host, json_settings, callback) {
        callback = (typeof callback === 'function') ? callback : function () {};

        reqwest({
            'method': 'POST',
            'url': host + '/settings',
            'crossOrigin': true,
            'data': JSON.stringify(json_settings),
            'type': 'json',
            'headers': {
                'Content-type': 'application/json'
            },
            'success': function (data) {
                fails = 0;

                callback(null, data);
            },
            'error': function (err) {
                if (fails < 5){
                    setTimeout(function () {
                        post(host, json_settings, callback);
                    }, 100, this);

                    fails += 1;

                    return;
                }

                callback(err);
            }
        });
    }

    module.exports.get = get;
    module.exports.post = post;
}());
