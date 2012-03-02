(function () {
  "use strict";
  
  var connect = require('connect')
    , fs = require('fs')
    , semver = require('semver')
    , request = require('ahr2')
    , server = "http://localhost:55075"
    , path = __dirname
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
      console.log('Server has a new version. Should update now!');
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
  
  connect.createServer(
      connect.static(path)
    , connect.directory(path)
  ).listen(port);

  console.log("Now serving on port " + port + ".");

}());
