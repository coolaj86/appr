(function() {
  "use strict";

  var $ = require("ender")
    , request = require("ahr2")
    , forEachAsync = require("forEachAsync")
    , _ = require('underscore')
    , createSequence = require('sequence')
    , sequence = createSequence()
    , port = 7770
    , headerHeight = 99
    ;

  function populateLists() {
    $('#js-applists').hide();
    sequence
      .then(function(next) {
        request.get("http://localhost:" + port + "/installed").when( function(err, ahr, data) {
          data = checkResponse(err, data);
          if(!data) { console.error("bad data!"); return; }
          appendList('.js-currently-installed', data.data);
          next(data.data);
        });
      })
      .then(function(next, alreadyInstalled) {
        var availableApps
          ;
        request.get("http://localhost:" + port + "/applist").when( function(err, ahr, data) {
          data = checkResponse(err, data);
          if(!data) { console.error("bad data!"); return; }
          availableApps = _.difference(data, alreadyInstalled);
          appendList('.js-app-list', availableApps, ["js-available"]);
          next();
        });
      })
      .then(function(next) {
        $('#js-applists').show();
      });

  }

  function appendList(target, appList, extraClasses) {
    if(extraClasses) {
      extraClasses = extraClasses.join(' '); 
    } else { 
      extraClasses = ""
    }

    appList.forEach(function(appName, index) {
      var html = '<a class="gobutton" href="http://'+ location.hostname +':'+ location.port +'/#'+ appName +'">'
               + '   <li class="app ' + extraClasses + '" data-appname="' + appName + '">' + appName + '</li>'
               + '</a>'
        ;
      $(target).append(html);
    });
  }

  function checkResponse(err, data) {
    if(err) {
      console.error("Problem contacting local server: ", err);
      return false;
    }
    if(typeof data != "Object") {
      try {
      data = JSON.parse(data);
      } catch(e) {
        console.error("Bad data from server!");
        return false;
      }
    }
    /*if(!data.success) {
      console.error("Problem reported from server!");
      return false;
    }*/
    return data;
  }

  function installApp(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    var somewhere = $(this)
      , goButton = '<a class="gobutton" href="http://'+location.hostname+':'+location.port+'/#' 
                  + this.dataset.appname
                  + '"/>Go!</a>';
      ;
    somewhere.removeClass('js-available').addClass('installing').addClass('js-installing');
    request.post('http://localhost:' + port + '/install/'+ this.dataset.appname).when(function (err, ahr, data) {
      data = checkResponse(err, data);
      if(!data) { console.error("bad data!"); return; }
      console.log('installed!', data);
      somewhere.remove();
      appendList('.js-currently-installed', ['tracker-display'], ['freshly-installed']);
    });
  }

  function doNothing(ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }

  function assignHandlers() {
    $('body').delegate('.js-available', 'click', installApp);
    $('body').delegate('.js-installing', 'click', doNothing);
  }

  // Check that appr is installed.
  function isInstalled() {
    $('#not-installed').hide();
    request.get('http://localhost:' + port + '/alive', null, { timeout: 1000 }).when(function(err, ahr, data) {
      data = checkResponse(err, data);
      if(!data || !data.success) {
        $('#not-installed').show();
        return false;
      }
      showApps();
    });
  }
  
  function fillWithApp() {
    if(location.hash == "") {
      return false;
    }
    var appName = location.hash.substr(1, location.hash.length)
      , iframeHtml  = '<iframe id="appshown" src="http://localhost:'+port+'/'+appName+'/"'+'></iframe>'
      ;
    console.log('iframehtml:', iframeHtml);
                    
    $('#container').hide();
    $('#show-app').empty();
    $('#show-app').append(iframeHtml);
    setIframeHeight('#show-app');
    $('#show-app').show();
    $('#back_button').show();
  }

  function setIframeHeight(selector) {
    $(selector).css('height', window.innerHeight - headerHeight);
  }

  function showApps() {
    populateLists();
    assignHandlers();
    fillWithApp();
    $(window).resize(function() {
      if(location.hash == "") {
        return false;
      }
      setIframeHeight('#show-app');
    });
  }

  $.domReady(isInstalled);

}());
