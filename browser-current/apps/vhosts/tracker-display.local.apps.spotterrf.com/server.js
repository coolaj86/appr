(function () {
    "use strict";

    var connect = require('connect'),
        mime = require('mime'),
        // prefer package/user-set port
        port = process.env.npm_package_config_port || 5000,
        server,
        development = process.argv.length === 3 && process.argv[2] === '--development';

    mime.define({'text/cache-manifest': ['appcache']});

    function route(app) {
        if (development) {
            app.get('/stop', function (req, res) {
                res.end();

                console.log('We\'re going down');
                process.exit(0);
            });
        }
    }

    server = connect(
        connect.router(route),
        connect.static(__dirname + "/public")
    );
   
    if (development) {
        server.listen(port, function () {
            console.log("Server running on port:", port);
        });
    }

    module.exports = server;
}());

