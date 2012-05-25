#!/usr/bin/env bash

#npm install -g jade less pakmanager

pushd server
  npm install
popd

#pushd local
#  npm install
#popd

pushd browser
  ./build.sh
popd

#pushd clients
#popd
