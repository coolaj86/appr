cd src
pakmanager build
jade *.jade
lessc *.less
mv *.css ../public/
mv *.html ../public/
mv pakmanaged.js ../public/appsnap.js
cd -
