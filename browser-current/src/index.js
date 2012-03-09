(function() {
  "use strict";

  var $ = require("ender")
    , request = require("ahr2")
    ;
  
  request.get("http://localhost:1337/applist").when( function(err, ahr, data) {
    if(err) {
      console.error("Problem contacting local server: ", err);
    }
    if(typeof data != "Object") {
      try {
      data = JSON.parse(data);
      } catch(e) {
        console.error("Bad data from server!");
        return;
      }
    }
    data.forEach(function(appName, index) {
      $('.js-app-list').append(appName);
    });
  });

  request.get("http://localhost:1337/installed").when( function(err, ahr, data) {
    if(err) {
      console.error("Problem contacting local server: ", err);
    }
    if(typeof data != "Object") {
      try {
      data = JSON.parse(data);
      } catch(e) {
        console.error("Bad data from server!");
        return;
      }
    }
    if(!data.success) {
      console.error("Problem reported from server!");
      return;
    }
    data = data.data;

    data.forEach(function(appName, index) {
      $('.js-currently-installed').append(appName);
    });
  });

}());
