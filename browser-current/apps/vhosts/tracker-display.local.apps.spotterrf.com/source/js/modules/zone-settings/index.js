(function () {
    var eventHub = require('eventhub'),
        ender = require('ender'),
        uiSettings = require('../../uiSettings').zones,
        tTrackerDisplay,
        startPoint,
        curPoint,
        modal = false,
        zoneType,
        curID;

    function getPoint(e) {
        var x, y;

        if (e.touches) {
            if (e.touches.length === 1) {
                x = e.touches[0].pageX;
                y = e.touches[0].pageY;
            } else if (e.touches.length === 0 && e.changedTouches.length === 1) {
                x = e.changedTouches[0].pageX;
                y = e.changedTouches[0].pageY;
            }
        } else if (e.pageX || e.pageY) {
            x = e.pageX;
            y = e.pageY;
        } else if (e.clientX || e.clientY) {
            x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }

        return {x: x, y: y};
    }

    function dragHandler(e) {
        e.preventDefault();
        e.stopPropagation();

        curPoint = getPoint(e);

        tTrackerDisplay.updateZone(curID, [startPoint, curPoint]);
        eventHub.emit('redraw', 'zones');
    }

    function dragStartHandler(e) {
        // just give something to start off with
        startPoint = curPoint = getPoint(e);

        curID = tTrackerDisplay.addZone([startPoint, curPoint], ender('#create-alertzone').attr('data-toggled') ? 'alert' : 'ignore', 'rectangle');

        ender('#tracks,div').bind('mousemove', dragHandler);
        ender('#tracks,div').bind('touchmove', dragHandler);
    }

    function dragEndHandler() {
        ender('#create-' + zoneType + 'zone').trigger('click');

    }

    function bindZoneEvents() {
        // alert-zone button
        ender('#zone-button').bind('click', function () {
            modal = true;

            ender('#zone-div').css('display', 'block');

            eventHub.emit('modalLoad');
        });

        ender('#zone-cancel').bind('click', function () {
            modal = false;

            ender('#zone-div').css('display', 'none');

            eventHub.emit('modalClose');

            ender('#delete-zone').removeAttr('data-toggled').length;
            ender(document).unbind('click touchend', clickHandler);
            eventHub.emit('redraw', 'zones');
        });

        function stopBubble(e) {
            e.stopPropagation();
            e.preventDefault();
        }

        function toggleZoneButton() {
            var zoneButton = ender('#create-' + zoneType + 'zone'),
                toggled = zoneButton.attr('data-toggled'),
                alternateZone = (zoneType === 'alert') ? 'ignore' : 'alert',
                alternateButton = ender('#create-' + alternateZone + 'zone');

            alternateButton.removeAttr('data-toggled').css('background-color', '');

            zoneButton.attr('data-toggled', toggled ? '' : true);
            toggled = !toggled;

            if (toggled) {
                ender('#tracks,div').bind('mousedown touchstart', dragStartHandler);

                ender('#tracks,div').bind('mouseup touchend touchcancel', dragEndHandler);

                zoneButton.css('background-color', uiSettings[zoneType].fill);
            } else {
                ender('#tracks,div').unbind('mousedown touchstart', dragStartHandler).unbind('mouseup touchend touchcancel', dragEndHandler).unbind('mousemove touchmove', dragHandler);

                zoneButton.css('background-color', '');
            }

            if (ender('#delete-zone[data-toggled=true]').length > 0) {
                ender('#delete-zone[data-toggled=true]').trigger('click');
            }
        }

        function clickHandler(e) {
            var point = getPoint(e),
                ret;

            ret = tTrackerDisplay.zones.slice(0).reverse().some(function (zone, i, arr) {
                if (zone.type === 'alert' && zone.contains(point)) {
                    tTrackerDisplay.removeZone(arr.length - i - 1);
                    eventHub.emit('redraw', 'zones', 'delete');
                    return true;
                }
            });

            if (ret) {
                return;
            }

            ret = tTrackerDisplay.zones.slice(0).reverse().some(function (zone, i, arr) {
                if (zone.type === 'ignore' && zone.contains(point)) {
                    tTrackerDisplay.removeZone(arr.length - i - 1);
                    eventHub.emit('redraw', 'zones', 'delete');
                    return true;
                }
            });
        }

        ender('#create-alertzone').bind('click', function () {
            zoneType = 'alert';
            toggleZoneButton();
        });
        ender('#create-ignorezone').bind('click', function () {
            zoneType = 'ignore';
            toggleZoneButton('ignore');
        });

        ender('#delete-zone').bind('click', function (e) {
            var toggled = ender(this).attr('data-toggled');

            e.stopPropagation();

            if (toggled === 'true') {
                ender(this).removeAttr('data-toggled');
                eventHub.emit('zone-normal');
                ender(document).unbind('click touchend', clickHandler);
            } else {
                ender(this).attr('data-toggled', 'true');
                eventHub.emit('zone-delete');
                ender(document).bind('click touchend', clickHandler);
            }
        });
    }

    module.exports.init = function (options) {
        tTrackerDisplay = options.trackerDisplay;

        bindZoneEvents();
    };
}());
