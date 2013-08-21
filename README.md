Web App Center
===

This is the central web app center server, which can be deployed on any domain.

It provides updates to the local web app center installation and allows
configuration of local settings.

Installation
===

    git clone https://github.com/coolaj86/appr.git
    pushd appr
    npm install
    npm install -g served grunt-cli jshint less jade
    grunt build
    served 3000 ./server

Usage
===

Visit <http://localhost:3000>, download webappcenter, and install some apps.

API
===

### GET /webappcenter/update?version=1.0.0&channel=beta

Returns a url to a newer installable version of Web App Center or an error
such as "you're already up-to-date" or "no versions available".

  * `version` required, should be the version you currently have installed
  * `channel` optional, assumes 'stable' unless 'beta' or 'alpha' are provided

Sample result:

  { "semver": "0.2.0-beta"
  , "mtime": "2013-04-25T05:09:48.000Z"
  , "href": "/releases/0.2.0-beta/data.tar.gz"
  }

Grand Plan
===

The idea is to have an app store similar to the android app store.

* Appr represents the app store client
* hurpdurp.com represents the default

Installation
---

MyApp.com as entrypoint

0. I visit myapp.com
1. myapp.com checks localhost:8899/oauth and fails
2. myapp.com asks me for a username and password for hurpdurp
2. myapp.com's client creates a ticket for ip.hurpdurp.com with hurdurp.com/installer
3. myapp.com asks me to install Appr from hurdupr.com/appr.{exe,pkg,deb}
4. myapp.com continually polls localhost:8899/init/:ticket

Appr setup via MyApp.com

0. Appr is installed
1. Appr has no config, so it listens on localhost:8899/init/:ticket
2. Appr receives the ticket
2. Appr checks hurpdurp.com/register/:ticket
3. hurpdurp.com/register/:ticket only responds when the Origin is localhost:8899
2. the response passes credentials (the user is pre-logged in on localhost and myapp.com is pre-authorized)

MyApp.com as app

0. I visit myapp.com again
1. myapp.com checks localhost:8899/oauth and has succeeds with pre-authorization, pre-scoped
2. I enjoy myapp.com

OtherApp.com as new app

0. I visit otherapp.com
1. otherapp.com checks localhost:8899/oauth and succeeds
2. A list is presented including hurpdurp, myapp.com, etc
2. I authorize otherapp.com for whichever scope
3. otherapp.com is added to the list of repos

Updates
---

0. Appr checks hurpdurp.com/node regularly for the latest node version and date
1. Appr checks each app at whateverapp.com/appr/:product/:node_version to get a list of compatible app versions
2. If all apps have compatible versions at or above their current version, the upgrade takes place

Management
---

0. Going to hurpdurp.com directly will show a list of authorized apps from localhost:8899, which accepts hurpdurp.com as a master (not just a repo)

Apps
---

Apps should have a 

  * version
  * install date
  * upgraded date
  * channel (stable, beta, developer (only selectable via api))
  * scope (exec, fs, http, net, etc)
  * origin (install source url)

Old Docs
===

Installation
---

The first thing you'll need to do in order to use the HurpDurp Apps Server is install it. 
Use one of our patented automagic install applications on your platform of choice. We
support Linux, Macintosh OS X, and Windows 7.

OS X
---

### Restarting the server, and you.
To restart the local server, you'll need to run these two commands, in order:

    sudo launchctl unload /Library/LaunchDaemons/com.hurpdurp.apps.plist
    sudo launchctl load /Library/LaunchDaemons/com.hurpdurp.apps.plist

### Deleting applications, and you.
To delete an application, you will need to manually remove the files that were
installed with that application. All applications that Appr installs, are
located under `/usr/local/lib/hurpdurp/mounts/`. You'll be able to find apps,
such as the Tracker Display installed there. To delete one of these apps,
simply run the following command:

    sudo rm -rf /usr/local/lib/hurpdurp/mounts/appName

Be sure to replace `appName` with the name of the app you want to delete.
Otherwise, you may run into problems down the line.

After the app is removed, you will need to restart the patented WebApps Center.
To perform this action, please refer to the information above.

Publishing applications, and you.
---

Boy skippy, it couldn't be more easy to publish applications to the Appr
store. Follow this easy 12 step
process to publish an app:

0. Login to your trusty sidekick server.
0. Create a `~/src` directory, if you haven't already.
0. Copy your application files to a directory named `~/src/app-name`.
0. Change directory into `~/src/app-name`
0. Run any applicable build scripts.
0. Create a package.json if you haven't already.
0. Add `publishConfig: { "registry": "http://your-npm-registry" }` to `package.json`
0. Add the line `registry = http://your-npm-registry` to your ~/.npmrc
0. Run `npm adduser --registry=http://user:pass@your-npm-registry` and follow the steps.
0. Make sure you're in the `~src/app-name` directory.
0. Run `npm publish ./`
