(function () {
    var eventHub = require('eventhub'),
        ender = require('ender'),
        localStorage = window.localStorage || {},
        uiDefaults = {
            fieldOfView: {
                lineWidth: 2
            },
            grid: {
                lineWidth: 2,
                fontSize: "20pt",
                fontFamily: "SpotterRF Sans",
                fontWeight: "bold",
                textAlign: "left",
                textBaseline: "bottom",
                textSpacing: 5
            },
            item: {
                //segmentColor: "#cc5500",
                segmentLineWidth: 1,
                //textColor: "#990000",
                font: "12pt SpotterRF Sans",
                radius: 7,
                lineWidth: 2
            },
            trackerDisplay: {
                enableFieldOfView: true,
                enableTrail: true,
                enableCoordinates: false,
                enableScale: true,
                enableTrackID: true,
                enableCoordinates: false,
                displayTrackInfo: 'always',
                angleRelativeTo: 'boresight',
                speedUnits: 'mph'
            }
        },
        themes = {
            'night': {
                fieldOfView: {
                    stroke: 'rgba(203, 75, 22, .4)'
                },
                grid: {
                    stroke: 'rgba(0, 43, 54, .6)',
                    textColor: 'rgba(203, 75, 22, .6)'
                },
                zones: {
                    alert: {
                        fill: '#300000'
                    },
                    ignore: {
                        fill: 'rgba(70, 75, 80, .7)'
                    },
                    exclusion: {
                        fill: 'rgba(70, 144, 255, .7)'
                    }
                },
                trackerDisplay: {
                    fill: 'rgba(0, 0, 0, 1)'
                }
            },
            'day': {
                fieldOfView: {
                    stroke: 'rgba(203, 75, 22, 1)'
                },
                grid: {
                    stroke: 'rgb(70, 75, 80)',
                    textColor: 'rgb(7, 54, 66)'
                },
                zones: {
                    alert: {
                        fill: 'rgba(120, 50, 50, 1)'
                    },
                    ignore: {
                        fill: 'rgba(70, 75, 80, .7)'
                    },
                    exclusion: {
                        fill: 'rgba(70, 144, 255, .7)'
                    }
                },
                trackerDisplay: {
                    fill: 'rgba(253, 246, 227, 1)'
                }
            }
        },
        uiSettings = {},
        trackerDisplayUI = 'trackerDisplayUI' in localStorage && JSON.parse(localStorage['trackerDisplayUI']) || {},
        fovUI = 'fovUI' in localStorage && JSON.parse(localStorage['fovUI']) || {},
        gridUI = ('gridUI' in localStorage && JSON.parse(localStorage['gridUI'])) || {},
        itemUI = 'itemUI' in localStorage && JSON.parse(localStorage['itemUI']) || {},
        zonesUI = 'zonesUI' in localStorage && JSON.parse(localStorage['zonesUI']) || {},
        currentTheme = localStorage['theme'] || 'day';

    function mergeSettings(defaults, current) {
      if (typeof current === 'undefined') {
        return current;
      }

      Object.keys(defaults).forEach(function (key) {
        if (typeof current[key] === 'undefined' || typeof defaults[key] !== typeof current[key]) {
          current[key] = defaults[key];
        } else if (typeof defaults[key] === 'object') {
          current[key] = mergeSettings(defaults[key], current[key]);
        }
      });

      return current;
    }

    function combine(a, b) {
      var ret = {};
      if (typeof a !== 'object') {
        a = {};
      }
      if (typeof b !== 'object') {
        b = {};
      }

      ret = JSON.parse(JSON.stringify(a));
      Object.keys(b).forEach(function (key) {
        ret[key] = b[key];
      });

      return ret;
    }

    function changeTheme(theme, permanent) {
        theme = theme || currentTheme;

        // please note, this is a terrible hack
        // it's better to disable/enable stylesheets, but Safari 5.1 doesn't like this
        ender('link[title=theme]').attr('href', 'css/themes/' + theme + '.css');

        if (permanent) {
            currentTheme = theme;
            localStorage['theme'] = theme;
        }

        // change colors
        Object.keys(themes[theme]).forEach(function (componentKey) {
            var newProps = themes[theme][componentKey],
                component = uiSettings[componentKey];

            Object.keys(newProps).forEach(function (key) {
                component[key] = newProps[key];
            });
        });

        eventHub.emit('redraw');
    }

    eventHub.on('changeThemeTemp', function (theme) {
        changeTheme(theme);
    });

    eventHub.on('changeTheme', function (theme) {
        changeTheme(theme, true);
    });

    mergeSettings(combine(uiDefaults.trackerDisplay, themes[currentTheme].trackerDisplay), trackerDisplayUI);
    mergeSettings(combine(uiDefaults.fieldOfView, themes[currentTheme].fieldOfView), fovUI);
    mergeSettings(combine(uiDefaults.grid, themes[currentTheme].grid), gridUI);
    gridUI.__defineGetter__('font', function () {
        return gridUI.fontWeight + ' ' + gridUI.fontSize + ' ' + gridUI.fontFamily;
    });
    mergeSettings(combine(uiDefaults.item, themes[currentTheme].item), itemUI);
    mergeSettings(combine(uiDefaults.zone, themes[currentTheme].zone), zonesUI);

    uiSettings = {
        get trackerDisplay() {
            return trackerDisplayUI;
        },
        set trackerDisplay(val) {
            trackerDisplayUI = val;
            localStorage['trackerDisplayUI'] = JSON.stringify(trackerDisplayUI);
        },
        get fieldOfView() {
            return fovUI;
        },
        set fieldOfView(val) {
            fovUI = val;
            localStorage['fovUI'] = JSON.stringify(fovUI);
        },
        get grid() {
            return gridUI;
        },
        set grid(val) {
            Object.keys(val).forEach(function (key) {
                try {
                    gridUI[key] = val[key];
                } catch (e) {
                    // if it's not settable...
                }
            });

            localStorage['gridUI'] = JSON.stringify(gridUI);
        },
        get item() {
            return itemUI;
        },
        set item(val) {
            itemUI = val;
            localStorage['itemUI'] = JSON.stringify(itemUI);
        },
        get zones() {
            return zonesUI;
        },
        set zones(val) {
            zonesUI = val;
            localStorage['zonesUI'] = JSON.stringify(zonesUI);
        },
        get theme() {
            return currentTheme;
        }
    };

    // TODO: fix weird Chrome bug where themes don't get all the way applied...
    ender.domReady(function fixCss() {
        var seconds = 3;

        changeTheme(currentTheme);
    });

    module.exports = uiSettings;
}());
