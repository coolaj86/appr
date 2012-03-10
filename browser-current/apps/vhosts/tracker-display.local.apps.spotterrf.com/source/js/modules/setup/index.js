(function () {
    'use strict';

    var eventHub = require('eventhub'),
        ender = require('ender'),
        uiSettings = require('./uiSettings'),
        updateBearingTimeout,
        updateAngleCalibrationTimeout,
        phaseCalibrationOffset,
        bearingStep = 1,
        phaseCalibrationStep = 1;

    function bindSettingsEvents(tTrackerDisplay) {
        // settings button and events
        ender('#setup-button').bind('click', function () {

            ender('#scale').val(String(tTrackerDisplay.grid.scale));
            ender('#radial-unit').val(tTrackerDisplay.grid.radialStepType);

            ender('#spotter-addr').val(tTrackerDisplay.spotterAddress);
            ender('#spotter-model').val(tTrackerDisplay.spotterModel);

            ender('.radial-step').hide();
            ender('#radial-step-' + tTrackerDisplay.grid.radialStepType).show().val(String(tTrackerDisplay.grid.radialStep || 15));

            ender('#settings-div').css({'display': 'block'});

            ender('input[name=displayTrackInfo][value=' + uiSettings.trackerDisplay.displayTrackInfo + ']').attr('checked', 'true');
            ender('#angle-relative-' + tTrackerDisplay.settings.angleRelativeTo + '').attr('checked', 'true');

            ender('#style-grid-width').val(String(uiSettings.grid.lineWidth || 1));
            ender('#style-grid-font-size').val(String(uiSettings.grid.fontSize || '12pt'));

/*
            if (uiSettings.grid.fontWeight === 'bold') {
                ender('#style-grid-font-bold').attr('checked', true);
            } else if (uiSettings.grid.fontWeight === 'bolder') {
                ender('#style-grid-font-bolder').attr('checked', true);
            } else {
                ender('#style-grid-font-normal').attr('checked', true);
            }
*/
  
            ender('#boresight').html(String(tTrackerDisplay.originAzimuth));

            eventHub.emit('modalLoad');
        });

        ender('.adj-boresight').bind('click', function () {
          var elem = $(this)
            , azimuth
            , conversion = require('../../conversion');
            ;

          if (updateAngleCalibrationTimeout) {
            clearTimeout(updateAngleCalibrationTimeout);
            updateAngleCalibrationTimeout = null;
          }

          if (elem.data('direction') === 'right') {
            tTrackerDisplay.originAzimuth += bearingStep;
          } else {
            tTrackerDisplay.originAzimuth -= bearingStep;
          }

          try {
            azimuth = Number(tTrackerDisplay.originAzimuth); 
            tTrackerDisplay.originAzimuth = conversion.resolveAngle(azimuth);
          } catch (e) {
            console.error(e.toString());
          }

          tTrackerDisplay.grid.radialStepStart = tTrackerDisplay.originAzimuth;

          $('#boresight').html(String(tTrackerDisplay.originAzimuth));

          // wait a couple seconds before actually saving anything
          updateBearingTimeout = setTimeout(function () {
            $.ajax({
              url: tTrackerDisplay.spotterAddress + '/geolocation.json/settings',
              method: 'post',
              crossOrigin: true,
              type: 'json',
              data: {bearing: tTrackerDisplay.originAzimuth},
              success: function (data) {
                if (!data) {
                  console.error('No data returned from request to set geolocation settings');
                  return;
                }

                if (data.error) {
                  console.error('Error setting geolocation settings:', data.errors);
                  return;
                }

                if (data.success) {
                  console.info('Geolocation settings successfully saved:', data.result);
                  return;
                }
              },
              error: function () {
                console.error('Error POSTing to geolocation.json');
              }
            });
          }, 1000 * 3);

          eventHub.emit('redraw', 'grid');
        });

        ender('.adj-angle-calibration').bind('click', function () {
          var elem = $(this);

          if (updateAngleCalibrationTimeout) {
              clearTimeout(updateAngleCalibrationTimeout);
              updateAngleCalibrationTimeout = null;
          }

          // the direction we want the tracks to go
          if (elem.data('direction') === 'right') {
              phaseCalibrationOffset -= phaseCalibrationStep;
          } else {
              phaseCalibrationOffset += phaseCalibrationStep;
          }

          $('#angle-calibration').html(String(-phaseCalibrationOffset));

          // wait a bit before actually saving anything
          updateAngleCalibrationTimeout = setTimeout(function () {
            $.ajax({
              url: tTrackerDisplay.spotterAddress + '/sensor.json/settings',
              method: 'post',
              crossOrigin: true,
              type: 'json',
              data: {phaseCalibrationOffset: phaseCalibrationOffset},
              success: function (data) {
                if (!data) {
                  console.error('No data returned from request to set geolocation settings');
                  return;
                }

                if (data.error) {
                  console.error('Error setting geolocation settings:', data.errors);
                  return;
                }

                if (data.success) {
                  console.info('Geolocation settings successfully saved:', data.result);
                  return;
                }
              },
              error: function () {
                console.error('Error POSTing to geolocation.json');
              }
            });
          }, 1000 * 1);
        });
        ender('#settings-cancel').bind('click', function () {
            ender('#settings-div').css('display', 'none');
            tTrackerDisplay.tempSettings = null;
            tTrackerDisplay.draw();
         
            eventHub.emit('modalClose');
        });

        ender('#style-grid-font-size').bind('change', function (e) {
            var tSettings = uiSettings.grid;
            tSettings.fontSize = ender(e.target).val();
            uiSettings.grid = tSettings;

            eventHub.emit('redraw', 'grid');
            eventHub.emit('fontChanged', uiSettings.grid.font);
        });

        ender('#style-grid-fontweight').bind('change', function (e) {
            var tSettings = uiSettings.grid;
            tSettings.fontWeight = ender('input[name=' + ender(e.target).attr('name') + ']:checked').val();
            uiSettings.grid = tSettings;

            eventHub.emit('redraw', 'grid');
            eventHub.emit('fontChanged', uiSettings.grid.font);
        });

        ender('#style-grid-width').bind('change', function (e) {
            var tSettings = uiSettings.grid;
            tSettings.lineWidth = +ender(e.target).val();
            uiSettings.grid = tSettings;

            eventHub.emit('redraw', 'grid');
        });

        ender('#settings-defaults').bind('click', function () {
            if (confirm('Are you sure you want to reset all settings to factory defaults?')) {
                localStorage.clear();
                window.location.reload();
            }
        });

        ender('input[name=displayTrackInfo]').bind('change', function () {
            var tSettings = tTrackerDisplay.settings;
            tSettings.displayTrackInfo = ender(this).val();
            tTrackerDisplay.settings = tSettings;
            tTrackerDisplay.draw();
        });
        ender('input[name=angle-relative]').bind('change', function () {
            var val = ender(this).val(),
                tSettings = tTrackerDisplay.settings;

            if (val === 'north') {
                tTrackerDisplay.grid.radialStepStart = tTrackerDisplay.originAzimuth;
            } else {
                tTrackerDisplay.grid.radialStepStart = 0;
            }
            tSettings.angleRelativeTo = val;
            tTrackerDisplay.settings = tSettings;

            tTrackerDisplay.drawGrid();
        });
        ender('#spotter-model').bind('change', function () {
            tTrackerDisplay.spotterModel = ender('#spotter-model').val();
            tTrackerDisplay.draw();
        });
        ender('#speedUnits').bind('change', function () {
            var tSettings = tTrackerDisplay.settings;
            tSettings.speedUnits = ender('#speedUnits').val();
            tTrackerDisplay.settings = tSettings;

            tTrackerDisplay.draw();
        });
        ender('#scale').bind('change', function () {
            tTrackerDisplay.grid.scale = ender('#scale').val();
            tTrackerDisplay.drawGrid();
        });
        ender('#radial-unit').bind('change', function () {
            var val = ender(this).val(), elem, curStep,
                matchFound, closest;

            ender('.radial-step').hide();
            tTrackerDisplay.grid.radialStepType = val;

            elem = ender('#radial-step-' + val).show();
            curStep = +tTrackerDisplay.grid.radialStep;

            // approximate the closest value for the new angle type
            elem.children('option').each(function () {
                var val = +ender(this).val();

                if (curStep === val) {
                    closest = val;
                    matchFound = true;
                } else if (!matchFound) {
                    if (Math.abs(val - curStep) < Math.abs(closest - curStep) || !closest) {
                        closest = val;
                    }
                }
            });

            elem.val(String(closest));

            tTrackerDisplay.grid.radialStep = elem.val();
            tTrackerDisplay.drawGrid();
        });
        ender('.radial-step').bind('change', function () {
            tTrackerDisplay.grid.radialStep = +ender(this).val();
            tTrackerDisplay.grid.radialStepStart = tTrackerDisplay.settings.angleRelativeTo === 'north' ? tTrackerDisplay.originAzimuth : 0;
            tTrackerDisplay.drawGrid();
        });
        ender('#spotter-addr').bind('keypress', function (e) {
            if (e.keyCode === 13) {
                ender(this).trigger('blur');
            }
        });
        ender('#spotter-addr').bind('blur', function () {
            var newAddr = ender('#spotter-addr').val(),
                regex = /^(http:\/\/)?(.*)\\?$/,
                tmp;
            
            tmp = newAddr.match(regex)[2];
            if (tmp !== tTrackerDisplay.spotterAddress.match(regex)[2]) {
                tmp = confirm('The spotter address will be changed from\n\n"' + tTrackerDisplay.spotterAddress + '"\n\nto\n\n"' + newAddr + '"\n\nAre you sure you want to do this?');
                if (!tmp) {
                    return;
                }
            
                tTrackerDisplay.spotterAddress = newAddr;
            }
        });

        ender.ajax({
            url: tTrackerDisplay.spotterAddress + '/sensor.json/settings',
            method: 'get',
            crossOrigin: true,
            type: 'json',
            success: function (data) {
                if (data && data.result && data.result) {
                    phaseCalibrationOffset = data.result.phaseCalibrationOffset || 0;
                    $('#angle-calibration').html(String(-phaseCalibrationOffset));
                }
            },
            error: function () {
                console.warn('Couldn\'t get angular calibration data');
            }
        });
    }


    module.exports.init = function (options) {
        bindSettingsEvents(options.trackerDisplay);
    };
}());
