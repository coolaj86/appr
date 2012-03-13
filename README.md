browser
===

The client that runs in the browser.

To build for deployment:

    cd browser
    ./build.sh
    # creates ../web-client

This is packaged into the `web-client` directory and served up server as well as distributed with the client.

client
===

The webserver that runs on the client computer

To build for deployment:

    cd client
    ./mkrelease.sh
    # builds and copies web-client

server
===

The application hoster distributor
