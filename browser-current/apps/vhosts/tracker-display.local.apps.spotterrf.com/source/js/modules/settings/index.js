(function () {
    'use strict';

    var eventHub = require('eventhub'),
        ender = require('ender'),
        uiSettings = require('../../uiSettings'),
        gridUI = {},
        trackUI = {};

    module.exports.init = function (options) {
        ender('#settings-button').bind('click', function () {
            ender('#style-div').css('display', 'block');
            eventHub.emit('modalLoad');

            ender('#style-theme').val(uiSettings.theme);

            ender('#showScale')[0].checked = uiSettings.trackerDisplay.enableScale;

            ender('#showTrail')[0].checked = uiSettings.trackerDisplay.enableTrail;
            ender('#showTrackID')[0].checked = uiSettings.trackerDisplay.enableTrackID;
            ender('#showCoordinates')[0].checked = uiSettings.trackerDisplay.enableCoordinates;
//            ender('#showSpeed')[0].checked = uiSettings.trackerDisplay.enableSpeed;
            ender('.displayTrackInfo[value=' + options.trackerDisplay.displayTrackInfo + ']').attr('checked', true);

            Object.keys(uiSettings.item).forEach(function (key) {
                trackUI[key] = uiSettings.item[key];
            });
            ender('#style-track-size').val(String(trackUI.radius || 5));
            ender('#style-track-width').val(String(trackUI.lineWidth || 1));

            Object.keys(uiSettings.grid).forEach(function (key) {
                gridUI[key] = uiSettings.grid[key];
            });
        });

        ender('#style-theme').bind('change', function () {
            eventHub.emit('changeTheme', ender(this).val());
        });

        ender('#showScale').bind('click', function () {
            var tSettings = uiSettings.trackerDisplay;
            tSettings.enableScale = this.checked;
            uiSettings.trackerDisplay = tSettings;

            eventHub.emit('redraw', 'grid');
        });

        ender('#showTrail').bind('click', function () {
            var tSettings = uiSettings.trackerDisplay;
            tSettings.enableTrail = this.checked;
            uiSettings.trackerDisplay = tSettings;

            eventHub.emit('redraw', 'tracks');
        });

        ender('#showTrackID').bind('click', function () {
            var tSettings = uiSettings.trackerDisplay;
            tSettings.enableTrackID = this.checked;
            uiSettings.trackerDisplay = tSettings;

            eventHub.emit('redraw', 'tracks');
        });

        ender('#showCoordinates').bind('click', function () {
            var tSettings = uiSettings.trackerDisplay;
            tSettings.enableCoordinates = this.checked;
            uiSettings.trackerDisplay = tSettings;

            eventHub.emit('redraw', 'tracks');
        });

/*
        ender('#showSpeed').bind('click', function () {
            var tSettings = uiSettings.trackerDisplay;
            tSettings.enableSpeed = this.checked;
            uiSettings.trackerDisplay = tSettings;

            eventHub.emit('redraw', 'tracks');
        });
*/

        ender('input[name=displayTrackInfo]').bind('change', function () {
            console.log('Change', ender(this).val());
            options.trackerDisplay.displayTrackInfo = ender(this).val();
        });

        ender('#style-close').bind('click', function () {
            ender('#style-div').css('display', 'none');
            eventHub.emit('modalClose');
            eventHub.emit('changeTheme');
        });

        ender('#style-track-width').bind('change', function (e) {
            trackUI.lineWidth = +ender(e.target).val();
            uiSettings.item = trackUI;
            eventHub.emit('redraw', 'tracks');
        });

        ender('#style-track-size').bind('change', function (e) {
            trackUI.radius = +ender(e.target).val();
            uiSettings.item = trackUI;
            eventHub.emit('redraw', 'tracks');
        });
    };
}());
