WebApps Center, and You
===

    GET /webappcenter/update?version=1.0.0&channel=beta
    ; get a version and url to which you can safetly upgrade
    ; provide the version of software you're running
    ; provide a channel such as 'beta' or 'alpha' (default is 'stable')
    ; returns a `result` with a semver string or null

Installation
---

The first thing you'll need to do in order to use the WebApps Center is install it. 
Use one of our patented automagic install applications on your platform of choice. We
support Linux, Macintosh OS X, and Windows 7.

OS X
---

### Restarting the server, and you.
To restart the local server, you'll need to run these two commands, in order:

    sudo launchctl unload /Library/LaunchDaemons/com.spotterrf.apps.plist
    sudo launchctl load /Library/LaunchDaemons/com.spotterrf.apps.plist

### Deleting applications, and you.
To delete an application, you will need to manually remove the files that were
installed with that application. All applications that Appr installs, are
located under `/usr/local/lib/spotterrf/mounts/`. You'll be able to find apps,
such as the Tracker Display installed there. To delete one of these apps,
simply run the following command:

    sudo rm -rf /usr/local/lib/spotterrf/mounts/appName

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
