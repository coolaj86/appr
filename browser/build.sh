PUBLICTARGET="../web-client/"

cp -R static/ ${PUBLICTARGET}/
pakmanager build
jade *.jade
lessc *.less > style.css
mv *.css ${PUBLICTARGET}/
mv *.html ${PUBLICTARGET}/
mv pakmanaged.js ${PUBLICTARGET}/appsnap.js
#cp -R ./public/ ./windows/
