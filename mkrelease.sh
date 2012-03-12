#!/bin/bash
TAR="/usr/bin/tar"

usage() {
  echo -e "Usage: ${0} <semver>\n\ne.g.: ${0} v0.1.0\n The above will make a package at v0.1.0."
  exit 1
}
[ -z ${1} ] && usage
RELEASE=${1}
/bin/mkdir -p ./public/releases/${RELEASE}
${TAR} -czf ./public/releases/${RELEASE}/browser.tgz -C ./browser-current/ .
