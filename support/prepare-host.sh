#!/usr/bin/env bash

set -euo pipefail

UID=1000
GID=1000

SOLR_UID=8983
SOLR_GID=8983

function setupDone() {
  local -r name="$1"
  echo "Finished setting up ${name}"
}

# This script does the preparation on the host needed to run local development and tests.
echo "Preparing host using base dir $(pwd)"
SUPPORT_DIR="$(pwd)/support"

# Create directories.
TMP_DIR="${SUPPORT_DIR}/.tmp"
sudo mkdir -p "${TMP_DIR}"
sudo chown "${UID}:${GID}" "${TMP_DIR}"
setupDone "${TMP_DIR}"

SOLR_DIR="${TMP_DIR}/solr"
sudo mkdir -p "${SOLR_DIR}"
sudo chown "${SOLR_UID}:${SOLR_GID}" "${SOLR_DIR}"
setupDone "${SOLR_DIR}"

MONGO_DIR="${TMP_DIR}/mongo"
sudo mkdir -p "${MONGO_DIR}"
sudo chown "${UID}:${GID}" "${MONGO_DIR}"
setupDone "${MONGO_DIR}"

SAILS_DIR="${TMP_DIR}/sails"
sudo mkdir -p "${SAILS_DIR}"
sudo chown "${UID}:${GID}" "${SAILS_DIR}"
setupDone "${SAILS_DIR}"

SAILS_WORKING_DIR="${TMP_DIR}/sailsWorkingDir/tmp"
sudo mkdir -p "${SAILS_WORKING_DIR}";
sudo chown -R "${UID}:${GID}" "${SAILS_WORKING_DIR}"
setupDone "${SAILS_WORKING_DIR}"

ATTACHMENTS_DIR="${TMP_DIR}/attachments"
sudo mkdir -p "${ATTACHMENTS_DIR}"
sudo chown -R "${UID}:${GID}" "${ATTACHMENTS_DIR}"
setupDone "${ATTACHMENTS_DIR}"

ATTACHMENTS_STAGING_DIR="${ATTACHMENTS_DIR}/staging"
sudo mkdir -p "${ATTACHMENTS_STAGING_DIR}"
sudo chown -R "${UID}:${GID}" "${ATTACHMENTS_STAGING_DIR}"
setupDone "${ATTACHMENTS_STAGING_DIR}"

JUNIT_DIR="${TMP_DIR}/junit"
sudo mkdir -p "${JUNIT_DIR}"
sudo mkdir -p "${JUNIT_DIR}/backend-mocha"
sudo mkdir -p "${JUNIT_DIR}/backend-bruno"
sudo chown -R "${UID}:${GID}" "${JUNIT_DIR}"
setupDone "${JUNIT_DIR}"

# Compile the typescript.
npm run compile:tsc
