(function() {
  "use strict";

  var $ = require("ender")
    , request = require("ahr2")
    ;
  
  request.get("http://localhost:1337/applist").when( function(err, ahr, data) {
    if(err) {
      console.error("Problem contacting update server: ", err);
    }
    if(typeof data != "Object") {
      try {
      data = JSON.parse(data);
      } catch(e) {
        consolev.error("Bad data from server!");
        return;
      }
    }
    data.forEach(function(appName, index) {
      $('.js-app-list').append(appName);
    });
  });

}());
