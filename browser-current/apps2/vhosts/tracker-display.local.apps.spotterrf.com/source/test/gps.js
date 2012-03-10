(function () {
    'use strict';

    var reqwest = require('reqwest'),
        fails = 0,
        startTime,
        timeout = 4 * 60 * 1000;

    function get (host, callback) {
        var lockTime;

        callback = (typeof callback === 'function') ? callback : function () {};

        // our first attempt
        if (!startTime) {
            startTime = Date.now();
        }

        reqwest({
            'method': 'GET',
            'url': host + '/gps',
            'type': 'json',
            'crossOrigin': true,
            'success': function (data) {
                fails = 0;
            
                lockTime = Date.now() - startTime;

                if (typeof data === 'string') {
                    alert('Do I get called?');
                    data = JSON.parse(data);
                }

                // special case; no connection to GPS, so we want to stop the test
                if (data.error) {
                    callback(data, true);
                    startTime = null;
                    return;
                }

                if (data.satellites_used >= 3) {
                    callback(null, data, lockTime);
                    startTime = null;
                    return;
                } else if (lockTime > timeout) {
                    callback({error: {message: 'GPS did not lock'}}, undefined, lockTime);
                    startTime = null;
                    return;
                }
               
                // try again
                setTimeout(function () {
                    get(host, callback);
                }, 1000 * 1);
            },
            'error': function (err) {
                if (fails < 15) {
                    setTimeout(function () {
                        get(host, callback);
                    }, 1000, this);

                    fails += 1;

                    return;
                } else {
                    callback({'error': { 'message' : err}});
                    startTime = null;
                    return;
                }
            }
        });
    }

    module.exports.get = get;
}());
