module.exports = function (grunt) {
  "use strict";

  grunt.initConfig({
      "watch": {
          "all": {
              files: ["**.jade", "**.less", "lib/*.js"]
            , tasks: ["build"]
          }
        , "jade": {
              files: ["**.jade"]
            , tasks: ["jade:dev"]
          }
        , "less": {
              files: ["**.less"]
            , tasks: ["less:dev"]
          }
        , "js": {
              files: ["lib/*.js"]
            , tasks: ["pakmanager:browser"]
          }
      }
    , "less": {
          "dev": {
              files: { "public/style.css": "browser/style.less" }
          }
        , "dist": {
              files: { "public/style.min.css": "browser/style.less" }
            , options: { yuicompress: true }
          }
      }
    , "jade": {
          "dev": {
              files: { "public/index.html": "browser/index.jade" }
          }
        , "dist": {
              files: { "public/index.html": "browser/index.jade" }
          }
      }
    , "pakmanager": {
          "browser": {
              files: { "public/pakmanaged.js": "browser/lib/browser.js" }
          }
        , "node": {
              files: { "dist-app.js": "lib/server.js" }
          }
      }
    , "uglify": {
          "dist": {
              files: { "public/pakmanaged.min.js": "pakmanaged.js" }
          }
      }
  });

  //grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-jade');
  //grunt.loadNpmTasks('grunt-contrib-uglify');
  //grunt.loadNpmTasks('grunt-pakmanager');
  //grunt.loadTasks('grunt-tasks/');
  grunt.registerTask('default', ['jade:dev', 'less:dev'/*, 'pakmanager:browser'*/]);
  grunt.registerTask('build', ['jade:dev', 'less:dev'/*, 'pakmanager:browser'*/]);
  grunt.registerTask('build-dist', ['jade:dev', 'less:dev', 'pakmanager:browser'/*, 'uglify:dist'*/]);
};
