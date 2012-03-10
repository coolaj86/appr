(function () {
    "use strict";

    var fs = require('fs'),
        connect = require('connect'),
        form = require('connect-form'),
        fileApi = require('file-api'),
        forEachAsync = require('forEachAsync'),
        futures = require('futures'),
        checkIfOnline = require('./checkIfOnline'),
        ahr2 = require('ahr2'),
        path = require('path'),
        port = 2000,
        intervalId,
        uploadQueue = [],
        whereToSave,
        pushServer;

    whereToSave = process.getuid() === 0 ? '/var/outdoorTest' : '/tmp/outdoorTest';
    try {
        if (!path.existsSync(whereToSave)) {
            fs.mkdirSync(whereToSave, parseInt('700', 8));
        }
    } catch (e) {
        console.error('Could not create directory to write to, trying local directory');
        whereToSave = './outdoorTest';

        if (!path.existsSync(whereToSave)) {
            fs.mkdirSync(whereToSave, parseInt('700', 8));
        }
    }

    if (process.argv.length > 2 && process.argv[2] === 'production' || process.getuid() === 0) {
        pushServer = "http://norman.spotter360.org:3000/upload";
    } else {
        pushServer = "http://localhost:3000/upload";
    }

    console.log("Pushing uploads to:", pushServer);

    function doUpload() {
        function uploader () {
            var loop = futures.loop();

            loop.run(function (next, err, data) {
                var item,
                    formData = new fileApi.FormData();

                if (uploadQueue.length === 0) {
                    return next('break');
                }

                item = uploadQueue.splice(0, 1)[0];

                formData.append('tar', new fileApi.File(path.join(whereToSave, item)));
                formData.append('name', item);

                console.log('Form data created, uploading file');

                ahr2({
                    "method": "POST",
                    "body": formData,
                    "href": pushServer
                }).when(function (err, response, data) {
                    if (data instanceof Buffer) {
                        data = JSON.parse(data.toString());
                    }

                    if (typeof data === 'string') {
                        data = JSON.stringify(data);
                    }

                    if (err || !data || !data.msg) {
                        console.log(err, data);
                        console.error(err || 'Couldn\'t connect to server');
                        // stick it back on the queue
                        uploadQueue.splice(0, 0, item);

                        // restart the online check and break out of the loop because the server isn't responding
                        detectNetwork(uploader);
                        return next('break');
                    }

                    console.log(item  + ' uploaded to server!!');
                    fs.unlink(path.join(whereToSave, item));
                    next();
                });
            });
        }

        if (intervalId) {
            return;
        }

        detectNetwork(uploader);
    }

    function detectNetwork(cb) {
        intervalId = setInterval(function () {
            var tServer = pushServer.match(/http:\/\/([a-zA-Z0-9.-]*).*/)[1];
            checkIfOnline(tServer, function (err, online) {
                if (online) {
                    clearInterval(intervalId);
                    intervalId = undefined;

                    process.nextTick(cb);
                    return;
                }

                console.log('Not online, trying again.', tServer);
            });
        }, 1000 * 10);
    }

    function routing(app) {
        app.options('/upload', function (req, res) {
            res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Methods': 'POST, GET',
                'Access-Control-Allow-Headers': 'Content-Type, Accept',
                'Content-Type': 'application/json'
            });

            res.end();
        });

        app.post('/upload', function (req, res, next) {
            req.form.complete(function (err, fields, files) {
                var readStream, writeStream;

                if (err) {
                    console.error(err);
                    return next();
                }

                readStream = fs.createReadStream(files['tar'].path);
                writeStream = fs.createWriteStream(path.join(whereToSave, fields['name']));

                readStream.pipe(writeStream, {end: false});
                readStream.on('end', function () {
                    console.log('Wrote to disk:', path.join(whereToSave, fields['name']));

                    uploadQueue.push(fields['name']);
                    process.nextTick(doUpload);
                });

                res.writeHead(200, {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Methods': 'POST, GET',
                    'Access-Control-Allow-Headers': 'Content-Type, Accept',
                    'Content-Type': 'application/json'
                });
                res.end('{"msg": "Thanks for uploading!!"}');
            });
        });
    }

    fs.readdir(whereToSave, function (err, files) {
        if (err) {
            console.error('Can\'t read directory to get un-sent tars:', err);
            return;
        }

        files.forEach(function (file) {
            if (/.*\.tar$/.test(file)) {
                uploadQueue.push(file);
            }
        });

        if (uploadQueue.length) {
            doUpload();
        }
    }); 

    connect(
        form({keepExtensions: true}),
        connect.router(routing),
        connect.static('.')
    ).listen(port, function () {
        console.log('Server started on port: ' + port);
    });
}());
