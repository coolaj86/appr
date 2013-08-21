(function () {
  "use strict";

  var ua = navigator.userAgent
    , domReady = window.jQuery
    , pure = window.pure
    , renderApps
    , webappcenter = 
      { "host": "localhost:8899"
      , "pathname": "webappinstaller"
      , "protocol": "http"
      }
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
    $.ajax( webappcenter.protocol + '://' 
        + webappcenter.host
        + '/' + webappcenter.pathname
        + '/init',
      { "type": "POST"
      , "dataType": "json"
      , "contentType": "application/json; utf-8"
      , "data": JSON.stringify(
                  { "master":
                    { hostname: "webappinstaller.com"
                    , port: 3000
                    , channel: "alpha"
                    }
                  , "preauthorize":
                    [ { "name": "mediabox"
                      , "cname": "com.getmediabox.mediabox"
                      , "origin": "getmediabox.com"
                      , "channel": "beta"
                      , "updatesUrl": "http://getmediabox.com/webappcenter/update"
                      , "downloadUrl": "http://getmediabox.com/download/latest/mb.tgz"
                      , "scopes": ["system/fs", "system/net", "webappcenter/update"]
                      , "license": "APACHEv2"
                      }
                    ]
                })
      , "success": function (data) {
          if (data.errors && data.errors.length) {
            console.error(data);
            window.alert("The installation failed. That's no bueno.");
            return;
          }
          setTimeout(function () {
            testForAppCenter();
          }, 5 * 1000);
          console.log('WAC installed & initialized');
          $('.js-thanks').show();
        }
      , "error": function () {
          console.error(arguments);
          window.alert("The installation failed via HTTP error. That's no bueno.");
          //$('.js-error').show();
        }
      }
    );
  }

  function pollToInitialize() {
    $.ajax(webappcenter.protocol + '://'
        + webappcenter.host
        + '/' + webappcenter.pathname
        + '/init',
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
    $.ajax(webappcenter.protocol + '://'
        + webappcenter.host
        + '/' + webappcenter.pathname
        + '/apps',
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
