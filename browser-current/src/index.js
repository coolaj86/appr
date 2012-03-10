(function() {
  "use strict";

  var $ = require("ender")
    , request = require("ahr2")
    , forEachAsync = require("forEachAsync")
    , createSequence = require('sequence')
    , sequence = createSequence()
    , _ = require('underscore')
    ;

  function populateLists() {
    $('#js-applists').hide();
    sequence
      .then(function(next) {
        request.get("http://localhost:1337/installed").when( function(err, ahr, data) {
          data = checkResponse(err, data);
          if(!data) { console.error("bad data!"); return; }
          appendList('.js-currently-installed', data.data);
          next(data.data);
        });
      })
      .then(function(next, alreadyInstalled) {
        var availableApps
          ;
        request.get("http://localhost:1337/applist").when( function(err, ahr, data) {
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
      var goButton = '<a class="gobutton" href="http://' + appName + '.local.apps.spotterrf.com:8080/">Go!</a>'
        , html = '<li class="' + extraClasses + '" data-appname="' + appName + '">' + appName + '</li>'
        ;
      $(target).append(html);
      if(/installed/g.test(target)) {
        $(target).append(goButton);
      }
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
    var somewhere = $(this)
      , goButton = '<a class="gobutton" href="http://' + this.dataset.appname + '.local.apps.spotterrf.com:8080"/>Go!</a>';
      ;
    somewhere.removeClass('js-available').addClass('installing');
    request.post('http://localhost:1337/install/'+ this.dataset.appname).when(function (err, ahr, data) {
      data = checkResponse(err, data);
      if(!data) { console.error("bad data!"); return; }
      console.log('installed!', data);
      somewhere.remove();
      somewhere.removeClass('installing').addClass('installed');
      $('.js-currently-installed').append(somewhere);
      $('.js-currently-installed').append(goButton);

    });
  }

  function assignHandlers() {
    $('body').delegate('.js-available', 'click', installApp);
  }

  $.domReady(function() {
    populateLists();
    assignHandlers();
  });

}());
