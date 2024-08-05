#! /bin/sh

BASE_DIR="/opt/sails-hook-redbox-pdfgen/support/development"
ATTACH_DIR="${BASE_DIR}/.tmp/minio-data/.minio.sys/buckets/${HOOK_S3_BUCKET}"
if [ ! -d "${ATTACH_DIR}" ]; then
  # Configure
  minio-client alias set local "${HOOK_S3_ENDPOINT}" minioadmin minioadmin
  minio-client mb "local/$HOOK_S3_BUCKET"
else
  echo "Attachments Bucket exists, skipping creation."
fi

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
  echo "Reusing existing credentials file: ${CREDS_FILE}"
fi
