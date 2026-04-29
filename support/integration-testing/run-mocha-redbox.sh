#!/usr/bin/env bash

set -euo pipefail
set -o xtrace

cd /opt/redbox-portal

rm -rf /opt/redbox-portal/coverage/mocha/* || true
rm /opt/redbox-portal/.tmp/junit/backend-mocha/backend-mocha.xml || true

node_cmd=(node)

RBPORTAL_EXTRA_NODE_MODULES="${RBPORTAL_EXTRA_NODE_MODULES:-/opt/redbox-integration-node_modules/node_modules}"
export NODE_PATH="${RBPORTAL_HOOK_DIR}/node_modules:${RBPORTAL_EXTRA_NODE_MODULES}:${NODE_PATH:-}"

ensure_node_module() {
  local module_name="$1"
  local package_spec="$2"

  if ! node -e "const paths = [process.cwd(), process.env.RBPORTAL_HOOK_DIR, process.env.RBPORTAL_EXTRA_NODE_MODULES].filter(Boolean); require.resolve(process.argv[1], { paths });" "${module_name}" >/dev/null 2>&1; then
    npm install --prefix /opt/redbox-integration-node_modules --no-save --ignore-scripts --legacy-peer-deps "${package_spec}"
  fi
}

resolve_node_module() {
  local module_name="$1"

  node -e "const paths = [process.cwd(), process.env.RBPORTAL_HOOK_DIR, process.env.RBPORTAL_EXTRA_NODE_MODULES].filter(Boolean); process.stdout.write(require.resolve(process.argv[1], { paths }));" "${module_name}"
}

export TS_NODE_PROJECT=${TS_NODE_PROJECT:-"${RBPORTAL_HOOK_DIR}/test/tsconfig.json"}
export TS_NODE_TRANSPILE_ONLY=true
export TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node","esModuleInterop":true}'

export RBPORTAL_COVERAGE_DIR=${RBPORTAL_COVERAGE_DIR:-/tmp/coverage/mocha}
mkdir -p "$RBPORTAL_COVERAGE_DIR"
chmod 777 "$RBPORTAL_COVERAGE_DIR" || true

export NYC_OUTPUT=${NYC_OUTPUT:-/tmp/nyc_output}
mkdir -p "$NYC_OUTPUT"
chmod 777 "$NYC_OUTPUT" || true

echo "Generating shims via redbox-core loader..."
node -e "
  const resolvePaths = [process.cwd(), process.env.RBPORTAL_HOOK_DIR, process.env.RBPORTAL_EXTRA_NODE_MODULES].filter(Boolean);
  const redboxCorePath = require.resolve('@researchdatabox/redbox-core', { paths: resolvePaths });
  const { generateAllShims } = require(redboxCorePath);
  generateAllShims(process.cwd(), {
    forceRegenerate: true,
    verbose: true
  }).catch(err => {
    console.error('Shim generation failed:', err);
    process.exit(1);
  });
"

bootstrap_test=${RBPORTAL_MOCHA_BOOTSTRAP:-"${RBPORTAL_HOOK_DIR}/support/integration-testing/bootstrap.test.ts"}

test_args=()
if [[ -n "${RBPORTAL_MOCHA_TEST_PATHS:-}" ]]; then
  mapfile -t env_test_args <<< "${RBPORTAL_MOCHA_TEST_PATHS}"
  test_args+=("${env_test_args[@]}")
fi

if [[ ${#@} -gt 0 ]]; then
  test_args+=("$@")
fi

if [[ ${#test_args[@]} -eq 0 ]]; then
  test_args=(test/integration/**/*.test.ts)
fi

ensure_node_module "mocha/bin/mocha.js" "mocha@${RBPORTAL_MOCHA_VERSION:-11.7.4}"
ensure_node_module "nyc/bin/nyc.js" "nyc@${RBPORTAL_NYC_VERSION:-18.0.0}"
ensure_node_module "chai" "chai@${RBPORTAL_CHAI_VERSION:-6.2.2}"
if [[ "${CI:-false}" == "true" ]]; then
  ensure_node_module "mocha-junit-reporter" "mocha-junit-reporter@${RBPORTAL_MOCHA_JUNIT_REPORTER_VERSION:-2.2.1}"
fi

mocha_cmd=("$(resolve_node_module "mocha/bin/mocha.js")")
nyc_cmd=("$(resolve_node_module "nyc/bin/nyc.js")")
if [[ -n "${RBPORTAL_REMOTE_DEBUG:-}" ]]; then
  nyc_cmd+=(--inspect="${RBPORTAL_REMOTE_DEBUG}")
fi

final_args=("${node_cmd[@]}" "${mocha_cmd[@]}")

mocha_config_args=()
if [[ -f "${RBPORTAL_HOOK_DIR}/support/integration-testing/.mocharc.cjs" ]]; then
  mocha_config_args+=(--config "${RBPORTAL_HOOK_DIR}/support/integration-testing/.mocharc.cjs")
elif [[ -f test/integration/.mocharc.js ]]; then
  mocha_config_args+=(--config test/integration/.mocharc.js)
else
  mocha_config_args+=(
    --require ts-node/register
    --require chai
    --extension ts,js
    --recursive
    --timeout 30s
    --ui bdd
  )
  if [[ "${CI:-false}" == "true" ]]; then
    mocha_config_args+=(--reporter mocha-junit-reporter --reporter-option mochaFile=./.tmp/junit/backend-mocha/backend-mocha.xml)
  else
    mocha_config_args+=(--reporter spec)
  fi
fi

exec "${nyc_cmd[@]}" --no-clean \
  --temp-dir "$NYC_OUTPUT" \
  --report-dir "$RBPORTAL_COVERAGE_DIR" \
  --reporter=lcov --exclude-after-remap=false \
  "${final_args[@]}" \
  "${mocha_config_args[@]}" \
  --exit "${bootstrap_test}" "${test_args[@]}"
