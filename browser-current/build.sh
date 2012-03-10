cd src
pakmanager build
jade *.jade
lessc *.less > style.css
mv *.css ../public/
mv *.html ../public/
mv pakmanaged.js ../public/appsnap.js
rsync -aq static/ ../public/
cd -
