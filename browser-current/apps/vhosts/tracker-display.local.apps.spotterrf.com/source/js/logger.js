(function () {
    "use strict";

    function Logger() {
        this.logs = {};
    }

    Logger.prototype.add = function (name, appendFn, clearFn) {
        this.logs[name] = {
            append: appendFn,
            clear: clearFn
        };
    };

    Logger.prototype.log = function (name, data) {
        if (!this.logs[name]) {
            return;
        }
        
        this.logs[name].append(data);
    };

    Logger.prototype.clear = function (name) {
        if (!this.logs[name]) {
            return;
        }

        this.logs[name].clear();
    };

    module.exports = new Logger();
}());
