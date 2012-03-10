(function () {
    'use strict';

    var eventHub = require('eventhub'),
        version = require('../../version');

    function bindEvents(tTrackerDisplay) {
        ender('#about-button').bind('click', function () {
            ender('#about-div').css('display', 'block');
            eventHub.emit('modalLoad');
        });

        ender('#about-back').bind('click', function () {
            ender('#about-div').css('display', 'none');
            eventHub.emit('modalClose');;
        });
    }

    module.exports.init = function (options) {
        bindEvents(options.trackerDisplay);
    };
}());
