(function () {
    "use strict";

    var Item = require('./item'),
        Grid = require('./grid'),
        Zone = require('./zone'),
        eventhub = require('eventhub'),
        ender = require('ender'),
        underscore = require('underscore'),
        EventEmitter = require('events').EventEmitter,
        trackEventEmitter,
        uiSettings = require('./uiSettings'),
        localStorage = window.localStorage || {},
        loadingExclusionZones = false,
        itemsInAlertZone = [],
        // if we're running it on a spotter, keep the spotter's address; otherwise use the default local spotter address
        // only spotters on localhost, spotter360.org and spotterrf.com should use the local address; assume everything else is a valid spotter
        defaultAddress = /(tracker\.spotter360\.org)|(tracker\.spotterrf.com)|(localhost)/.test(location.host) ? '192.168.254.254' : location.host;

    function doAlert() {
        ender('#audio-alert')[0].play();
    }

    function loadExclusionZones(trackerDisplay) {
        var i;

        if (loadingExclusionZones) {
            return;
        }

        loadingExclusionZones = true;

        // this is just a hack to get this to work without restructuring addZone
        trackerDisplay.zones = trackerDisplay.zones.filter(function (zone, i, arr) {
            if (zone.type === 'exclusion') {
                return false;
            }

            return true;
        });

        ender.ajax({
            'url': trackerDisplay.spotterAddress + '/exclusion.json',
            'type': 'json',
            'method': 'get',
            'crossOrigin': true,
            'success': function (data) {
                var i, t;

                data = data.result;
                for (i = 1; i <= 5; i += 1) {
                    t = {
                        start: data['exclusion_zone_' + i + '_min'],
                        end: data['exclusion_zone_' + i + '_max']
                    };

                    if (t.start !== 0 || t.end !== 0) {
                        trackerDisplay.addZone(t, 'exclusion', 'arc');
                    }
                }

                loadingExclusionZones = false;
                eventhub.emit('redraw', 'zones');
            },
            'error': function (err) {
                loadingExclusionZones = false;
                console.error('Error getting exclusion.json:', err);
            }
        });

        ender.ajax({
            'url': trackerDisplay.spotterAddress + '/sensor.json',
            'type': 'json',
            'method': 'get',
            'crossOrigin': true,
            'success': function (data) {
                if (typeof data === 'object' && typeof data.result === 'object' &&
                    Array.isArray(data.result.exclusions)) {
                    data.result.exclusions.forEach(function (exclusion) {
                        var t;
                        if (!exclusion.type === 'radial') {
                            return;
                        }

                        t = {
                            start: exclusion.min,
                            end: exclusion.max
                        };

                        if (t.start !== 0 || t.end !== 0) {
                            trackerDisplay.addZone(t, 'exclusion', 'arc');
                        }
                    });

                    loadingExclusionZones = false;
                    eventhub.emit('redraw', 'zones');
                }
            },
            'error': function (err) {
                loadingExclusionZones = false;
                console.error('Error getting sensor.json:', err);
            }
        });
    }

    function TrackerDisplay() {
        var self = this;

        Item.tracker = this;

        trackEventEmitter = new EventEmitter();
        trackEventEmitter.setMaxListeners(50);
        eventhub.register('tracks', trackEventEmitter);

        this.items = {};
        this.zones = [];

        this.grid = new Grid();

        this._settings = uiSettings.trackerDisplay;
        this._origin = {};

        this.updateBg = true;
        this.spotterAddress = localStorage['spotterAddr'] || defaultAddress;
        this.spotterModel = localStorage['spotterModel'] || '80';

        this.refreshOrigin = function () {
            var self = this;

            ender.ajax({
                'url': this.spotterAddress + '/geolocation.json',
                'crossOrigin': true,
                'type': 'json',
                'success': function (data) {
                    // since the only difference between the old and new api
                    // for geolocation is just a namespace and different name
                    // for one field, we'll go ahead and maintain backwards compat
                    if (typeof data.result !== 'undefined') {
                        data = data.result;
                        self.originAzimuth = data.bearing;
                    } else if (typeof data.latitude === 'undefined') {
                        return;
                    } else {
                        self.originAzimuth = data.heading;
                    }

                    self.origin = {
                        latitude: data.latitude,
                        longitude: data.longitude
                    };

                    self.grid.radialStepStart = self.settings.angleRelativeTo === 'north' ? self.originAzimuth : 0;
                },
                'error': function (err) {
                    console.error(err);
                }
            });
        };
        this.refreshOrigin();

        this.init(true);

        loadExclusionZones(this);

        ender.ajax({
            'url': this.spotterAddress + '/model.json',
            'type': 'json',
            'method': 'get',
            'crossOrigin': true,
            'success': function (data) {
                if (data && data.result && data.result.model) {
                    self.spotterModel = data.result.model;
                } else {
                    console.error('Response for model received, but there was no data.');
                }
            },
            'error': function (err) {
                console.error('Error getting model:', err);
            }
        });

        eventhub.on('redraw', function (group) {
            var newArgs = Array.prototype.slice.call(arguments, 1);
            switch (group) {
                case 'tracks':
                    self.draw.apply(self, newArgs);
                    break;

                case 'grid':
                    self.drawGrid.apply(self, newArgs);
                    break;

                case 'zones':
                    self.drawZones.apply(self, newArgs);
                    break;

                default:
                    self.draw.apply(self, newArgs);
                    self.drawGrid.apply(self, newArgs);
                    self.drawZones.apply(self, newArgs);
                    break;
            }
        });

        eventhub.on('zone-delete', function () {
            self.drawZones('delete');
        });

        eventhub.on('zone-normal', function () {
            self.drawZones();
        });
    }

    TrackerDisplay.prototype = {
        // properties

        get bounds () {
            return this._bounds;
        },
        set bounds (val) {
            this._bounds = val;
        },
        get coordinateBounds () {
            return this._coordinateBounds;
        },
        set coordinateBounds (val) {
            this._coordinateBounds = val;
        },
        get displayTrackInfo() {
            return localStorage['displayTrackInfo'] || uiSettings.trackerDisplay.displayTrackInfo;
        },
        set displayTrackInfo(val) {
            // don't do anything if this didn't change
            if (this.displayTrackInfo.displayTrackInfo === val) {
                return;
            }

            this.settings.displayTrackInfo = val;
            localStorage['displayTrackInfo'] = val;
            if (val === 'always') {
                eventhub.emit('displayTrackStatus', 'always', this.items);
            } else if (val === 'click') {
                eventhub.emit('displayTrackStatus', 'click');
            }
        },
        get spotterAddress() {
            return 'http://' + this.spotterAddr;
        },
        set spotterAddress(val) {
            var tUrl, self = this;

            if (val) {
                this.spotterAddr = val.replace('http://', '');
            }
            localStorage['spotterAddr'] = this.spotterAddr.replace(/\/$/, '');
            eventhub.once('trackers', 'data', function () {
                self.refreshOrigin();
            });
        },
        get spotterModel () {
            return this.model || '80';
        },
        set spotterModel (val) {
            if (this.model === val) {
                return;
            } else if (!val || !/80|600/.test(val)) {
                val = '80';
            }

            this.model = (val || this.spotterModel).replace(/[a-z](\d+).*/i, function (str, p1, p2) { return p1; });
            if (/600/.test(this.model)) {
                this.coordinateBounds = {
                    minX: -450,
                    minY: 0,
                    maxX: 450,
                    maxY: 1575
                };
                this.grid.fieldOfView.breadth = 800;
                this.grid.fieldOfView.depth = 1000;
                this.grid.fieldOfView.offset = 30;
            } else {
                this.coordinateBounds = {
                    minX: -250,
                    minY: 0,
                    maxX: 250,
                    maxY: 525
                };
                this.grid.fieldOfView.breadth = 400;
                this.grid.fieldOfView.depth = 500;
                this.grid.fieldOfView.offset = 15;
            }

            localStorage['spotterModel'] = val;

            eventhub.emit('coordinateBoundsChanged');

            loadExclusionZones(this);
        },
        get spotterTracksAddress() {
            return "http://" + this.spotterAddr + '/tracks.json?maxWait=2000';
        },
        get origin() {
            return this._origin.latLong;
        },
        set origin(val) {
            this._origin.latLong = val;
        },
        set originAzimuth(val) {
            this._origin.azimuth = val;
        },
        get originAzimuth() {
            return this._origin.azimuth;
        },
        set angularUnits(val) {
            this._angularUnits = val || 'radians';
        },
        get settings() {
            return uiSettings.trackerDisplay;
        },
        set settings(val) {
            uiSettings.trackerDisplay = val;
        },
        get tempSetings(){
            return this._tempSettings;
        },
        set tempSettings(settings) {
            if (!settings) {
                this.spotterModel = localStorage['spotterModel'] || '80';
                this._tempSettings = null;
                return;
            }

            this._tempSettings = settings;

            // default to instance settings if settings doesn't define it
            Object.keys(this.settings).forEach(function (key) {
                if (typeof this._tempSettings[key] === 'undefined') {
                    this._tempSettings[key] = this.settings[key];
                }
            }, this);

            if (typeof settings.spotterModel !== 'undefined') {
                this.spotterModel = settings.spotterModel;
            }
        },
        get zones() {
            if (!this._zones) {
                this._zones = [];
            }
            return this._zones;
        },
        set zones(val) {
            this._zones = val;
        },

        // functions

        clearTracks: function () {
            Object.keys(this.items).forEach(function (key) {
              trackEventEmitter.emit('trackDeleted', this.items[key]);
            }, this);

            this.items = {};
        },

        init: function (dontDraw) {
            Object.keys(this.items).forEach(function (key) {
                delete this.items[key];
            }, this);
            this.origin = {};

            this.zones.length = 0;

            if (!dontDraw) {
                this.draw();
            }
        },
        /*
         * Checks whether the item is in a zone, and if so, what type.
         * 
         * If the item is on a layer of zones, the first zone processed will
         * determine the type unless an alert zone is in the layers, then the
         * alert zone takes precidence.
         *
         * @param item- The item to check
         * @return The zone's type or null
         */
        itemIsInZone: function (item) {
            var ret = null,
                idx = itemsInAlertZone.indexOf(String(item.id)),
                alertFound;

            alertFound = this.zones.some(function (zone) {
                if (zone.contains(item.getPoint())) {
                    // if ret is 0, set it, otherwise leave it be
                    ret = ret || zone.type;

                    if (zone.type === 'alert') {
                        ret = zone.type;

                        if (idx === -1) {
                            itemsInAlertZone.push(String(item.id));

                            // put this on the event stack
                            setTimeout(doAlert, 0);
                        }

                        // leave the loop
                        return true;
                    }
                }
            });

            if (idx >= 0 && !alertFound) {
                itemsInAlertZone.splice(idx, 1);
            }

            return ret;
        },
        /*
         * Adds an alert zone (or ignore zone...).
         *
         * @param start- Starting screen point
         * @param end- Ending screen point
         * @param type- Possible values ['alert', 'ignore', 'exclusion']
         * @param fn- Function to call for alert zone (optional)
         */
        addZone: function (points, type, shape) {
            var tZone;
           
            // the tracker is drawn at the bottom middle
            // the last parameter is the x, y coords
            tZone = new Zone(type, shape, points, this.ratio, {x: this.bounds.width / 2, y: this.bounds.height});

            this.zones.push(tZone);

            return this.zones.length - 1;
        },
        findItemNear: function (x, y, maxDistance) {
            var within = maxDistance || 30,
                closest = within * 2,
                item;
            
            Object.keys(this.items).forEach(function (i) {
                var tItem = this.items[i],
                    scrPoint = tItem.route[tItem.route.length - 1].screenPoint,
                    xDist = Math.abs(scrPoint.x - x),
                    yDist = Math.abs(scrPoint.y - y),
                    factor = xDist + yDist;

                if (xDist < within && yDist < within && factor < closest) {
                    closest = factor;
                    item = tItem;
                }
            }, this);

            return item;
        },
        updateZone: function (id, points) {
            this.zones[id].update(points, this.ratio, {x: this.bounds.width / 2, y: this.bounds.height});
        },
        removeZone: function (point) {
            var i;

            // actually an id
            if (typeof point === 'number') {
                this.zones.splice(point, 1);
                return;
            }

            for (i = 0; i < this.zones.length; i += 1) {
                if (underscore.isEqual(startPoint, this.zones[i].start)) {
                    this.zones.splice(i, 1);
                    i -= 1;
                }
            }
        },
        draw: function (context) {
            var g = context || this.context,
                settings = this.tempSettings || this.settings;

            if (!g) {
                throw 'No context given, not drawing Tracker Display';
            }

            g.fillStyle = this.settings.fill;
            g.clearRect(0, 0, this.bounds.width, this.bounds.height);

            this.updateBg = false;

            if (settings.enableTrail) {
                Object.keys(this.items).forEach(function (item) {
                    this.items[item].drawTrail(g);
                }, this);
            }

            Object.keys(this.items).forEach(function (item) {
                this.items[item].drawHead(g);
            }, this);

            if (settings.enableTrackID || settings.enableCoordinates || settings.enableSpeed) {
                Object.keys(this.items).forEach(function (item) {
                    this.items[item].drawLabel(g, settings.enableTrackID, settings.enableCoordinates, settings.enableSpeed);
                }, this);
            }
        },
        drawGrid: function () {
            var g = ender('#grid')[0].getContext('2d');

            g.clearRect(0, 0, this.bounds.width, this.bounds.height);
            this.grid.draw(g, this.ratio, this.settings.enableFieldOfView, this.settings.enableScale);
        },
        drawZones: function (mode) {
            var zoneList = this.zones,
                g = g || ender('#zones')[0].getContext('2d');

            mode = mode || 'normal';

            g.clearRect(0, 0, ender('#zones').width(), ender('#zones').height());

            // draw ignore zones first, because alert-zones take precedence
            zoneList.forEach(function (zone) {
                if (zone.type === 'ignore' || zone.type === 'exclusion') {
                    zone.draw(g, mode);
                }
            });
            zoneList.forEach(function (zone) {
                if (zone.type === 'alert') {
                    zone.draw(g, mode);
                }
            });
        },
        addLine: function (startX, startY, endX, endY) {
            this.shim = {startX: startX, startY: startY, endX: endX, endY: endY};
        },
        updateItems: function (itemArray) {
            var idsDone = [];

            if (!itemArray) {
                return;
            }

            itemArray.forEach(function (item) {
                var tID = item.id;

                if (!this.items[tID]) {
                    this.items[tID] = new Item(item, this.coordinateBounds, this.bounds);
                    trackEventEmitter.emit('newTrack', this.items[tID]);
                }

                this.items[tID].update(item);
                trackEventEmitter.emit('trackUpdated', this.items[tID]);

                this.items[tID].updateAlertStatus(this.itemIsInZone(this.items[tID]));

                idsDone.push(tID);
            }, this);

            Object.keys(this.items).forEach(function (key) {
                var idx;

                if (idsDone.indexOf(this.items[key].id) < 0) {
                    trackEventEmitter.emit('trackDeleted', this.items[key]);
                    idx = itemsInAlertZone.indexOf(key);
                    if (idx >= 0) {
                        itemsInAlertZone.splice(idx, 1);
                    }

                    delete this.items[key];
                }
            }, this);

            trackEventEmitter.emit('update', this.items);
        },
        update: function (data) {
            var tracks;
            if (!data) {
                return;
            }

            if (Array.isArray(data)) {
                tracks = data;
            } else if (Array.isArray(data.tracks)) {
                tracks = data.tracks;
            } else {
                return;
            }

            this.updateItems(tracks);

            this.draw(null, this.tempSettings);
        },
        updateScreen: function (bounds, ratio) {
            var screenOrigin;

            this.ratio = ratio;

            this.updateBg = true;
            this.context = ender('#tracks')[0].getContext('2d');

            this.bounds = bounds;
            screenOrigin = {
                x: this.bounds.width / 2,
                y: this.bounds.height
            };

            this.grid.update(this.bounds, ratio, 25, 20);
            this.grid.fieldOfView.update(this.bounds, ratio);

            Object.keys(this.items).forEach(function (item) {
                this.items[item].refactor(this.coordinateBounds, this.bounds);
            }, this);

            this.zones.forEach(function (zone) {
                zone.refactor(screenOrigin, ratio);
            }, this);

            loadExclusionZones(this);

            this.draw();
            this.drawGrid();
            this.drawZones();
        }
    };

    module.exports = TrackerDisplay;
}());
