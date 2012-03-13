PUBLICTARGET="../web-client/"

pakmanager build
jade *.jade
lessc *.less > style.css
mv *.css ${PUBLICTARGET}/
mv *.html ${PUBLICTARGET}/
mv pakmanaged.js ${PUBLICTARGET}/appsnap.js
cp -R static/ ${PUBLICTARGET}/
#cp -R ./public/ ./windows/
