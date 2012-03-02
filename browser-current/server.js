(function () {
  "use strict";
  
  var connect = require('connect')
    , fs = require('fs')
    , semver = require('semver')
    , request = require('ahr2')
    , tar = require('tar')
    , zlib = require('zlib')
    , server = "http://localhost:3999"
    , path = __dirname
    , port = 1337
    , curVer = "0.0.1"
    , newVer
    , args = process.argv
    ;

  console.log('Checking for updates...');
  request.get(server + "/version").when(function(err, ahr, data) {
    if(err || data.error == true) {
      console.log('Could not contact update server. Going it alone...');
      return;
    }
    console.log('version from server =', data.result);

    if(semver.gt(data.result, curVer)) {
      newVer = data.result;
      console.log('getting new version!');
      request.get(server + "/releases/" + newVer + "/browser.tgz").when(pullAndUpdate);
    }
  });

  if((parseFloat(args[2]) == parseInt(args[2])) && !isNaN(args[2])) {
    port = args[2];
  }

  if(typeof args[3] !== 'undefined' && fs.statSync(args[3]).isDirectory()) {
    if(args[3].substring(0,1) == '/'
    ||(process.platform === 'win32' && /[A-Z]:/.test(args[3].substring(0,2)))) {
      path = args[3];
    } else {
      path = __dirname + '/' + args[3];
    }
  }
  
  function pullAndUpdate(err, ahr, data) {
    console.log('gunzipping!');
    zlib.gunzip(data, saveTheTar);
    function saveTheTar(err, tarball) {
      console.log('about to write');
      fs.open(__dirname + '/downloads/' + newVer + '.tar', 'w', parseInt('0644', 8), function(err, fd) {
        if(err) {
          console.log("Error opening file:", err);
          return;
        } 
        console.log('file open!');
        console.log('fd', fd);
        console.log('tarball', tarball);
        console.log('tarball.length', tarball.length);
        fs.write(fd, tarball, 0, tarball.length, null, function(err, written, buffer) {
          if(err) {
            console.error(err);
            return;
          }
          console.log('File Written!!');
        });
      });

    }
    
  }
  
  connect.createServer(
      connect.static(path)
    , connect.directory(path)
  ).listen(port);

  console.log("Now serving on port " + port + ".");

}());
