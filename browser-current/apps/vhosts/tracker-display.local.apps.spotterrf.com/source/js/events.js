(function () {
    "use strict";

    var eventHub = require('eventhub'),
        uiSettings = require('./uiSettings'),
        Item = require('./item'),
        notifier = require('./notifier'),
        ender = require('ender'),
        allowClick = true,
        trackerDisplay;

    function fixupId(id) {
        id = String(id);

        while (id.length  < 3) {
            id = '0' + id;
        }

        return id;
    }

    function fixupAngle(angle) {
        var neg;

        angle = Math.round(angle);

        // if we're relative to boresight, use L/R instead of negative/positive
        // otherwise just stringify the angle
        if (uiSettings.trackerDisplay.angleRelativeTo === 'boresight') {
            if (angle < 0) {
                neg = true;
                angle = Math.abs(angle);
            }

            angle = String(angle);

            if (angle.length < 2) {
                angle = '0' + angle;
            }

            angle = (neg ? 'L' : 'R') + angle;
        } else {
            angle = String(angle);
        }

        return angle + '°';
    }

    function fixupRange(range) {
        var rangeDigits = trackerDisplay.spotterModel === '600' ? 4 : 3;
        range = String(Math.round(range));

        while (range.length < rangeDigits) {
            range = '0' + range;
        }

        return range + 'm';
    }

    function fixupSpeed(speed) {
        switch(uiSettings.trackerDisplay.speedUnits) {
            case 'm/s':
                speed = Math.round(speed * 10) / 10;
                speed += ' m/s';
                break;
            case 'mph':
                // meters per second -> mph
                speed = Math.round(speed * 2.2369);
                speed += ' mph';
                break;
            case 'kph':
                // meters per second -> kph
                speed = Math.round(speed * 3.6);
                speed += ' kph';
                break;
        }

        return speed;
    }

    function genNotification(id, range, angle, speed) {
        var out = ender('<div></div>').attr('id', 'notify-item-' + id).addClass('notify-item'), neg, rangeDigits;

        out.append('<label class="notify-item-id">' + fixupId(id) + ':</label>');
        out.append(ender('<span></span>').attr('class', 'notify-item-angle').html(fixupAngle(angle)));
        out.append(ender('<span></span>').attr('class', 'notify-item-range').html(fixupRange(range)));

        if (uiSettings.trackerDisplay.enableSpeed) {
            out.append(ender('<br>'));
            out.append(ender('<span>').attr('class', 'notify-item-speed').html(fixupSpeed(speed)));
        }
        out.css({
            'color': Item.colors[id % 8]
        });

        return out;
    }

    function changeFont(font) {
        var fontSize = uiSettings.grid.font.match(/(\d+)pt/)[1] - 1;

        ender('#notify-div').css('font', uiSettings.grid.font.replace(/\d+pt/, fontSize + 'pt'));
    }

    // called only when we always want to see tracks
    function updateTracks(data) {
        // get the tracks and remove any that are invisible
        var tracks = Object.keys(data).map(function (key) {
            return data[key];
        }).filter(function (track) {
            return track.doDraw;
        });
        
        tracks.sort(function (a, b) {
            var latestA = a.route[a.route.length - 1],
                latestB = b.route[b.route.length - 1];

            return latestA.range - latestB.range;
        });

        ender('.notification').remove();

        // only 10 nearest
        tracks.slice(0, 10).forEach(function (track) {
            var notifications = ender('.notification'),
                newNotification, angle,
                latest = track.route[track.route.length - 1];

            if (uiSettings.trackerDisplay.angleRelativeTo === 'north') {
                angle = latest.angleFromNorth;
            } else {
                angle = latest.angle;
            }

            newNotification = genNotification(track.id, latest.range, angle, latest.speed);

            if (notifications.length > 0) {
                notifier.notify(newNotification, ender('.notification').last());
            } else {
                notifier.notify(newNotification);
            }
        });
    }

    // called only when in on-click mode
    function trackUpdated(trackData) {
        var point = trackData.route[trackData.route.length - 1],
            elem = ender('#notify-item-' + trackData.id),
            angle;

        if (elem.length === 0) {
            return;
        }

        if (uiSettings.trackerDisplay.angleRelativeTo === 'north') {
            angle = point.angleFromNorth;
        } else {
            angle = point.angle;
        }

        elem.find('.notify-item-range').html(fixupRange(point.range));
        elem.find('.notify-item-angle').html(fixupAngle(angle));
        elem.find('.notify-item-speed').html(fixupSpeed(point.speed));
    }

    function trackDeleted(trackData) {
        ender('#notify-item-' + trackData.id).parents('.notification').remove();
    }

    function bindEvents(tTrackerDisplay) {
        function hideButtons() {
            ender('#buttons').css('display', '');
        }

        function showButtons() {
            ender('#settings').css('display', 'none');
  
            ender('#buttons').css('display', 'block');
        }

        eventHub.on('modalLoad', hideButtons);
        eventHub.on('modalClose', showButtons);

        trackerDisplay = tTrackerDisplay;
        eventHub.on('fontChanged', changeFont);

        changeFont(uiSettings.grid.font);

        ender('#settings').bind('click', showButtons);

        ender('body').bind('#tracks', 'touchend click', function (e) {
            var x, y, best, bestX, bestY, bestDiff, diffMax = 50, point, angle, modalVisible;
            
            // don't let the settings button be visible unless all modals are hidden
            modalVisible = false;
            ender('.modal-div').each(function () {
                var elem = ender(this);
                if (elem.attr('id') !== 'buttons' && elem.css('display') === 'block') {
                    modalVisible = true;
                }
            });

            if (!modalVisible) {
                ender('#settings').css('display', '');
            }
            hideButtons();

            if (trackerDisplay.displayTrackInfo !== 'click' || !allowClick) {
                return;
            }

            if (e.touches && e.touches.length > 0) {
                x = e.touches[0].pageX;
                y = e.touches[0].pageY;
            } else if (typeof e.pageX === 'number' && typeof e.pageY === 'number') {
                x = e.pageX;
                y = e.pageY;
            } else {
                x = e.clientX + (document.documentElement.scrollLeft || document.body.scrollLeft) - document.documentElement.clientLeft;
                y = e.clientY + (document.documentElement.scrollRight || document.body.scrollRight) - document.documentElement.clientRight;
            }

            x -= ender('#tracks').offset().left;
            y -= ender('#tracks').offset().top;

            Object.keys(trackerDisplay.items).some(function (key) {
                var item,
                    coord,
                    diff;

                // we already have one
                if (ender('#notify-item-' + key).length > 0) {
                    return;
                }

                item = trackerDisplay.items[key];
                coord = item.route[item.route.length - 1].screenPoint;

                diff = Math.abs(coord.x - x) + Math.abs(coord.y - y);
                if (diff > diffMax) {
                    return;
                }

                if (!best || diff < bestDiff) {
                    best = item;
                    bestX = coord.x;
                    bestY = coord.y;
                    bestDiff = Math.abs(bestX - x) + Math.abs(bestY - y);

                    if (bestX === x && bestY === y) {
                        return true;
                    }

                    return;
                }
            });

            if (!best) {
                return;
            }

            point = best.route[best.route.length - 1];
            if (uiSettings.trackerDisplay.angleRelativeTo === 'north') {
                angle = point.angleFromNorth;
            } else {
                angle = point.angle;
            }

            notifier.notify(genNotification(best.id, point.range, angle, point.speed));
        });
        eventHub.on('displayTrackStatus', function (displayItem) {
            if (displayItem === 'click') {
                ender('.notification').trigger('click');

                eventHub.removeListener('tracks', 'update', updateTracks);

                eventHub.on('tracks', 'trackUpdated', trackUpdated);
                eventHub.on('tracks', 'trackDeleted', trackDeleted);
                return;
            }

            eventHub.removeListener('tracks', 'trackUpdated', trackUpdated);
            eventHub.removeListener('tracks', 'trackDeleted', trackDeleted);
            eventHub.on('tracks', 'update', updateTracks);
        });

        eventHub.emit('displayTrackStatus', trackerDisplay.displayTrackInfo);
    }

    eventHub.on('modalLoad', function () {
        allowClick = false;
    });
    eventHub.on('modalClose', function () {
        allowClick = true;
    });

    module.exports = bindEvents;
}());

