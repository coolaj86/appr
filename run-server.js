(function () {
  var server = require('./server.js')
    ;

  function reportStatus() {
    console.log('Server started on ' + server.address().address + ':' + server.address().port);
  }

  server.listen(reportStatus);
}());
