PUBLICTARGET="../web-client/"

cp -R static/ ${PUBLICTARGET}/
echo "Compiling JavaScript to CommonJS"
pakmanager build > /dev/null 2> /dev/null
echo "Compiling Jade to HTML"
jade *.jade > /dev/null
echo "Compiling LESS to CSS"
lessc *.less > style.css
echo -n "Moving packaged files..."
mv *.css ${PUBLICTARGET}/
mv *.html ${PUBLICTARGET}/
mv pakmanaged.js ${PUBLICTARGET}/appsnap.js
#cp -R ./public/ ./windows/
echo " done"
