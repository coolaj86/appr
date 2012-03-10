(function () {
    "use strict";

    var eventHub = require('eventhub'),
        EventEmitter = require('events').EventEmitter,
        localStorage = window.localStorage || {},
        uiSettings = require('./uiSettings');

    function degToRadText(deg) {
        if (deg % 10 === 0) {
            return 'π / ' + (18 / (deg / 10));
        } else if (deg % 15 === 0) {
            return 'π / ' + (12 / (deg / 15));
        }
        console.error('Invalid degree:', deg);
        return deg * Math.PI / 180;
    }

    function degToMilText(deg) {
        // round the number to the nearest 100
        return Math.round(deg * 6400 / 360 / 100) * 100;
    }

    function Grid(gridScale, radialStepStart) {
        var self = this;

        this.scale = gridScale;
        this.radialStepStart = radialStepStart;

        eventHub.on('grid', 'uiChange', function (ui) {
            self.settings = uiSettings.grid;
        });
    }

    Grid.prototype = {
        // properties

        get tempSettings() {
            return this._tempSettings;
        },
        set tempSettings (val) {
            this._tempSettings = uiSettings.grid;
            Object.keys(val).forEach(function (key) {
                this._tempSettings[key] = val[key];
            }, this);
        },
        get scale() {
            return this.gridScale || localStorage['gridScale'] || 100;
        },
        set scale(val) {
            if (typeof val !== 'undefined') {
                localStorage['gridScale'] = val;
                this.gridScale = val;
            }
        },
        get radialStepType() {
            return this._radialStepType || localStorage['radialStepType'] || 'degrees';
        },
        set radialStepType(val) {
            if (typeof val !== 'undefined') {
                localStorage['radialStepType'] = val;
                this._radialStepType = val;
            }
        },
        get radialStep() {
            return this._radialStep || localStorage['radialStep'] || 10;
        },
        set radialStep(val) {
            if (typeof val !== 'undefined') {
                localStorage['radialStep'] = val;
                this._radialStep = val;
            }
        },
        get radialStepStart() {
            return (typeof this._radialStepStart !== 'undefined') ? this._radialStepStart : localStorage['radialStepStart'] || 0;
        },
        set radialStepStart(val) {
            if (typeof val !== 'undefined') {
                localStorage['radialStepStart'] = val;
                this._radialStepStart = val;
            }
        },
        fieldOfView: {
            get depth() {
                return this._depth || 0;
            },
            set depth(val) {
                this._depth = val;
            },
            get breadth() {
                return this._breadth || 0;
            },
            set breadth(val) {
                this._breadth = val;
            },
            get offset() {
                return this._offset || 0;
            },
            set offset(val) {
                this._offset = val;
            },
            get yRadius() {
                return (this.depth - this.offset) / 2;
            },
            get adjustedCenter() {
                return this.yRadius + this.offset;
            },
            update: function (bounds, ratio) {
                this.point = {
                    x: bounds.width / 2,
                    y: bounds.height - Math.round(this.adjustedCenter * ratio)
                };
            }
        },

        // functions

        changeScale: function (gridScale, ratio) {
            this.scale = gridScale;

            this.increment = this.scale * ratio;
        },
        changeRadialStep: function (radialStepType, radialStep, radialStepStart) {
            if (radialStepType) {
                this.radialStepType = radialStepType;
                localStorage['radialStepType'] = radialStepType;
            }

            if (radialStep) {
                this.radialStep = radialStep;
                localStorage['radialStep'] = radialStep;
            }

            if (radialStepStart) {
                this.radialStepStart = radialStepStart;
                localStorage['radialStepStart'] = radialStepStart;
            }
        },
        drawFieldOfView: function (g, ratio) {
            var xDis, yDis;

            xDis = this.fieldOfView.breadth / 2 * ratio;
            yDis = this.fieldOfView.yRadius * ratio;

            g.beginPath();

            g.ellipse(this.fieldOfView.point.x, this.fieldOfView.point.y, xDis, yDis);

            if (uiSettings.fieldOfView.fill) {
                g.fillStyle = uiSettings.fieldOfView.fill;
                g.fill();
            }

            g.strokeStyle = uiSettings.fieldOfView.stroke;
            g.lineWidth = uiSettings.grid.lineWidth + 1;
            g.stroke();

            g.closePath();
        },
        /*
         * @param g- Drawing context
         * @param increment- pixels between each arc
         * @param ratio- magic number to turn meters to pixels
         * @param radialStepType- units of the radialStep (degrees, radians, mils; default 'degrees')
         * @param radialStep- degrees between each line (will be converted to radialStepType; default 15)
         * @param radialStepStart- degrees to start at (default 0)
         */
        drawRadial: function (g, increment) {
            var width, height, i, centerX, max, tRad, tmp, l, x, y, radialStep, text, yOffset, radialStepType, radialStepStart
              , angle
              , conversion = require('./conversion')
              ;

            radialStepType = this.radialStepType || 'degrees';
            radialStep = this.radialStep || 10;
            radialStepStart = this.radialStepStart || 0;

            width = this.endX - this.startX;
            height = this.endY - this.startY;

            max = Math.max(width, height) / increment / 2;
            centerX = this.startX + width / 2;

            g.shadowColor = 'rgba(203, 75, 22, .5)';
            g.shadowOffsetX = 1;

            l = max * 2;
            for (i = 1; i < l; i += 1) {
                g.beginPath();
                g.lineWidth = uiSettings.grid.lineWidth;
                g.strokeStyle = uiSettings.grid.stroke;
                g.arc(centerX, this.endY, increment * i, 0, Math.PI, true);
                g.stroke();
                g.closePath();
            }

            // draw 0°
            g.beginPath();
            g.lineWidth = uiSettings.grid.lineWidth;
            g.strokeStyle = uiSettings.grid.stroke;
            g.moveTo(this.centerX, this.endY);
            g.lineTo(this.centerX, this.startY);
            g.stroke();
            g.closePath();

            g.beginPath();
            g.font = uiSettings.grid.font;
            g.shadowColor = '';
            g.shadowOffsetX = 0;
            g.shadowBlur = 0;
            // weird, but this affects how thick the text is drawn
            g.lineWidth = 1;
            g.textBaseline = 'top';
            g.textAlign = 'center';
            g.strokeStyle = uiSettings.grid.textColor;
            g.fillStyle = uiSettings.grid.textColor;
            // make sure to get rid of any garbage
            text = parseInt(radialStepStart, 10);
            if (radialStepType === 'radians') {
                text = degToRadText(text);
            } else if (radialStepType === 'mils') {
                text = degToMilText(text);
            } else if (radialStepType === 'degrees') {
                text = text + '°';
            }
            //g.strokeText(text, this.centerX, this.startY + 10);
            g.fillText(text, this.centerX, this.startY + 10);
            g.closePath();

            // convert to radians for math functions
            tRad = radialStep * Math.PI / 180;
            l = Math.PI / 2 / tRad;
            for (i = 1; i < l; i += 1) {
                tmp = Math.tan(tRad * i);

                x = tmp * height + this.centerX;
                y = 0;
                // we've gone out of the canvas
                if (x > this.endX + this.startX) {
                    x = this.endX + this.startX;
                    y = height - (x - this.centerX) / tmp;
                }

                yOffset = (y <= this.startY) ? 10 : 0;

                // draw positive
                g.beginPath();
                g.lineWidth = uiSettings.grid.lineWidth;
                g.strokeStyle = uiSettings.grid.stroke;
                g.shadowColor = 'rgba(203, 75, 22, .5)';
                g.shadowOffsetX = 1;
                g.moveTo(this.centerX, this.endY);
                g.lineTo(x, y);
                g.stroke();
                g.closePath();

                // make sure to get rid of any garbage
                angle = Number(parseInt(radialStepStart, 10) + radialStep * i);
                text = conversion.resolveAngle(angle);
                if (radialStepType === 'radians') {
                    text = degToRadText(text);
                } else if (radialStepType === 'mils') {
                    text = degToMilText(text);
                } else if (radialStepType === 'degrees') {
                    text = text + '°';
                }

                g.beginPath();
                g.strokeStyle = uiSettings.grid.textColor;
                g.fillStyle = uiSettings.grid.textColor;
                g.font = uiSettings.grid.font;
                g.shadowColor = '';
                g.shadowOffsetX = 0;
                g.shadowBlur = 0;
                g.lineWidth = 1;
                g.textBaseline = 'top';
                g.textAlign = 'right';
                //g.strokeText(text + ' ', x, y + yOffset);
                g.fillText(text + ' ', x, y + yOffset);
                g.closePath();

                if (y <= this.startY) {
                    x = (this.endX + this.startX) - x;
                } else {
                    x = 0;
                }

                // draw negative
                g.beginPath();
                g.lineWidth = uiSettings.grid.lineWidth;
                g.strokeStyle = uiSettings.grid.stroke;
                g.shadowColor = 'rgba(203, 75, 22, .5)';
                g.shadowOffsetX = 1;
                g.moveTo(this.centerX, this.endY);
                g.lineTo(x, y);
                g.stroke();
                g.closePath();

                // make sure to get rid of any garbage
                angle = Number(parseInt(radialStepStart, 10) - radialStep * i);
                text = conversion.resolveAngle(angle);
                // and keep things positive if we're in boresight mode
                if (uiSettings.trackerDisplay.angleRelativeTo === 'boresight') {
                    text = Math.abs(text);
                }

                if (radialStepType === 'radians') {
                    text = degToRadText(text);
                } else if (radialStepType === 'mils') {
                    text = degToMilText(text);
                } else if (radialStepType === 'degrees') {
                    text = text + '°';
                }

                g.beginPath();
                g.strokeStyle = uiSettings.grid.textColor;
                g.font = uiSettings.grid.font;
                g.shadowColor = '';
                g.shadowOffsetX = 0;
                g.shadowBlur = 0;
                g.lineWidth = 1;
                g.textBaseline = 'top';
                g.textAlign = 'left';
                //g.strokeText(' ' + text, x, y + yOffset);
                g.fillText(' ' + text, x, y + yOffset);
                g.closePath();
            }

            g.shadowColor = '';
            g.shadowOffsetX = 0;
            g.shadowBlur = 0;
        },
        draw: function (g, ratio, drawFieldOfView, enableScale) {
            var increment, self = this;

            if (typeof this.scale !== 'undefined') {
                increment = this.scale * ratio;
            } else {
                increment = this.increment;
            }

            this.drawRadial(g, increment);

            if (drawFieldOfView) {
                this.drawFieldOfView(g, ratio);
            }

            this.drawScale(g, this.scale, ratio, enableScale);

            // fonts aren't necessarily loaded yet
            ender(window).bind('load', function () {
                self.draw(g, ratio, drawFieldOfView, enableScale);
            });
        },
        drawScale: function (g, gridScale, ratio, drawBoresightScale) {
            var width, height, textMetrics, textOffset, yStep, increment,
                posStep, negStep, i, offset, textSpacing;

            gridScale = gridScale || this.scale;
            increment = gridScale ? gridScale * ratio : this.increment;

            width = this.endX - this.startX;
            height = this.endY - this.startY;

            g.lineWidth = 1;
            g.font = uiSettings.grid.font;
            g.fillStyle = uiSettings.grid.textColor;
            g.strokeStyle = uiSettings.grid.textColor;

            textSpacing = uiSettings.grid.textSpacing;
            offset = width / 2;

            if (drawBoresightScale) {
                // along the boresight
                for (i = Math.round(height / increment) - 1; i >= 0; i -= 1) {
                    yStep = this.startY + Math.round(increment * i);
                    textMetrics = g.measureText(gridScale * i);
                    textOffset = textMetrics.width + textSpacing;

                    g.textBaseline = 'top';
                    g.shadowColor = '';
                    g.shadowOffsetX = 0;
                    g.shadowBlur = 0;
                    if (i === 0) {
                        continue;
                    }
                    g.textAlign = 'center';
                    //g.strokeText(gridScale * i, this.startX + offset, height - yStep, textOffset);
                    g.fillText(gridScale * i, this.startX + offset, height - yStep, textOffset);
                    //g.strokeText(gridScale * i, this.startX + offset, height - yStep, textOffset);
                    g.fillText(gridScale * i, this.startX + offset, height - yStep, textOffset);
                }
            }

            width += this.startX * 2;

            // on the bottom of the display
            for (i = 0; i <= width / increment / 2; i += 1) {
                posStep = this.centerX + Math.round(increment * i);
                negStep = this.centerX - Math.round(increment * i);

                g.textAlign = 'center';
                g.textBaseline = 'bottom';
                g.shadowColor = '';
                g.shadowOffsetX = 0;
                g.shadowBlur = 0;

                //g.strokeText(gridScale * i, posStep, height);
                g.fillText(gridScale * i, posStep, height);
                //g.strokeText(gridScale * i, negStep, height);
                g.fillText(gridScale * i, negStep, height);
            }

            g.shadowColor = '';
            g.shadowOffsetX = 0;
            g.shadowBlur = 0;
        },
        update: function (bounds, ratio) {
            this.startX = bounds.xOffset;
            this.startY = 0;
            this.endX = bounds.width;
            this.endY = bounds.height;

            this.centerX = Math.round((this.endX - this.startX) / 2) + bounds.xOffset;

            this.increment = this.scale * ratio;
        }

    };

    eventHub.register('grid', new EventEmitter());

    module.exports = Grid;
}());
