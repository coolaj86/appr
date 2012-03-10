(function () {
    'use strict';

    require('../dep/libcanvas');

    var TrackerDisplay = require('./trackerDisplay'),
        bindEvents = require('./events'),
        conversion = require('./conversion'),
        notifier = require('./notifier'),
        version = require('./version'),
        ender = require('ender'),
        tTrackerDisplay,
        EventEmitter = require('events').EventEmitter,
        EventHub = require('eventhub'),
        trackEventEmitter = new EventEmitter(),
        Logger = require('./logger'),
        modules = require('./mods'),
        // fixes problem with FireFox's fullscreen where it would
        // take forever to go fullscreen
        resizeDelay = 500,
        resizeTimeout,
        requiresDom = [],
        lastUpdate = Date.now(),
        clearTracksDelay = 5 * 1000;

    /*
     * Changes the bounds of the tracker display and returns the new bounds.
     * 
     * @param coordinateBounds- Bounds of the coordinate system (defaults to current bounds)
     * @param screenBounds- Screen bounds (uses screen width/height by default)
     * @return New bounds for drawing
     */
    function changeBounds(coordinateBounds, screenBounds) {
        var bounds,
            ratio,
            xOffset = 0,
            yOffset = 25;

        // can't do anything until the tracker display is up
        if (!tTrackerDisplay) {
            return;
        }

        if (!screenBounds) {
            screenBounds = {
                width: window.innerWidth,
                height: window.innerHeight
            };
        }

        coordinateBounds = coordinateBounds || tTrackerDisplay.coordinateBounds;

        ratio = conversion.getMultiplier(coordinateBounds, screenBounds, xOffset, yOffset);

        bounds = {
            width: window.innerWidth,
            height: window.innerHeight,
            xOffset: xOffset,
            yOffset: yOffset
        };

        recreateCanvas('#tracks');
        recreateCanvas('#zones');
        recreateCanvas('#grid');
        tTrackerDisplay.updateScreen(bounds, ratio);

        return bounds;
    }

    function recreateCanvas(selector) {
        var domCanvas;
        
        domCanvas = ender(selector);

        domCanvas.remove().attr({
            width: window.innerWidth,
            height: window.innerHeight
        }).appendTo(ender(selector + '-wrapper'));

        return domCanvas[0].getContext('2d');
    }

    function updateOrientation() {
        changeBounds();
    }

    function handleData(data) {
        tTrackerDisplay.update(data);
    }

    function longPoll() {
        ender.ajax({
            'url': tTrackerDisplay.spotterTracksAddress,
            'type': 'json',
            'method': 'get',
            'crossOrigin': true,
            'timeout': 1000 * 5,
            'success': function (data) {
                if (data) {
                    if (data.result) {
                        data = data.result;
                    }

                    trackEventEmitter.emit('data', data);
                }
                setTimeout(longPoll, 0);
                lastUpdate = Date.now();
            },
            'error': function (e) {
                trackEventEmitter.emit('error', e);
                setTimeout(longPoll, 1000 * 1);
            }
        });
    }

    window.onerror = function (e) {
        console.error('Uncaught error:', e);
        return true;
    };

    // fired when an update has been downloaded
    ender(applicationCache).bind('updateready', function () {
        window.location.reload();
    });

    ender(applicationCache).bind('obsolete', function () {
        alert('The server reports that this webapp is no longer available offline. This application will be uninstalled.');
    });

    EventHub.on('coordinateBoundsChanged', function (coordinateBounds) {
        changeBounds(coordinateBounds);
    });

    ender.domReady(function () {
        var context2D, screenBounds, fieldOfView;

        EventHub.register('trackers', trackEventEmitter);

        ender(window).bind('resize', function (e) {
            // Firefox fires a ton of resize events when it goes into fullscreen
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }

            resizeTimeout = setTimeout(function () {
                resizeTimeout = null;
                changeBounds();
            }, resizeDelay);
        });

        EventHub.on('trackers', 'data', handleData);
        EventHub.on('trackers', 'error', function (e) {
            console.error('Request for tracks timed out');

            // if we've had no new tracks for a while, clear current tracks
            if (Date.now() - lastUpdate >= clearTracksDelay) {
                console.error('Track update timed out, clearing tracks');
                tTrackerDisplay.clearTracks();
                tTrackerDisplay.draw();
            }
        });

        ender('#version').html('<span>v' + String(version.version) + '</span><br /><span>Build: ' + version.build + '</span>');

        context2D = recreateCanvas('#tracks');
        if (context2D) {
            screenBounds = {
                width: window.innerWidth,
                height: window.innerHeight
            };

            notifier();

            tTrackerDisplay = new TrackerDisplay();
            updateOrientation(window.orientation || 0);

            longPoll();
            
            bindEvents(tTrackerDisplay);

            modules.forEach(function (mod) {
                mod.init({
                    appendTo: ender('#appendHere')[0],
                    buttons: ender('#buttons')[0],
                    trackerDisplay: tTrackerDisplay
                });
            });
        } else {
            alert('Can\'t get canvas context handle.' +
                  '\nPerhaps this is\'t a canvas element??');
        }
    });

    module.exports.changeBounds = changeBounds;
}());
