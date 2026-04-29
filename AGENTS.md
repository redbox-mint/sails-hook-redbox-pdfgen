# AGENTS.md

## Purpose

This repository is a ReDBox hook project for Sails.js.
It packages `@researchdatabox/sails-hook-redbox-pdfgen`, which adds PDF generation for ReDBox records.

Treat this as a hook that is loaded by a host ReDBox portal, not as a standalone Sails application.

## Project Shape

- Runtime entrypoint: `index.js`
- TypeScript source: `src/`
- Compiled output: `dist/`
- Hook config examples: `config/`
- Docker orchestration for local dev and integration tests: `support/`
- Bruno API tests: `test/bruno/`
- Mocha integration tests: `test/mocha/`
- Unit tests: `test/unit/`

## ReDBox Conventions

- This hook is part of the ReDBox ecosystem and must integrate with ReDBox service registration patterns.
- Use `@researchdatabox/redbox-core` for both runtime behavior and shared ReDBox typings.
- Use `@researchdatabox/redbox-dev-tools` for hook compilation and unit-test execution.
- ReDBox exposes important singletons globally and through `sails`, especially Services and Models. Before inventing local wrappers, check whether the dependency already exists as:
  - `sails.services.<name>`
  - `sails.models.<name>`
  - a ReDBox global singleton such as `BrandingService`, `StorageManagerService`, or similar host-provided service objects
- Prefer using the existing ReDBox service/model infrastructure instead of duplicating business logic inside the hook.
- Hook registration happens through the standard ReDBox loader exports in `index.js`, especially:
  - `registerRedboxConfig`
  - `registerRedboxServices`

## Working Rules

- Assume the host portal provides the surrounding Sails/ReDBox environment.
- Do not convert this into a standalone app or SPA-oriented structure.
- Keep changes aligned with hook lifecycle behavior and ReDBox service loading.
- If adding typings for hook config, prefer module augmentation rather than ad hoc casts.
- If changing service behavior, verify how the host portal will provide dependent services at runtime.

## Install And Compile

Run from the repository root:

```bash
npm install --ignore-scripts
npm run compile
```

Useful scripts:

- `npm run clean`: remove `dist/`
- `npm run compile`: compile TypeScript from `src/` into `dist/` through `redbox-dev-tools`
- `npm run build`: compile alias

## Local Development

Prepare the host-side local environment:

```bash
npm run dev:host
```

Start the local Docker-based ReDBox portal plus this hook:

```bash
npm run dev:run
```

Clean up the development compose stack:

```bash
npm run dev:docker:clean
```

Full local state cleanup:

```bash
npm run dev:host:clean
```

## Testing

Run the full test sequence:

```bash
npm test
```

This default gate runs compile, unit tests, and Mocha integration tests. Bruno remains an explicit API acceptance suite.

Run unit tests only:

```bash
npm run test:unit
```

Run Mocha integration tests:

```bash
npm run test:integration:mocha:clean
npm run test:integration:mocha
```

Run Bruno API tests:

```bash
npm run test:bruno:clean
npm run test:bruno
```

Notes:

- `test:integration:mocha` runs inside a lifted host portal using `support/integration-testing/docker-compose.mocha.yml`.
- `test:bruno` runs against the Docker Compose environment under `support/docker-compose.bruno.yml`.
- If Bruno fails with auth or PDF-generation setup problems, inspect `support/docker-compose.yml`, `support/docker-compose.bruno.yml`, and `test/bruno/environments/test.bru` before changing application code.
- The current Bruno setup expects the stable Docker hostname `rbportal`.

## Dependency Contract

- Keep `@researchdatabox/redbox-core` in `peerDependencies` as the host compatibility contract.
- Keep `@researchdatabox/redbox-core` and `@researchdatabox/redbox-dev-tools` in `devDependencies` for local authoring and CI. Until the modern shared packages are published, these may resolve from the sibling `../redbox-portal/packages/*` checkout.
- Keep only pdfgen-owned runtime packages, such as `effect` and `puppeteer`, in `dependencies`.
- Do not add direct pins for shared hook toolchain packages such as `typescript`, `ts-node`, `mocha`, or `chai`.
- The modern shared packages must be available from the configured registry before switching this hook back to registry-based dev dependency versions.

## Files To Read First

- `package.json`: authoritative scripts
- `index.js`: hook registration and exported ReDBox loader hooks
- `src/index.ts`: TypeScript source for hook initialization
- `src/api/services/PDFService.ts`: main service logic and ReDBox service dependencies
- `src/config/pdfgen.d.ts`: module augmentation for hook config typing
- `support/docker-compose.yml`: local dev environment
- `support/integration-testing/docker-compose.mocha.yml`: Mocha test orchestration
- `support/docker-compose.bruno.yml`: Bruno test orchestration

## Practical Guidance For Future Agents

- Start by reading `package.json` and the relevant compose file before changing anything.
- Treat failing Bruno or Mocha runs as orchestration/configuration issues first, not product-code issues.
- When you need a dependency from the host portal, look for an existing ReDBox service/model/global singleton before adding a new abstraction.
- Preserve compatibility with the way ReDBox injects config and services through the hook loader.
