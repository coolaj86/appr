/*jshint node:true, es5:true, browser:true, jquery:true,
onevar:true, indent:2, laxcomma:true, laxbreak:true,
eqeqeq:true, immed:true, undef:true, unused:true, latedef:true */
(function () {
  "use strict";

  var ua = navigator.userAgent
    , domReady = window.jQuery
    , pure = window.pure
    , renderApps
    , localServer = 'http://localhost:8899'
    , mainAppName = 'webappcenter-client'
    ;

  function highlightInstaller(platform) {
    domReady(function () {
      $('.js-installers .span3').removeClass('span3').addClass('span4');
      $('.js-installer-' + platform).appendTo('.js-my-installer');
    });
  }

  function unHighlightInstaller(platform) {
    domReady(function () {
      $('.js-installer-' + platform).prependTo('.js-installers');
      $('.js-installers .span4').removeClass('span4').addClass('span3');
    });
  }

  function suggestInstaller(cb) {
    // TODO OS + CPU (ubuntu runs on ARM)
    if (/Intel.*OS X/i.test(ua)) {
      console.log('On OS X');
      cb('osx');
    } else if (/Ubuntu/i.test(ua)) {
      console.log('On Ubuntu');
      cb('ubuntu');
    } else if (/Linux/.test(ua)) {
      console.log('On Other Linux');
      cb('generic');
    } else if (/Windows/.test(ua)) {
      console.log('On Windows');
      cb('win');
    } else {
      console.log('On Other');
      cb('generic');
    }
  }

  function initialize() {
    $.ajax(localServer + '/' + mainAppName + '/init',
      { "type": "POST"
      , "dataType": "application/json; utf-8"
      , "contentType": ""
      , "success": function (data) {
            if (!data.success) {
              window.alert("The installation failed. That's no bueno.");
              return;
            }
            testForAppCenter();
            console.log('WAC installed & initialized');
            $('.js-thanks').show();
          }
        , "error": function () {
            window.alert("The installation failed. That's no bueno.");
            //$('.js-error').show();
          }
      }
    );
  }

  function pollToInitialize() {
    $.ajax(localServer + '/' + mainAppName + '/init',
        { "success": function (data) {
            // May pre-initialize or no
            if (!data.initialized) {
              initialize();
              return;
            }
            testForAppCenter();
          }
        , "error": function () {
            console.log('WAC still not installed');
            setTimeout(pollToInitialize, 5000);
          }
        }
    );
  }

  function testForAppCenter() {
    $.ajax(localServer + '/' + mainAppName + '/apps',
      { "success": function (data) {
            console.log('WAC installed', data);
            domReady(function () {
              suggestInstaller(unHighlightInstaller);
              $('.js-suggested-installer').hide();
              pure('tbody').render(data, renderApps);
              //$('tbody').render([{ name: 'jimbo' }, { name: 'janebo' }], { '.js-app' : { 'app<-': { '.js-name': 'app.name' } } });
            });
          }
        , "error": function () {
            console.log('WAC not installed');
            suggestInstaller(highlightInstaller);
            pollToInitialize();
          }
      }
    );
  }

  domReady(function () {
    renderApps = pure('tbody').compile(
      { '.js-app' : { 'app<-':
          { '.js-logo@src': 'app.logo'
          , '.js-name': 'app.name'
          , '.js-version': 'app.version'
          , '.js-channel': 'app.channel'
          , '.js-installed': 'app.installed'
          , '.js-updated': 'app.updated'
          , '.js-scopes': 'app.scopes'
          , '.js-origin': 'app.origin'
          , '.js-license': 'app.license'
          }
      } }
    );
  });
  testForAppCenter();
}());
