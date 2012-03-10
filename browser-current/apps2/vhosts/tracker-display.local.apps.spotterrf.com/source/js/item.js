(function () {
    "use strict";

    var conversion = require('./conversion'),
        coordinator = require('coordinator'),
        eventHub = require('eventhub'),
        EventEmitter = require('events').EventEmitter,
        convFn = coordinator('latlong', 'mgrs'),
        uiSettings = require('./uiSettings'),
        itemEmitter = new EventEmitter(),
        friendlyColor = 'rgb(0, 0, 255)';

/* aabbggrr
static int kml_Colors[]=
{
    0xff0000ff,
    0xffff0000,
    0xff00ff00,
    0xff00ffff,
    0xffff00ff,
    0xffffff00,
    0xffffffff,
    0xff83FAF6,
    0xffE824DB,
    0xffffaa55,
    0xff0290e7,
};
*/

    function Item(data, coordinateBounds, bounds) {
        var self = this;

        this.id = data.id;
        this.route = [];
        this.stroke = Item.colors[this.id % 8] || "#FFFFFF";
        this.doDraw = true;

        this.bottomLeft = {
            x: coordinateBounds.minX,
            y: coordinateBounds.minY
        };

        this.topRight = {
            x: coordinateBounds.maxX,
            y: coordinateBounds.maxY
        };

        this.bounds = bounds;

        this.update(data);
    }

    Item.prototype = {
        drawHead: function (g) {
            var routePoint = this.route[this.route.length - 1],
                screenPoint = routePoint.screenPoint,
                radius = uiSettings.item.radius,
                segLength = radius,
                left, right, top, bottom,
                // use background color, but a little transparent
                bgColor = uiSettings.trackerDisplay.fill.replace(/\d*\.?\d*\)$/, '.7)');

            if (!this.doDraw) {
                return;
            }

            // if we're friendly, just draw a blue circle
            if (this.disposition === 'friendly') {
                // draw semi-transparent background
                g.beginPath();
                g.fillStyle = bgColor;
                g.arc(screenPoint.x, screenPoint.y, radius + segLength, 0, Math.PI * 2);
                g.fill();
                g.closePath();

                g.beginPath();
                g.strokeStyle = 'rgba(0, 0, 255, 1)',
                g.lineWidth = uiSettings.item.lineWidth + 1;
                g.arc(screenPoint.x, screenPoint.y, radius, 0, Math.PI * 2);
                g.stroke();
                g.closePath();
            } else {
                left = screenPoint.x - radius;
                right = screenPoint.x + radius;
                top = screenPoint.y - radius;
                bottom = screenPoint.y + radius;

                g.lineWidth = uiSettings.item.lineWidth;

                g.strokeStyle = uiSettings.item.segmentColor || this.stroke;

                // draw semi-transparent background
                g.beginPath();
                g.fillStyle = bgColor;
                g.rect(left - (segLength / 2), top - (segLength / 2), (radius * 2) + segLength, (radius * 2) + segLength);
                g.fill();
                g.closePath();

                g.beginPath();
                // left line
                g.moveTo(left - (segLength / 2), screenPoint.y);
                g.lineTo(left + (segLength / 2), screenPoint.y);

                // right line
                g.moveTo(right - (segLength / 2), screenPoint.y);
                g.lineTo(right + (segLength / 2), screenPoint.y);

                // top line
                g.moveTo(screenPoint.x, top - (segLength / 2));
                g.lineTo(screenPoint.x, top + (segLength / 2));

                // bottom line
                g.moveTo(screenPoint.x, bottom - (segLength / 2));
                g.lineTo(screenPoint.x, bottom + (segLength / 2));

                g.rect(left, top, radius * 2, radius * 2);

                g.closePath();

                g.stroke();
            }

            g.shadowColor = '';
            g.shadowOffsetX = 0;
            g.shadowOffsetY = 0;
            g.shadowBlur = 0;
        },
        drawLabel: function (g, doID, doCoordinates, doSpeed) {
            var point = this.route[this.route.length - 1],
                screen = point.screenPoint,
                mgrs = point.mgrs,
                displayText = '',
                offset = 10,
                yOffset = 0,
                speed = point.speed;

            if (!this.doDraw) {
                return;
            }

            g.font = uiSettings.grid.font;
            g.shadowColor = uiSettings.trackerDisplay.fill;
            g.shadowOffsetX = 1;
            g.shadowOffsetY = 1;
            g.shadowBlur = 0;
            g.textBaseline = 'middle';
            g.fillStyle = uiSettings.item.textColor || uiSettings.item.segmentColor || this.stroke;
            g.lineWidth = uiSettings.item.lineWidth;

            if (doID) {
                g.textAlign = 'right';
                g.fillText(this.id, screen.x - offset - uiSettings.item.radius, screen.y + yOffset);
            }

            if (doCoordinates && mgrs) {
                displayText = mgrs.zone + ' ' + mgrs.square + ' ' + mgrs.easting + ' ' + mgrs.northing;

                g.textAlign = 'left';
                g.fillText(displayText, screen.x + offset + uiSettings.item.radius, screen.y + yOffset);
                yOffset += g.measureText('m').width;
            }

            if (doSpeed) {
                displayText = '';
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

                displayText += speed;

                g.textAlign = 'left';
                g.fillText(displayText, screen.x + offset + uiSettings.item.radius, screen.y + yOffset);
            }

            g.shadowColor = '';
            g.shadowOffsetX = 0;
            g.shadowOffsetY = 0;
            g.shadowBlur = 0;
        },
        drawTrail: function (g) {
            if (!this.doDraw) {
                return;
            }

            g.beginPath();
            this.route.forEach(function (point) {
                g.lineWidth = uiSettings.item.lineWidth;
                g.strokeStyle = uiSettings.item.segmentColor || this.stroke;
                g.lineTo(point.screenPoint.x, point.screenPoint.y);
                g.stroke();
            }, this);
            g.closePath();

            g.shadowOffsetX = 0;
            g.shadowOffsetY = 1;
            g.shadowColor = '';
            g.shadowBlur = 0;
        },
        getPoint: function () {
            var i = this.route.length - 1;

            if (i >= 0) {
                return this.route[i].screenPoint;
            }
        },
        /*
         * If the screen size changed (resize, orientation change, etc.)
         * we'll have to recalculate the screen points.
         */
        refactor: function (coordinateBounds, bounds) {
            this.bottomLeft = {
                x: coordinateBounds.minX,
                y: coordinateBounds.minY
            };

            this.topRight = {
                x: coordinateBounds.maxX,
                y: coordinateBounds.maxY
            };

            this.bounds = bounds;

            this.route.forEach(function (item) {
                item.screenPoint = conversion.unitsToScreen(item.point, this.bottomLeft, this.topRight, this.bounds.width, this.bounds.height, this.bounds.xOffset, this.bounds.yOffset);
            }, this);
        },
        update: function (data) {
            var point,
                screen,
                routePoint,
                mgrs,
                angle,
                range,
                geoloc;

            // backwards compat
            if (typeof data.observation !== 'undefined') {
                angle = data.observation.horizontalAngle;
                range = data.observation.range;
            } else {
                angle = data.boresight.angle;
                range = data.boresight.range;
            }

            if (typeof data.geolocation !== 'undefined') {
                geoloc = data.geolocation;
            } else {
                geoloc = data.coords;
            }

            this.disposition = data.trackClassification || "unknown";
            this.type = data.trackType || "unknown";

            if (this.disposition === 'friendly') {
                this.stroke = friendlyColor;
            }

            // don't allow weird angles above 180
            if (angle > 180) {
                angle -= 360;
            } else if (angle < -180) {
                angle += 360;
            }

            point = {
                x: Math.sin(angle * Math.PI / 180) * range,
                y: Math.cos(angle * Math.PI / 180) * range
            };

            screen = conversion.unitsToScreen(point, this.bottomLeft, this.topRight, this.bounds.width, this.bounds.height, this.bounds.xOffset, this.bounds.yOffset);

            try {
                mgrs = convFn(geoloc.latitude, geoloc.longitude, 5, 'object');
            } catch (e) {
                // this can happen if we get weird lat/long coords (backwards)
            }

            routePoint = {
                point: point,
                screenPoint: screen,
                range: range,
                angle: angle,
                angleFromNorth: (360 + (Item.tracker.originAzimuth || 0) + angle) % 360,
                speed: geoloc.speed,
                latlong: geoloc,
                mgrs: mgrs
            };

            this.route.push(routePoint);
        },
        updateAlertStatus: function (alertStatus) {
            this.doAlert = (alertStatus === 'alert');
            this.doDraw = (alertStatus !== 'ignore' && alertStatus !== 'exclusion');
        }
    };

    Item.colors = [                 //            colors in the KML; I changed a few =)
        'rgba(181, 137, 0, 1)',     // yellow     (0xff0087af)
        'rgba(180, 180, 180, 1)',   // light-grey (0xff005fd7)
        'rgba(50, 50, 50, 1)',      // dark-grey  (0xff0000d7)
        'rgba(211, 54, 130, 1)',    // magenta    (0xff5f00af)
        'rgba(108, 113, 196, 1)',   // violet     (0xffaf5f5f)
        'rgba(38, 139, 210, 1)',    // blue       (0xffff8700)
        'rgba(42, 161, 152, 1)',    // cyan       (0xffafaf00)
        'rgba(133, 153, 0, 1)'      // green      (0xff00875f)
    ];

    // if we have more than 100 tracks, then we have more problems than a memory leak
    itemEmitter.setMaxListeners(100);
    eventHub.register('track', itemEmitter);

    module.exports = Item;
}());
