#!/usr/bin/env bash

set -euo pipefail

# This script does the preparation on the host needed to run local development and tests.
echo "Preparing host using base dir $(pwd)"
SUPPORT_DIR="$(pwd)/support"

# Create directories.
TMP_DIR="${SUPPORT_DIR}/.tmp"
sudo mkdir -p "${TMP_DIR}"
sudo chown 1000:1000 "${TMP_DIR}"
echo "Set up ${TMP_DIR}"

SOLR_DIR="${TMP_DIR}/solr"
sudo mkdir -p "${SOLR_DIR}"
sudo chown 8983:8983 "${SOLR_DIR}"
echo "Set up ${SOLR_DIR}"

MONGO_DIR="${TMP_DIR}/mongo"
sudo mkdir -p "${MONGO_DIR}"
sudo chown 1000:1000 "${MONGO_DIR}"
echo "Set up ${MONGO_DIR}"

SAILS_DIR="${TMP_DIR}/sails"
sudo mkdir -p "${SAILS_DIR}"
sudo chown 1000:1000 "${SAILS_DIR}"
echo "Set up ${SAILS_DIR}"

SAILS_WORKING_DIR="${TMP_DIR}/sailsWorkingDir/tmp"
sudo mkdir -p "${SAILS_WORKING_DIR}";
sudo chown -R 1000:1000 "${SAILS_WORKING_DIR}"
echo "Set up ${SAILS_WORKING_DIR}"

ATTACHMENTS_DIR="${TMP_DIR}/attachments"
sudo mkdir -p "${ATTACHMENTS_DIR}"
sudo chown -R 1000:1000 "${ATTACHMENTS_DIR}"
echo "Set up ${ATTACHMENTS_DIR}"

ATTACHMENTS_STAGING_DIR="${ATTACHMENTS_DIR}/staging"
sudo mkdir -p "${ATTACHMENTS_STAGING_DIR}"
sudo chown -R 1000:1000 "${ATTACHMENTS_STAGING_DIR}"
echo "Set up ${ATTACHMENTS_STAGING_DIR}"

JUNIT_DIR="${TMP_DIR}/junit"
sudo mkdir -p "${JUNIT_DIR}"
sudo mkdir -p "${JUNIT_DIR}/backend-mocha"
sudo mkdir -p "${JUNIT_DIR}/backend-bruno"
sudo chown -R 1000:1000 "${JUNIT_DIR}"
echo "Set up ${JUNIT_DIR}"
