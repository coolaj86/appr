(function () {
    "use strict";

    var futures = require('futures'),
        EventHub = require('eventhub'),
        ender = require('ender'),
        gps = require('../../test/gps'),
        rdm = require('../../test/rdm'),
        softwareVersion = require('../../test/software-version'),
        transmitChannel = require('../../test/transmit-channel'),
        primaryReceiver = require('../test/primary-receiver'),
        forEachAsync = futures.forEachAsync,
        EventEmitter = require('events.node').EventEmitter,
        wrapTestEmitter = new EventEmitter(),
        settings = require('../../test/settings'),
        Logger = require('../logger'),
        ahr2 = require('ahr2'),
        Tar = require('tar'),
        tape,
        tTrackerDisplay,
        origReceiver,
        spotterAddr,
        outdoorSettings = { 
            "sensitivity": "medium"
        },
        utils = require('tar/utils'),
        testOuts,
        doAbort = false,
        spiPotValues = [
            [85, 191],
            [80, 182],
            [83, 187],
            [92, 196],
            [85, 191],
            [80, 182],
            [78, 180],
            [77, 173],
            [85, 191],
            [80, 182]
        ],
        dbMin = 81,
        rxDbDiffMax = 6,
        transmitTestResults = 4,
        calDataSets = 15,
        calRuns = 1,
        angSpreadMax = 5,
        getRDMs = false,
        extraDomStuff = [
            "<div id='testsuite-div' class='modal-div'>",
            "<label>Tester name</label>",
            "<br />",
            "<input type='textfield' style='width: 100px' id='test-testername' />",
            "<br />",
            "<br />" + 
            "<label>Notes</label>",
            "<br />",
            "<textarea id='test-notes' rows='7' cols='30'></textarea>",
            "<br />",
            "<br />",
            "<div class='modal-button button clickable' id='test-saverun'><div>Save and Run Next</div></div>",
            "<div class='modal-button button clickable' id='test-save'><div>Save and Quit</div></div>",
            "<div class='modal-button button clickable' id='test-rerun'><div>Re-run</div></div>",
            "<div class='modal-button button clickable' id='test-cancel'><div>Cancel</div></div>",
            "<div class='modal-button button clickable test-abort' id='test-abort'><div>Abort Test</div></div>",
            "<div class='log-modal' id='test-log'></div>",
            "</div>",
            "<div id='wrapPopup1' class='modal-div'>",
            "<div class='super-modal'>",
            "<label>Please turn the spotter towards the cemetary.</label>" + 
            "<div class='modal-button button clickable run-test'><div>OK</div></div>",
            "<div class='modal-button button clickable skip-test'><div>Skip Test</div></div>",
            "</div>",
            "</div>",
            "<div id='wrapPopup2' class='modal-div'>",
            "<div class='super-modal'>",
            "<label>Please turn the spotter towards Canyon Park.</label>" + 
            "<div class='modal-button button clickable run-test'><div>OK</div></div>",
            "<div class='modal-button button clickable skip-test'><div>Skip Test</div></div>",
            "</div>",
            "</div>",
            "<div class='modal-div' id='testsuite-popup'>",
            "<div class='super-modal'>",
            "<label>Spotter ID</label>",
            "<br />",
            "<input type='textfield' id='test-spotterid' />",
            "<br />",
            "<br />",
            "<label>Spotter IP Address</label>",
            "<br />",
            "<input type='textfield' id='test-spotterip' value='" + location.host  + "' />",
            "<br />",
            "<br />",
            "<label>Tests to be run:</label>",
            "<br />",
            "<input type='checkbox' id='test-run-gps' checked /><label for='test-run-gps'>GPS</label>",
            "<br />",
            "<input type='checkbox' id='test-run-transmit-channel' checked /><label for='test-run-transmit-channel'>Transmit Channel</label>",
            "<br />",
            "<input type='checkbox' id='test-run-angle-calibration' checked /><label for='test-run-angle-calibration'>Angle Calibration</label>",
            "<br />",
            "<input type='checkbox' id='test-run-receive-channel' checked /><label for='test-run-receive-channel'>Receive Channel</label>",
            "<br />",
            "<input type='checkbox' id='test-run-wrapping' checked /><label for='test-run-wrapping'>Wrapping</label>",
            "<br />",
            "<div class='modal-button button clickable' id='start-test'><div>Start Test</div></div>",
            "<div class='modal-button button clickable' id='cancel-test'><div>Cancel Test</div></div>",
            "</div></div>" + 
            "<div id='test-transmit-channels' class='modal-div'>",
            "<div class='super-modal'>",
            "<label>Transmit Channels</label>",
            "<br />",
            "<br />",
            "<div class='test-table'>",
            "<div class='test-row test-header'>",
            "<div class='test-cell test-header'><label>Tx Ch</label></div>",
            "<div class='test-cell test-header'><label>Rx 1 Near (db)</label></div>",
            "<div class='test-cell test-header'><label>Rx 2 Near (db)</label></div>",
//            "<div class='test-cell test-header'><label>Phase Diff</label></div>",
            "</div>",
            "</div>",
            "</div></div>",
            "<div id='test-rdm-viewer'>",
            "<img />",
            "</div>",
            "<canvas id='pngBuf' width='720' height='480'>Your browser can't handle the canvas-ness of awesomeness</canvas>"
        ].join('\n'),
        module = {'exports': {}},
        rdmImageElem;

    function initTrTable() {
        spiPotValues.forEach(function (pot, i) {
            var row = ender('<div class="test-row" data-tx="' + (i + 1) + '"></div>');

            row.append(ender('<div class="test-cell test-tx"><label>' + (i + 1) + '</label></div>'));
            row.append(ender('<div class="test-cell test-rx1"><label></label></div>'));
            row.append(ender('<div class="test-cell test-rx2"><label></label></div>'));
//            row.append(ender('<div class="test-cell test-phase-diff"><label></label></div>'));

            ender('#test-transmit-channels').find('.test-table').append(row);
        });
    }

    function clear() {
        tape = undefined;
        testOuts = undefined;
    }

    function abort(cb) {
        doAbort = true;
        if (origReceiver) {
            primaryReceiver.set(spotterAddr, origReceiver);
        }

        Logger.log('testLog', 'Test aborted');

        if (typeof cb === 'function') {
            cb('Test aborted');
        }
    }

    function hasData() {
        if (tape) {
            return true;
        }

        return false;
    }

    function postCommands(cmd, cb) {
        ender.ajax({
            'url': tTrackerDisplay.spotterAddress + '/exec',
            'method': 'post',
            'type': 'json',
            'data': JSON.stringify(cmd),
            'crossOrigin': true,
            'headers': {
                "Content-type": "application/json"
            },
            'complete': function () {
                if (typeof cb === 'function') {
                    cb();
                }
            }
        });
    }

    function clearTracks(cb) {
        var cmd = [
                "task",
                "script",
                "kill `pidof node`",
                "",
                "# stop monit before we stop the processes it monitors",
                "service monit stop >> /dev/shm/killOut",
                "stop spotter-web-settings >> /dev/shm/killOut",
                "stop spotter-central-thread >> /dev/shm/killOut",
                "",
                "# clear out the logs that we really do not care about",
                "rm -f /dev/shm/web-settings*.log /dev/shm/central-thread*.log",
                "",
                "# start stuff back up",
                "start spotter-central-thread >> /dev/shm/killOut",
                "service monit start >> /dev/shm/killOut",
                "end script"
            ].join('\n'),
            arr = [
                "if [ ! -e /etc/init/clear-tracks.conf ]\nthen\nmount -o remount,rw /\necho '" + cmd + "' > /etc/init/clear-tracks.conf\nmount -o remount,ro /\nfi",
                "start clear-tracks"
            ];

        postCommands(arr, function () {
            var timeout;

            function handler(data) {
                if (timeout) {
                    clearTimeout(timeout);

                    cb(data);
                }
            }

            tTrackerDisplay.init();

            EventHub.once('trackers', 'data', handler);

            timeout = setTimeout(function () {
                timeout = null;

                EventHub.removeListener('trackers', 'data', handler);

                // we don't want to forever wait for tracks
                if (!confirm('It seems that the spotter isn\'t producing tracks.\n\nDo you want to continue anyway?')) {
                    abort();
                }

                cb();
            }, 20 * 1000);
        });
    }

    function setSpiPotValues(val1, val2, cb) {
        var arr;

        if (val1 instanceof Array) {
            cb = val2;
            val2 = val1[1];
            val1 = val1[0];
        }
       
        arr = [
            'tune-pots ' + val1 + ' ' + val2
        ];

        postCommands(arr, cb);
    }

    function sendResults(cb) {
        var tarOut,
            formData = new FormData(),
            blobBuilder = new WebKitBlobBuilder(),
            blob;

        testOuts.tester = ender('#test-testername').val();
        testOuts.notes = ender('#test-notes').val();
        testOuts.txData = [];
        ender('.test-table .test-row[data-tx]').each(function (elem) {
            var tData = JSON.parse(ender(elem).attr('data-reply')),
                tx = +ender(elem).attr('data-tx');

            testOuts.txData[tx - 1] = tData;
        });

        tarOut = tape.append('testOuts.json', JSON.stringify(testOuts));

        blobBuilder.append(tarOut.buffer);
        blob = blobBuilder.getBlob('application/tar');
        formData.append('tar', blob);
        formData.append('name', testOuts.spotterId + '-' + testOuts.timestamp + '.tar');

        ahr2({
            'method': 'POST',
            'body': formData,
            'href': 'http://localhost:2000/upload'
        }).when(function (err, notUsed, data) {
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
    
            if (err || !data || !data.msg) {
                alert('Data not sent!');
                return cb(false);
            }

            Logger.log('testLog', 'Data sent to server');
            clear();
            cb(true);
        });
    }

    function doImages(addr, receiver, cb) {
        var base = 'channel' + receiver,
            screenShotsTaken = 0,
            join = futures.join(),
            rdmFuture = futures.future(),
            trackerDisplayFuture = futures.future();

        join.add([rdmFuture, trackerDisplayFuture]);
        join.when(cb);

        rdm.get(addr, function (err, url) {
            var intervalId, rdmsTaken = 0;

            if (doAbort) {
                rdmFuture.fulfill();
                return;
            }

            if (err) {
                rdmFuture.fulfill(err);
                return;
            }

            intervalId = setInterval(function () {
                ahr2({
                    'href': url,
                    'overrideResponseType': 'binary'
                }).when(function (err, notUsed, data) {
                    var uint8;
                    if (err) {
                        console.error(err);
                        return;
                    } else if (!data) {
                        console.error('We got nothing. Not counting this RDM');
                        return;
                    }

                    uint8 = new Uint8Array(data);

                    rdmsTaken += 1;

                    tape.append(base + '/rdm-' + rdmsTaken.toString() + '.png', uint8);
                    if (rdmsTaken === 10) {
                        Logger.log('testLog', 'RDMs finished saving');

                        clearInterval(intervalId);

                        rdmFuture.fulfill();
                    }
                });
            }, 1000 * 3);
        });

        setTimeout(function () {
            var base64 = ender('#tracks')[0].toDataURL('image/png'),
                uint8 = utils.base64ToUint8(base64.match(/,(.*)/)[1]); // TODO: make regex more robust

            tape.append(base + '/osd-' + screenShotsTaken.toString() + '.png', uint8);

            Logger.log('testLog', 'Tracker Display screenshot taken');

            trackerDisplayFuture.fulfill();
        }, 1000 * 30);
    }

    function connectToSpotter(resource, cb) {
        if (!cb) {
            cb = resource;
            resource = null;
        }
        if (!resource) {
            resource = 'gps';
        }
        ender.ajax({
            'method': 'get',
            'url': tTrackerDisplay.spotterAddress + '/' + resource,
            'type': 'json',
            'crossOrigin': true,
            'success': function () {
                if (typeof cb === 'function') {
                    cb();
                }
            },
            'error': function () {
                setTimeout(connectToSpotter, 500, cb);
            }
        });
    }

    function getTransmitChannel(addr, cb) {
        transmitChannel.get(addr, function (err, tx) {
            if (doAbort) {
                cb();
                return;
            }

            if (err) {
                cb(err);
                return;
            }

            Logger.log('testLog', 'Got transmit channel: ' + tx);

            cb(null, tx);
        });
    }

    function getPrimaryReceiver(addr, cb) {
        primaryReceiver.get(addr, function (err, receiver) {
            if (doAbort) {
                cb();
                return;
            }

            if (err) {
                cb(err);
                return;
            } else if (!receiver) {
                console.error('Receiver undefined, we\'ll try again');
                return getPrimaryReceiver(addr);
            }

            Logger.log('testLog', 'Operating on receiver ' + receiver);

            origReceiver = receiver.valueOf();
            testOuts.primaryReceiver = origReceiver;

            cb();
        });
    }

    function doTransmitChannel(addr, origTx, cb) {
        var txResults = [], bReverse = (origReceiver === 2) ? true : false,
            medians = [],
            a;

        if (typeof cb !== 'function') {
            cb = function () {};
        }

        if (doAbort) {
            return cb();
        }

        // remove old cruft
        ender('.test-row[data-tx] .test-rx1 label,.test-row[data-tx] .test-rx2 label').html('').removeClass('test-rx-fail').removeClass('test-rx-1').removeClass('test-rx-2').removeClass('test-rx-3').removeClass('test-rx-4');
        ender('.test-row[data-tx] .test-tx label').removeClass('test-tx-fail').removeClass('test-tx-orig');
        ender('.test-row[data-tx]').removeAttr('data-reply');

        ender('.test-row[data-tx="' + origTx + '"] .test-tx label').addClass('test-tx-orig');

        ender('#test-transmit-channels').css('display', 'block');

        a = confirm('Do you want to use the best guess for pot values?\n\nPress Cancel to use the current pot value or OK to use the defaults for each channel.');

        startRDMs();

        forEachAsync(spiPotValues, function (next, pot, i) {
            if (doAbort) {
                return next();
            }

            transmitChannel.set(addr, i + 1, function (err, channel) {
                connectToSpotter('diagnostic.json', function () {
                    function done() {
                        var rangeBins = [];

                        function getDiagnostic(curResults, fails, cb) {
                            if (doAbort) {
                                console.warn('Abort');
                                return cb();
                            }

                            if (typeof curResults === 'function') {
                                cb = curResults;
                                fails = 0;
                                curResults = [];
                            }

                            ender.ajax({
                                'method': 'get',
                                'url': addr + '/diagnostic.json',
                                'crossOrigin': true,
                                'type': 'json',
                                'success': function (reply) {
                                    rangeBins.push(reply.dc_max.range_bin);
                                    curResults.push(reply);
                                },
                                'complete': function () {
                                    var median;

                                    if (curResults.length < transmitTestResults) {
                                        return getDiagnostic(curResults, fails, cb);
                                    }

                                    rangeBins = rangeBins.sort(function (a, b) {
                                        return a - b;
                                    });

                                    // if we're odd
                                    if (transmitTestResults % 2) {
                                        median = rangeBins[Math.floor(rangeBins.length / 2)];
                                    } else {
                                        median = (rangeBins[rangeBins.length / 2] + rangeBins[rangeBins.length / 2 - 1]) / 2;
                                    }

                                    if (rangeBins[rangeBins.length - 1] - rangeBins[0] > 2) {
                                        if (fails >= 5) {
                                            if (confirm('The range bin is inconsistent. The range is ' + rangeBins[0] + '-' + rangeBins[rangeBins.length - 1] + ' and the median is ' + median + '. Do you want to abort?\n\nPress ok to abort test or cancel to ignore the range bin.')) {
                                                ender('#test-transmit-channels').css('display', '');
                                                abort(cb);
                                                return;
                                            }
                                        }

                                        // get rid of bad range-bins and try again
                                        rangeBins.forEach(function (bin, i) {
                                            if (Math.abs(median - bin) > 1) {
                                                rangeBins.splice(i, 1);
                                                curResults.splice(i, 1);
                                                fails += 1;
                                            }
                                        });

                                        return getDiagnostic(curResults, fails, cb);
                                    }

                                    cb(null, curResults, median);
                                }
                            });
                        }

                        setTimeout(function () {
                            getDiagnostic(function (err, curResults, median) {
                                var rx1Total = 0, rx2Total = 0,
                                    phase = 0,
                                    row,
                                    rx1Elem,
                                    rx2Elem;
                            
                                if (doAbort) {
                                    return next();
                                }

                                if (err) {
                                    console.warn(err.message);
                                    return next();
                                }

                                row = ender('#test-transmit-channels').find('.test-table .test-row[data-tx="' + (i + 1) + '"]');
                                row.attr('data-reply', JSON.stringify(curResults));

                                curResults.forEach(function (res) {
                                    var rx1,
                                        rx2;

                                    if (bReverse) {
                                        rx2 = res.dc_max.primary_channel_db;
                                        rx1 = res.dc_max.secondary_channel_db;
                                    } else {
                                        rx1 = res.dc_max.primary_channel_db;
                                        rx2 = res.dc_max.secondary_channel_db;
                                    }
                                    rx1Total += rx1;
                                    rx2Total += rx2;
                                    phase += res.dc_max.phase_difference;
                                });

                                rx1Total /= transmitTestResults;
                                rx2Total /= transmitTestResults;
                                phase /= transmitTestResults;

                                txResults.push({'rx1': rx1Total, 'rx2': rx2Total, 'phase_difference': phase, 'tx': i + 1});
                                medians.push(median);

                                rx1Elem = row.find('.test-rx1 label');
                                rx1Elem.html(Math.round(rx1Total * 100) / 100);
                                if (rx1Total < dbMin) {
                                    rx1Elem.addClass('test-rx-fail');
                                }

                                rx2Elem = row.find('.test-rx2 label');
                                rx2Elem.html(Math.round(rx2Total * 100) / 100);
                                if (rx2Total < dbMin) {
                                    rx2Elem.addClass('test-rx-fail');
                                }

                                if (Math.abs(rx1Total - rx2Total) > rxDbDiffMax) {
                                    row.find('.test-tx label').addClass('test-tx-fail');
                                }

                                next();
                            });
                        }, 1000);
                    }

                    if (a) {
                        setSpiPotValues(pot[0], pot[1], done);
                    } else {
                        done();
                    }
                });
            });
        }).then(function () {
            var bestResults = [
                    {'rx1': 0, 'rx2': 0, 'tx': 0},
                    {'rx1': 0, 'rx2': 0, 'tx': 0},
                    {'rx1': 0, 'rx2': 0, 'tx': 0},
                    {'rx1': 0, 'rx2': 0, 'tx': 0}
                ],
                median,
                medianFails = 0,
                tMedians;

            stopRDMs();

            if (doAbort) {
                return cb();
            }

            tMedians = medians.sort(function (a, b) {
                return a - b;
            });

            // if odd
            if (medians.length % 2) {
                median = tMedians[Math.floor(medians.length / 1)];
            } else {
                median = (tMedians[medians.length / 2] + tMedians[medians.length / 2 - 1]) / 2;
            }

            medians.forEach(function (tMed, i) {
                if (Math.abs(median - tMed) > 2) {
                    // mark this channel as a fail
                    ender('#test-transmit-channels .test-table .test-row[data-tx="' + (i + 1) + '"] .test-tx label').addClass('test-tx-fail');
                    medianFails += 1;
                }
            });

            if (medianFails >= 5) {
                if (confirm('There were ' + medianFails + ' transmit channels whose range bins fell outside 2 range bins of the median. Do you want to abort the test?')) {
                    return abort(cb);
                }
            }

            txResults.forEach(function (result) {
                var resMax = Math.max(result.rx1, result.rx2);

                if (Math.abs(result.rx1 - result.rx2) > rxDbDiffMax) {
                    return;
                }

                bestResults.some(function (tRes, i) {
                    var tResMax = Math.max(tRes.rx1, tRes.rx2);

                    if (resMax > tResMax) {
                        // insert one
                        bestResults.splice(i, 0, result);

                        // remove the last
                        bestResults.pop();
                        return true;
                    }
                });
            });

            bestResults.forEach(function (result, i) {
                var rx = (result.rx1 > result.rx2) ? 1 : 2;

                ender('.test-row[data-tx="' + result.tx + '"] .test-rx' + rx + ' label').addClass('test-rx-' + (i + 1));
            });

            ender('.test-rx1 label,.test-rx2 label').css('cursor', 'pointer');
            ender('body').bind('.test-rx1 label,.test-rx2 label', 'click', function () {
                var cellElem, tx, rx;

                ender('body').unbind('.test-rx1 label,.test-rx2 label', 'click');

                tx = +ender(this).parents('.test-row').find('.test-tx label').html();
                cellElem = ender(this).parents('.test-cell');
                if (cellElem.hasClass('test-rx1')) {
                    rx = 1;
                } else if (cellElem.hasClass('test-rx2')) {
                    rx = 2;
                }

                settings.post(addr, {'capture_rf_channel': tx, 'gmti_primary_receiver': rx}, function (err, notUsed, data) {
                    ender('#test-transmit-channels').css('display', '');

                    if (err) {
                        Logger.log('testLog', 'Setting chosen TX and RX failed');
                        cb(err);
                        return;
                    }

                    if (a) {
                        setSpiPotValues(spiPotValues[tx - 1], function () {
                            cb();
                        });
                    } else {
                        cb();
                    }
                });
            });
        });
    }

    function getAverage(arr) {
        var i = arr.length, sum = 0;

        if (arr.length === 0) {
            return;
        }

        while (i--) {
            sum += arr[i];
        }

        return sum / arr.length;
    }

    function getStandardDeviation(arr, avg) {
        var i = arr.length,
            v = 0,
            sum = 0;

        if (typeof avg === 'undefined') {
            avg = getAverage(arr);
        }

        if (arr.length === 0) {
            return;
        }

        while (i--) {
            v += Math.pow(arr[i] - avg, 2);
        }
        v /= arr.length;

        return Math.sqrt(v);
    }

    function findLineByLeastSquares(coords) {
        var sum_x = 0,
            sum_y = 0,
            sum_xy = 0,
            sum_xx = 0,
            m,
            b;
        
        // Nothing to do.
        if (coords.length === 0) {
            return [ [], [] ];
        }
        
        // Calculate the sum for each of the parts necessary.
        coords.forEach(function (coord) {
            var x = coord.x,
                y = coord.y;

            sum_x += x;
            sum_y += y;
            sum_xx += x * x;
            sum_xy += x * y;
        });

        // Calculate m and b for the formular:
        // y = x * m + b
        // throw in a check for divide by zero
        if (sum_xx && sum_x) {
            m = (coords.length * sum_xy - sum_x * sum_y) / (coords.length * sum_xx - sum_x * sum_x);
            b = (sum_xx * sum_y - sum_x * sum_xy) / (coords.length * sum_xx - sum_x * sum_x);
        }

        return {
            'slope': m,
            'y-intercept': b
        };
    }

    function doAngleCalibration(currentOffset, run, cb) {
        var offsets = [];

        if (typeof run === 'function') {
            cb = run;
            run = 1;
        }

        if (typeof cb !== 'function') {
            cb = function () {};
        }

        if (doAbort) {
            return cb();
        }

        function getOffset(angles) {
            var angleAvg = 0,
                min = 360,
                max = -360,
                ret = {};

            angles.forEach(function (angle) {
                min = Math.min(min, angle);
                max = Math.max(max, angle);

                angleAvg += angle;
            });
            angleAvg /= angles.length;

            ret.bestFit = angleAvg;
            ret.spread = max - min;

            return ret;
        }

        EventHub.on('trackers', 'data', function trackHandler() {
            var angle = 0, points, ret, spread = 0, angles = [], σ, μ;

            if (doAbort) {
                EventHub.removeListener('trackers', 'data', trackHandler);
                return cb();
            }

            // get only the last points of the item
            points = Object.keys(tTrackerDisplay.items).map(function (key) {
                var item = tTrackerDisplay.items[key],
                    point = item.route[item.route.length - 1];

                return point;
            });

            // get rid of the really close tracks because they'll mess with our average
            points.forEach(function (point, i, arr) {
                if (point.range < 200) {
                    arr.splice(i, 1);
                }
            });

            angles = points.map(function (point) {
                if (point.angle > 180) {
                    return point.angle - 360;
                }
                return point.angle;
            });

            μ = getAverage(angles);
            σ = getStandardDeviation(angles, μ);

            // get rid of stuff outside 1 standard deviation
            angles.forEach(function (angle, i, arr) {
                if (Math.abs(μ - angle) > σ) {
                    arr.splice(i, 1);
                    //console.log('Throw out angle:', arr.splice(i, 1), 'σ:', σ, 'μ:', μ);
                }
            });

            ret = getOffset(angles);
            //console.log('Best fit:', ret.bestFit, 'Spread:', ret.spread);

            offsets.push(ret);

            // done
            if (offsets.length === calDataSets) {
                // stop receiving updates
                EventHub.removeListener('trackers', 'data', trackHandler);

                offsets.forEach(function (ret) {
                    angle += ret.bestFit;
                    spread += ret.spread;
                });
                angle /= offsets.length;
                spread /= offsets.length;

                // take into account the existing offset
                angle += currentOffset;

                angle = Math.round(angle * 1000) / 1000;
                spread = Math.round(spread * 1000) / 1000;

                settings.post(spotterAddr, {'phase_calibration_offset': angle}, function () {
                    if (doAbort) {
                        return cb();
                    }

                    if (run === calRuns) {
                        if (spread > angSpreadMax) {
                            if (!confirm('The angular spread (' + spread + ') is greater than the threshold of ' + angSpreadMax + '°.\n\nWould you like to continue anyway?')) {
                                return abort(cb);
                            }
                        }

                        Logger.log('testLog', 'Angular calibration: ' + angle);
                        Logger.log('testLog', 'Angular spread: ' + spread);

                        testOuts.angularSpread = spread;
                        testOuts.angularCalibration = angle;
                        return cb();
                    }

                    clearTracks(function () {
                        doAngleCalibration(currentOffset, run + 1, cb);
                    });
                });
            }
        });
    }

    function doWrappingTest(testNum, cb) {
        if (typeof testNum === 'function') {
            cb = testNum;
            testNum = 1;
        }
       
        if (typeof cb !== 'function') {
            cb = function () {};
        }

        if (doAbort) {
            return cb();
        }

        testNum = testNum || 1;

        ender('#wrapPopup' + testNum).css({
            'display': 'block'
        });

        EventHub.once('wrapTest', 'submit', function (run) {
            ender('#wrapPopup' + testNum).css('display', '');

            if (doAbort || !run) {
                return cb();
            }

            // clear tracks
            clearTracks(function () {
                if (doAbort) {
                    return cb();
                }

                Logger.log('testLog', 'Running wrapping test ' + testNum);

                setTimeout(function () {
                    var base64,
                        uint8; 
                    
                    if (doAbort) {
                        return cb();
                    }

                    base64 = ender('#tracks')[0].toDataURL('image/png');
                    uint8 = utils.base64ToUint8(base64.match(/,(.*)/)[1]); // TODO: make regex more robust

                    tape.append('wrapTest' + testNum + '.png', uint8);

                    if (testNum === 2) {
                        cb();
                    } else {
                        doWrappingTest(2, cb);
                    }
                }, 30 * 1000);
            });
        });
    }

    function doGpsTest(addr, cb) {
        gps.get(addr, function (err, data, lockTime) {
            var action;

            if (doAbort) {
                return cb();
            }

            if (err) {
                Logger.log('testLog', 'GPS Error: ' + err.error.message);

                // special case for no physical GPS connection
                if (data) {
                    action = confirm('There was an error with the GPS: ' + err.error.message + '\n\nWould you like to abort the test?');
                    if (action) {
                        return abort(cb);
                    }
                }
                testOuts.gps = err;
                testOuts.gpsLockTime = lockTime;
                return cb();
            }

            Logger.log('testLog', 'GPS data received');

            testOuts.gps = data;
            testOuts.gpsLockTime = lockTime;
            cb();
        });
    }

    function doReceiveChannel(addr, cb) {
        var newJoin,
            i = 0,
            txFuture = futures.future(),
            swVersionFuture = futures.future(),
            rxFuture = futures.future(),
            imagesFuture = futures.future();

        if (doAbort) {
            return;
        }

        newJoin = futures.join();

        newJoin.add([txFuture, swVersionFuture, rxFuture, imagesFuture]);
        newJoin.when(function () {
            if (doAbort) {
                return;
            }

            primaryReceiver.set(addr, 2, function () {
                stopRDMs();
                clearTracks(function () {
                    if (doAbort) {
                        return cb();
                    }

                    startRDMs();

                    Logger.log('testLog', 'Primary receiver set to: 2');

                    doImages(addr, 2, function () {
                        if (doAbort) {
                            return cb();
                        }

                        primaryReceiver.set(addr, origReceiver, function () {
                            cb();
                        });
                    });
                });
            });
        });

        clearTracks(function () {
            if (doAbort) {
                return cb();
            }

            startRDMs();

            primaryReceiver.set(addr, 1, function () {
                Logger.log('testLog', 'Primary receiver set to: 1');
                doImages(addr, 1, imagesFuture.fulfill);
            });

            getTransmitChannel(addr, function (err, tx) {
                if (err) {
                    txFuture.fulfill(err);
                    return;
                }

                testOuts.transmitChannel = tx;
                txFuture.fulfill();
            });

            softwareVersion.get(addr, function (err, tSoftwareVersion) {
                if (err) {
                    swVersionFuture.fulfill(err);
                    return;
                }

                Logger.log('testLog', 'Got software version: ' + tSoftwareVersion);

                testOuts.softwareVersion = tSoftwareVersion;

                swVersionFuture.fulfill();
            });
            
            getPrimaryReceiver(addr, rxFuture.fulfill);
        });
    }

    function updateRDM() {
        if (doAbort) {
            return stopRDMs();
        }

        if (!getRDMs) {
            return;
        }

        rdmImageElem.src = spotterAddr + '/rdm.png?nocache=' + Date.now();
    }

    function startRDMs() {
        ender('#test-rdm-viewer').css('display', 'block');
        getRDMs = true;
        updateRDM();
    }

    function stopRDMs() {
        getRDMs = false;
        ender('#test-rdm-viewer').css('display', '');
    }

    function runTest(addr, tTrackerDisplay, cb) {
        var finalJoin = futures.join(),
            tSequence = futures.sequence(),
            gpsFuture = futures.future(),
            sequenceFuture = futures.future();

        if (typeof cb !== 'function') {
            cb = function () {};
        }

        doAbort = false;

        spotterAddr = addr;

        finalJoin.add([gpsFuture, sequenceFuture]);
        finalJoin.when(function (gpsRes, wrappingFutureRes) {
            if (doAbort) {
                console.warn('Abort final');
                return cb();
            }

            //console.log('Args:', JSON.stringify(arguments));
            if (gpsRes && gpsRes.length) {
                Logger.log('testLog', gpsRes[0]);
                return;
            }

            Logger.log('testLog', 'All tests finished. Putting spotter back on receiver ' + origReceiver);

            cb();
        });

        Logger.clear('testLog');

        testOuts = {
            timestamp: Date.now(),
            spotterId: ender('#test-spotterid').val().toUpperCase()
        };

        tape = new Tar(testOuts.spotterId + '/' + testOuts.timestamp);

        Logger.log('testLog', 'Connecting...');

        connectToSpotter(function () {
            var join = futures.join(),
                primaryReceiverFuture = futures.future(),
                settingsFuture = futures.future();

            join.add([primaryReceiverFuture, settingsFuture]);

            // make sure these things happen in order
            tSequence.then(function (next) {
                join.when(next);
            }).then(function (next) {
                if (ender('#test-run-transmit-channel')[0].checked) {
                    getTransmitChannel(addr, function (err, tx) {
                        doTransmitChannel(addr, tx, function () {
                            stopRDMs();
                            next();
                        });
                    });
                } else {
                    next();
                }
            }).then(function (next) {
                if (ender('#test-run-angle-calibration')[0].checked) {
                    settings.get(addr, function (err, data) {
                        if (err) {
                            return abort(next);
                        }

                        //console.log(data.phase_calibration_offset);
                        Logger.log('testLog', 'Running angle calibration test');
                        clearTracks(function () {
                            doAngleCalibration(data.phase_calibration_offset, next);
                        });
                    });
                } else {
                    next();
                }
            }).then(function (next) {
                if (doAbort) {
                    console.warn('Abort trChannel');
                    return next();
                }

                if (ender('#test-run-receive-channel')[0].checked) {
                    doReceiveChannel(addr, function () {
                        stopRDMs();
                        Logger.log('testLog', 'Primary tests finished');
                        next();
                    });
                } else {
                    next();
                }
            }).then(function (next) {
                if (ender('#test-run-wrapping')[0].checked && !doAbort) {
                    doWrappingTest(next);
                } else {
                    next();
                }
            }).then(function (next) {
                sequenceFuture.fulfill();
                next();
            });

            Logger.log('testLog', 'Connected to Spotter.');

            if (ender('#test-run-gps')[0].checked) {
                // stick it on the event stack for later
                setTimeout(function () {
                    doGpsTest(addr, gpsFuture.fulfill);
                }, 0);
            } else {
                gpsFuture.fulfill();
            }

            getPrimaryReceiver(addr, primaryReceiverFuture.fulfill);

            settings.post(addr, outdoorSettings, function (err) {
                if (doAbort) {
                    settingsFuture.fulfill();
                    return;
                }

                if (err) {
                    console.error(err);
                    settingsFuture.fulfill(err);
                    return;
                }

                Logger.log('testLog', 'Test settings successfully posted');

                settingsFuture.fulfill();
            });
        });
    }

    /*
     * Binds events necessary for the test suite events.
     * 
     * takeOverCb- callback for when the test-suite wants to take the screen
     * releaseCb- callback for when the test-suite wants to give back focus
     */
    function bindTestSuiteEvents(takeOverCb, releaseCb) {
        function saveTest(cb) {
            if (ender('#test-testername').val().length === 0) {
                alert('Please enter a name before saving.');
                return cb(false);
            }

            sendResults(cb);
        }

        window.onbeforeunload = function () {
            if (hasData()) {
                return 'Some data hasn\'t been saved, are you want to leave?';
            }
        };

        ender('#runTest').bind('click', function () {
            ender('#testsuite-popup').css({
                'display': 'block',
                'background-color': 'rgba(32, 32, 32, .5)'
            });
            
            ender('#test-spotterid')[0].focus();
            ender('#test-spotterip').val(tTrackerDisplay.spotterAddress);

            EventHub.emit('modalLoad');
        });

        ender('#test-rerun').bind('click', function () {
            ender('#start-test').trigger('click');
        });

        ender('#test-saverun').bind('click', function () {
            saveTest(function (success) {
                if (success) { 
                    ender('#testsuite-popup').css({
                        'display': 'block',
                        'background-color': 'rgba(32, 32, 32, .5)'
                    });
                }
            });
        });

        ender('#test-save').bind('click', function () {
            saveTest(function (success) {
                if (success) { 
                    ender('#test-cancel').trigger('click');
                }
            });
        });

        ender('#cancel-test').bind('click', function () {
            ender('#testsuite-popup').css('display', 'none');

            ender('#test-cancel').click();
        });

        ender('#test-abort').bind('click', function () {
            abort();
            ender('#testsuite-div .modal-button:not(.test-abort)').css('display', '');
        });

        ender('#start-test').bind('click', function () {
            var addr = ender('#test-spotterip').val(),
                id = ender('#test-spotterid').val();

            if (!/^SP\d{4}$/i.test(id)) {
                alert('SpotterID invalid. Needs to be of the form sp####');
                ender('#test-spotterid')[0].focus();
                return;
            }

            addr = addr.replace('http://', '');
            if (!/^\d+\.\d+\.\d+\.\d+$/.test(addr) && !/spotter360\.org/.test(addr)) {
                alert('SpotterIP invalid. Test only accepts IP addresses or spotter360.org addresses');
                ender('#test-spotterip')[0].focus();
                return;
            }

            ender('#test-notes').val('');

            ender('#testsuite-popup').css('display', 'none');
            ender('#testsuite-div .modal-button').css('display', 'none');
            ender('#testsuite-div .modal-button.test-abort').css('display', '');

            ender('#testsuite-div').css('display', 'block');

            runTest('http://' + addr, tTrackerDisplay, function (error) {
                if (error) {
                    alert('There was an error and the test was aborted.');
                    ender('#testsuite-div').css('display', '');
                    ender('#runTest').trigger('click');
                    return;
                }
                ender('#testsuite-div .modal-button:not(.test-abort)').css('display', '');
                ender('#testsuite-div .modal-button.test-abort').css('display', 'none');
            });
        });
        
        ender('#test-spotterid').bind('keypress', function (e) {
            // enter key
            if (e.keyCode === 13) {
                ender('#start-test').click();
            }
        });
        ender('#test-spotterip').bind('keypress', function (e) {
            // enter key
            if (e.keyCode === 13) {
                ender('#start-test').click();
            }
        });

        ender('#test-cancel').bind('click', function () {
            clear();

            ender('#testsuite-div').css('display', 'none');

            EventHub.emit('modalClose');
        });

        ender('#wrapPopup1 .button,#wrapPopup2 .button').bind('click', function () {
            if (ender(this).hasClass('run-test')) {
                wrapTestEmitter.emit('submit', true);
            } else if (ender(this).hasClass('skip-test')) {
                wrapTestEmitter.emit('submit', false);
            } else {
                console.error('Unknown event: ' + this.className);
            }
        });
    }

    module.exports.init = function (options) {
        tTrackerDisplay = options.trackerDisplay;

        EventHub.register('wrapTest', wrapTestEmitter);

        ender(options.appendTo).append(extraDomStuff);
        ender(options.buttons).append("<div id='runTest' class='button clickable'><div>Run test suite</div></div>");

        initTrTable();

        bindTestSuiteEvents();

        rdmImageElem = ender('#test-rdm-viewer img')[0];
        rdmImageElem.onload = updateRDM;
        rdmImageElem.onerror = function () {
            // wait for a second so we don't fill up our error log too quickly
            setTimeout(updateRDM, 1000 * 1);
        };
    };
    module.exports.requiresDom = true;
}());
