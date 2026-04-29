#!/usr/bin/env bash

set -euo pipefail
set -o xtrace

HOOK_DIR="/opt/redbox-portal/node_modules/@researchdatabox/sails-hook-redbox-pdfgen"
export RBPORTAL_HOOK_DIR="${HOOK_DIR}"
RBPORTAL_REDBOX_CORE_VERSION="${RBPORTAL_REDBOX_CORE_VERSION:-0.0.0-bootstrap.0}"
RBPORTAL_EXTRA_NODE_MODULES="${RBPORTAL_EXTRA_NODE_MODULES:-/opt/redbox-integration-node_modules/node_modules}"
export NODE_PATH="${HOOK_DIR}/node_modules:${RBPORTAL_EXTRA_NODE_MODULES}:${NODE_PATH:-}"

ensure_node_module() {
  local module_name="$1"
  local package_spec="$2"

  if ! node -e "const paths = [process.cwd(), process.env.RBPORTAL_HOOK_DIR, process.env.RBPORTAL_EXTRA_NODE_MODULES].filter(Boolean); require.resolve(process.argv[1], { paths });" "${module_name}" >/dev/null 2>&1; then
    npm install --prefix /opt/redbox-integration-node_modules --no-save --ignore-scripts --legacy-peer-deps "${package_spec}"
  fi
}

cd "${HOOK_DIR}"

if ! node -e "require.resolve('effect'); require.resolve('puppeteer')" >/dev/null 2>&1; then
  npm install --omit=dev --ignore-scripts --legacy-peer-deps --no-package-lock
fi

cd /opt/redbox-portal

ensure_node_module "@researchdatabox/redbox-core" "@researchdatabox/redbox-core@${RBPORTAL_REDBOX_CORE_VERSION}"
ensure_node_module "@researchdatabox/rva-registry-openapi-generated-node" "@researchdatabox/rva-registry-openapi-generated-node@${RBPORTAL_RVA_REGISTRY_VERSION:-0.0.0-bootstrap.0}"
ensure_node_module "@researchdatabox/raido-openapi-generated-node" "@researchdatabox/raido-openapi-generated-node@${RBPORTAL_RAIDO_VERSION:-0.0.3}"
ensure_node_module "@researchdatabox/sails-ng-common" "@researchdatabox/sails-ng-common@${RBPORTAL_SAILS_NG_COMMON_VERSION:-0.2.1}"

ATTACH_DIR="/opt/redbox-portal/node_modules/@researchdatabox/sails-hook-redbox-pdfgen/support/.tmp/minio-data/.minio.sys/buckets/${HOOK_S3_BUCKET}"
if [ ! -d "${ATTACH_DIR}" ]; then
  minio-client alias set local "${HOOK_S3_ENDPOINT}" minioadmin minioadmin
  minio-client mb "local/${HOOK_S3_BUCKET}" || true
fi

CREDS_DIR=/home/node/.aws
CREDS_FILE="${CREDS_DIR}/credentials"
if [ ! -f "${CREDS_FILE}" ]; then
  mkdir -p "${CREDS_DIR}"
  cat > "${CREDS_FILE}" <<EOF
[default]
aws_access_key_id = ${HOOK_S3_ACCESS_KEY}
aws_secret_access_key = ${HOOK_S3_SECRET_KEY}
EOF
fi

cp /opt/pdfgen-test-resources/config/agendaQueue.js /opt/redbox-portal/config/agendaQueue.js
cp /opt/pdfgen-test-resources/config/rdmp-recordtype.js /opt/redbox-portal/config/recordtype.js

if [ -z "${RBPORTAL_MOCHA_TEST_PATHS:-}" ]; then
  RBPORTAL_MOCHA_TEST_PATHS="$(find "${HOOK_DIR}/test/mocha" -type f -name "*.spec.mjs" | sort)"
  export RBPORTAL_MOCHA_TEST_PATHS
fi

exec bash "${HOOK_DIR}/support/integration-testing/run-mocha-redbox.sh"
