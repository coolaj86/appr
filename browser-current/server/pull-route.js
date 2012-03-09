(function() {
  "use strict";

  var fs = require('fs')
    , forEachAsync = require('forEachAsync')
    , request = require('ahr2')
    ;

  function getTarget() {
    return "http://norman.spotter360.org:5984";
  }

  function packageApp(app) {
    app.get("/applist", nabPackageList);
    app.get("/installed", nabLocalList);
    app.post("/install/:packageName", findTarball);

    function nabPackageList(req,res) {
      request.get(getTarget()).when(function(err, ahr, data) {
        if(err) {
          console.error("Problem contacting update server: ", err);
          res.end(JSON.stringify({error: true, message: "Unable to contact update server."}));
        }
        res.end(JSON.stringify(data));
      });
    }

    function nabLocalList(req,res) {
      var installed = []
        ;
      fs.readdir(__dirname + '/../apps/vhosts/', function(err, files) {
        if(err) {
          console.error("Problem reading vhost directory:", err);
          res.end(JSON.stringify({success: false, message: err}));
          return;
        }

        forEachAsync(files,function(next, fileName, index) {
          installed.push(fileName.replace(/\.local\.apps\.spotter.*/g, ""));
          next();
        }).then(function() {
          res.end(JSON.stringify({success: true, data: installed}));
        });
      });

      
      console.log('dirname:', __dirname);
    }

    function findTarball(req,res) {
      request(getTarget() + '/' + req.params.packageName + '/latest').when(function(err, arh, data) {
        if(err) {
          console.error("Problem contacting update server.");
          return;
        }
        if(typeof data !== "object") {
          try {
          data = JSON.parse(data);
          } catch(e) {
            console.error("Bad data from server!");
            return;
          }
        }
        installer(data.dist.tarball, req.params.packageName, data.version);
        res.end(JSON.stringify({success: true, message: "Installing now."}));
      });
    }
    module.exports = app;
  } 

  module.exports = packageApp;


}());
