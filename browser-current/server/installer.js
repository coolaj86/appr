(function() {
  "use strict";
  
  var fs = require('fs')
    , path = require('path')
    , tar = require('tar')
    , zlib = require('zlib')
    , semver = require('semver')
    , exec = require('child_process').exec
    ;


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
        packagePath = __dirname + '/apps/vhosts/' + packageName + '.local.apps.spotter360.org/';
      } else {
        packagePath = __dirname;
      }
      if(!path.exists(packagePath)) {
        console.log('PACKAGEPATH', packagePath);
        fs.mkdirSync(packagePath, parseInt('0755', 8));
      }

      fs.createReadStream(__dirname + '/downloads/' + packageName + '-' + newVer + '.tar')
        .pipe(tar.Extract({path: packagePath}))
        .on("error", function(er) {
          console.error("error during extraction:", er);
        })
        .on("end", function() {
          console.log(packageName + ' is installed!\nNow installing its dependencies.');
          installDeps(packageName);
          if(selfUpdate) {
            process.exit();
          }
        })
    }

    function installDeps(packageName) {
      var child = exec("cd "  + __dirname
                              + "/apps/vhosts/"
                              + packageName
                              + ".local.apps.spotter360.org && npm install"
                    , function(error, stdout, stderr) {
        if(error) {
          console.error("Problem installing dependencies: ", error);
          return;
        }
        console.log(stdout);
        console.log(stderr);
      });
     
   
    }
  }

  module.exports = installer;

}());
