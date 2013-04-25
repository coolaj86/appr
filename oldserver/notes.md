Installing NPM
===

Prereqs
---
1. Installing couchdb / erlang from apt-get will not work.
  * Do it from source.
    * Latest stable version of apache couch.
    * latest stable verison of erlang. (E15 something was the latest at time of writing)
  * Make sure you delete your old couchdb user if applicable and make a new one, then run these:


    sudo chown -R couchdb: /usr/local/var/{lib,log,run}/couchdb /usr/local/etc/couchdb
    sudo chmod 0770 /usr/local/var/{lib,log,run}/couchdb /usr/local/etc/couchdb

Installing Couchdb
---
1. Couchdb tweaks that need to be made:
  * **These should be done in `/usr/local/etc/couchdb/local.ini`**
  * in the `[httpd]` section: 
    * `secure_redirects = false`
    * `bind_address = 0.0.0.0`
  * in the vhosts section: 
    * `domain:port = /registry/_design/app/_rewrite`
    * `otherdomain:port = /registry/_design/app/_rewrite`
  * Restart CouchDB now: `sudo /etc/init.d/couchdb restart`


Installing NPM
---
2. Follow isaacs' instructions for installing NPM. A nice watered down version of those is:
  0. create a new database: `curl -X PUT http://localhost:5984/registry`
  0. clone the repo: `git clone https://github.com/isaacs/npmjs.org.git`
  0. do these:

    [sudo] npm install couchapp -g
    npm install couchapp
    npm install semver

  0. Sync the registry and search with these:

    couchapp push registry/app.js http://localhost:5984/registry
    couchapp push www/app.js http://localhost:5984/registry

Celebrate
---
Give it a shot by running: `npm --registry http://localhost:5984/registry/_design/app/_rewrite install <package>`
