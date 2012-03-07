(function () {
  "use strict";
  
  var connect = require('connect')
    , fs = require('fs')
    , path = require('path')
    , semver = require('semver')
    , request = require('ahr2')
    , tar = require('tar')
    , zlib = require('zlib')
    , server = "http://localhost:3999"
    , publicPath = __dirname
    , port = 1337
    , curVer = "0.0.1"
    , args = process.argv
    ;

  console.log('Checking for updates...');
  request.get(server + "/version").when(function(err, ahr, data) {
    if(err || data.error == true) {
      console.log('Could not contact update server. Going it alone...');
      return;
    }

    if(semver.gt(data.result, curVer)) {
      console.log("New version detected... downloading and installing!");
      //newVer = data.result;
      installer(null, null, data.result.version, true);
    }
  });

  if((parseFloat(args[2]) == parseInt(args[2])) && !isNaN(args[2])) {
    port = args[2];
  }

  if(typeof args[3] !== 'undefined' && fs.statSync(args[3]).isDirectory()) {
    if(args[3].substring(0,1) == '/'
    ||(process.platform === 'win32' && /[A-Z]:/.test(args[3].substring(0,2)))) {
      publicPath = args[3];
    } else {
      publicPath = __dirname + '/' + args[3];
    }
  }

  function installer(tarballLocation, packageName, newVer, selfUpdate) {
    if(!selfUpdate) {
      request.get(tarballLocation).when(pullAndSave);
    } else {
      request.get(server + "/releases/" + newVer + "/browser.tgz").when(pullAndSave);
    }

    function pullAndSave(err, ahr, data) {
      console.log('gunzipping!');
      zlib.gunzip(data, saveTheTar);
    }

    function saveTheTar(err, tarball) {
      console.log('about to write');
      fs.open(__dirname 
              + '/downloads/' 
              + packageName 
              + '-' 
              + newVer 
              + '.tar'
            , 'w'
            , parseInt('0644', 8)
            , function(err, fd) {
        if(err) {
          console.log("Error opening file:", err);
          return;
        } 
        fs.write(fd, tarball, 0, tarball.length, null, function(err, written, buffer) {
          if(err) {
            console.error(err);
            return;
          }
          console.log('File Written!!');
          untarAndInstall();
        });
      });
    }

    function untarAndInstall() {
      var packagePath
        ;
      if(!selfUpdate) {
        packagePath = __dirname + '/apps/' + packageName + '-' + newVer;
      } else {
        packagePath = __dirname;
      }
      if(!path.exists(packagePath)) {
        fs.mkdirSync(packagePath, parseInt('0755', 8));
      }

      fs.createReadStream(__dirname + '/downloads/' + packageName + '-' + newVer + '.tar')
        .pipe(tar.Extract({path: packagePath}))
        .on("error", function(er) {
          console.error("error during extraction:", er);
        })
        .on("end", function() {
          console.log(packageName + ' is installed!');
          if(selfUpdate) {
            process.exit();
          }
        })
    }
  }

  function getTarget() {
    return "http://norman.spotter360.org:5984";
  }

  function packageApp(app) {
    app.get("/applist", nabPackageList);
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
  
  connect.createServer(
      connect.router(packageApp)
    , connect.static(publicPath)
    , connect.directory(publicPath)
  ).listen(port);

  console.log("Now serving on port " + port + ".");

}());
