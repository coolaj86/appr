(function () {
    'use strict';

    var ender = require('ender'),
        initialized;

    function init() {
        ender.domReady(function () {
            ender('<div>').attr('id', 'notify-div').appendTo('body');

            ender('#notify-div').delegate('.notification', 'click', function () {
                ender(this).remove();
            });
        });
        
        initialized = true;
        
        return notify;
    }

    function notify(stuffs, appendTo) {
        var tNotification,
            closeButton,
            closeWrapper;

        if (!initialized) {
            init();
        }

        tNotification = ender('<div>').addClass('notification');
        tNotification.append(stuffs);

        if (appendTo) {
            tNotification.insertAfter(appendTo);
        } else {
            ender('#notify-div').prepend(tNotification);
        }
    }

    module.exports = init;
    module.exports.notify = notify;
}());

