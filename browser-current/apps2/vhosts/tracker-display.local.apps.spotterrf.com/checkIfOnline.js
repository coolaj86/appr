(function () {
    "use strict";

    var exec = require('child_process').exec;

    function checkIfOnline(addr, cb) {
        var cmd = 'ping -c 1 ' + addr;

        /* checks the operating system. If it is Windows, use
         * the -n option for ping
         */
        if (/cygwin|windows/i.test(process.platform)) {
          cmd = 'ping -n 1 ' + addr;
        }

        exec(cmd, function (error, stdout, stderr) {
            if (error) {
                return cb(error);
            }

            if (stderr) {
                return cb(stderr);
            }

            cb(null, true, stdout);
        });
    }

    module.exports = checkIfOnline;
}());
