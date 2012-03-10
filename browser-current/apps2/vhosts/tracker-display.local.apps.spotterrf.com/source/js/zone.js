(function () {
    "use strict";

    var conversion = require('./conversion'),
        uiSettings = require('./uiSettings').zones,
        validTypes = ['alert', 'ignore', 'exclusion'],
        validShapes = ['rectangle', 'arc'],
        deleteBoxSize = 20;

    /*
     * Get whether the given point is in the given rectangle.
     *
     * @r- Rectangle. Must have these properties [minX, minY, maxX, maxY]
     * @p- Point. Must have these properties [x, y]
     * @return True if the point is in the rectangle, false otherwise
     */
    function pointInRect(r, p) {
        var minX = Math.min(r[0].x, r[1].x),
            minY = Math.min(r[0].y, r[1].y),
            maxX = Math.max(r[0].x, r[1].x),
            maxY = Math.max(r[0].y, r[1].y);

        if (minX <= p.x && maxX >= p.x && minY <= p.y && maxY >= p.y) {
            return true;
        }
        return false;
    }

    /*
     * Creates a new zone.
     * 
     * @param type- alert or ignore
     * @param shape- rectangle or arc (only currently supported shapes)
     * @param data- data specific to the shape
     * @param ratio- ratio for converting meters to pixels
     * @param origin- screen point of where this zone is relative to (tracker)
     */
    function Zone(type, shape, data, ratio, origin) {
        if (validTypes.indexOf(type) < 0) {
            throw 'Invalid type passed to Zone: ' + type;
        }

        if (validShapes.indexOf(shape) < 0) {
            throw 'Invalid shape passed to Zone: ' + shape;
        }

        this.type = type;
        this.shape = shape;

        this.update(data, ratio, origin);
    }

    Zone.prototype = {
        get shape() { return this._shape; },
        set shape(val) {
            if (typeof val === 'string' && validShapes.indexOf(val) >= 0) {
                this._shape = val;
            }
        },
        get type() { return this._type; },
        set type(val) {
            if (typeof val === 'string' && validTypes.indexOf(val) >= 0) {
                this._type = val;
            }
        },
        /*
         * Checks to see if this alert-zone contains a point.
         *
         * @param point- Point in question, must have an x and a y
         * @return True if the point is within this zone, false otherwise.
         */
        contains: function (point) {
            if (this.shape === 'rectangle') {
                return pointInRect(this.screen, point);
            }
            return false;
        },
        draw: function (g, mode) {
            if (this.type === 'alert') {
                g.fillStyle = uiSettings.alert.fill;
            } else if (this.type === 'ignore'){
                g.fillStyle = uiSettings.ignore.fill;
            } else if (this.type === 'exclusion') {
                g.fillStyle = uiSettings.exclusion.fill;
            }

            if (this.shape === 'rectangle') {
                var minX = Math.min(this.screen[0].x, this.screen[1].x);
                var minY = Math.min(this.screen[0].y, this.screen[1].y);
                var maxX = Math.max(this.screen[0].x, this.screen[1].x);
                var maxY = Math.max(this.screen[0].y, this.screen[1].y);

                g.fillRect(minX, minY, maxX - minX, maxY - minY);

                if (mode === 'delete') {
                    g.beginPath();
                    g.strokeStyle = 'black';
                    g.lineWidth = 3;
                    g.moveTo(this.screen[0].x, this.screen[0].y);
                    g.lineTo(this.screen[1].x, this.screen[1].y);
                    
                    g.moveTo(this.screen[1].x, this.screen[0].y);
                    g.lineTo(this.screen[0].x, this.screen[1].y);
                    g.stroke();
                    g.closePath();
                }
            } else if (this.shape === 'arc') {
                g.beginPath();
                g.arc(this.origin.x, this.origin.y, this.screen.end, 0, Math.PI, true);
                g.arc(this.origin.x, this.origin.y, this.screen.start, Math.PI, 0, false);
                g.closePath();
                g.fill();
            }
        },
        refactor: function (origin, ratio) {
            if (this.shape === 'rectangle') {
                this.screen = this.rect.map(function (point) {
                    return {
                        x: (point.x * ratio) + origin.x,
                        y: origin.y - (point.y * ratio)
                    };
                });

                console.log(JSON.stringify(this.screen, null, '  '));
                console.log(JSON.stringify(this.rect, null, '  '));
                console.log();
                console.log();
                console.log();
                console.log();
            }
        },
        update: function (data, ratio, origin) {
            switch (this.shape) {
                case 'arc':
                    this.range = {
                        start: data.start,
                        end: data.end
                    };

                    this.screen = {
                        start: data.start * ratio,
                        end: data.end * ratio
                    };
                    this.origin = origin;
                    break;

                case 'rectangle':
                default:
                    this.rect = [
                        {
                            x: (data[0].x - origin.x) / ratio,
                            y: (origin.y - data[0].y) / ratio
                        },
                        {
                            x: (data[1].x - origin.x) / ratio,
                            y: (origin.y - data[1].y) / ratio
                        }
                    ];

                    // data is array of screen points, just what we need
                    // we'll copy it just in case
                    this.screen = data.slice(0);
                    break;
            }
        }
    };

    module.exports = Zone;
}());
