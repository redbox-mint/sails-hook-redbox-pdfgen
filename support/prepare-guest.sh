#!/usr/bin/env bash

set -euo pipefail

# This script does the preparation on the guest needed to run local development and tests.

BASE_DIR="/opt/sails-hook-redbox-pdfgen"
SUPPORT_DIR="${BASE_DIR}/support"
BUILD_DIR="/tmp/build-sails-hook-redbox-pdfgen"
BUILD_PREFIX="researchdatabox-sails-hook-redbox-pdfgen"

# Copy the files to install this hook for testing.
cp "${BASE_DIR}/test/resources/index.js" "${BASE_DIR}/index.js"
mkdir -p "${BASE_DIR}/config"
cp "${BASE_DIR}/test/resources/config/agendaQueue.js" "${BASE_DIR}/config/agendaQueue.js"
cp "${BASE_DIR}/test/resources/config/rdmp-recordtype.js" "${BASE_DIR}/config/rdmp-recordtype.js"

# create the minio local bucket.
ATTACH_DIR="${SUPPORT_DIR}/.tmp/minio-data/.minio.sys/buckets/${HOOK_S3_BUCKET}"
if [ ! -d "${ATTACH_DIR}" ]; then
  # Configure minio
  minio-client alias set local "${HOOK_S3_ENDPOINT}" minioadmin minioadmin
  minio-client mb "local/$HOOK_S3_BUCKET"
else
  echo "Attachments Bucket ${HOOK_S3_BUCKET} exists, skipping creation."
fi

# Create the aws credentials for accessing the minio bucket.
CREDS_DIR=/home/node/.aws
CREDS_FILE="${CREDS_DIR}/credentials"
if [ ! -f "${CREDS_FILE}" ]; then
  echo "Creating credentials file..."
  mkdir -p "${CREDS_DIR}"
  cat > $CREDS_FILE<<EOF
[default]
aws_access_key_id = ${HOOK_S3_ACCESS_KEY}
aws_secret_access_key = ${HOOK_S3_SECRET_KEY}
EOF
else
  echo "Reusing existing credentials file ${CREDS_FILE}"
fi

# Build this package
cd "${BASE_DIR}"
mkdir -p "${BUILD_DIR}"
rm -rf ${BUILD_DIR}/${BUILD_PREFIX}*
npm pack . --pack-destination=${BUILD_DIR}

# install this package
cd /opt/redbox-portal
npm install ${BUILD_DIR}/${BUILD_PREFIX}*
