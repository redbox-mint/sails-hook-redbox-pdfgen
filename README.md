# redbox-hook--researchdatabox-sails-hook-redbox-pdfgen

A generated ReDBox hook archetype.

This project keeps its dependency declarations intentionally small:

- `@researchdatabox/redbox-core` is the ReDBox runtime compatibility contract
- `@researchdatabox/redbox-dev-tools` provides the shared compile and unit-test toolchain
- direct `dependencies` are reserved for hook-owned runtime libraries only
- the generated package versions assume `redbox-core` and `redbox-dev-tools` are installed from npm, not from a sibling `redbox-portal` checkout

## Development

```bash
npm install
npm run compile
npm run test:unit
```

## Record Hook Integration

This hook registers the `PDFService-CreatePDF` Agenda job. Record lifecycle hooks should enqueue that job through the ReDBox queue trigger helper:

```ts
{
  function: 'sails.services.rdmpservice.queueTriggerCall',
  options: {
    jobName: 'PDFService-CreatePDF',
    triggerConfiguration: {
      function: 'sails.services.pdfservice.createPDF',
      options: {
        readinessStrategy: 'networkIdle',
        pdfPrefix: 'rdmp-pdf'
      }
    }
  }
}
```

Do not use `PDFService-CreatePDF` directly as a record hook `function`; ReDBox evaluates that field as JavaScript, while `PDFService-CreatePDF` is the queue job name.

Local installs intentionally allow lifecycle scripts so native modules and other postinstall hooks can run. Use `npm install --ignore-scripts` only in controlled CI or container contexts where that trade-off is deliberate.

For the docker-backed portal harness:

```bash
npm run dev:run:build
npm run dev:run
```

The development compose stack expects a locally trusted CA certificate at `support/development/certs/dev-ca.pem` and mounts it with `NODE_EXTRA_CA_CERTS`. Generate that certificate with your local CA tooling, for example `mkcert -CAROOT`, before starting the stack.

## Integration Audit

Each PDF generation pipeline emits records to ReDBox's `IntegrationAuditService`, surfaced via `GET /:branding/:portal/api/integration-audit/:oid` and the audit dashboard. Records are filed under `integrationName: 'pdf'` with two action types:

- `generatePdfTrigger` — one parent span per `createPDF` call. Captures `triggeredBy` (defaults to `'createPDF'`, override via `options.triggerSource`), `requestSummary.maxRetries`/`baseDelayMs`/`multiplier`, and on completion a `responseSummary.finalStatus` (`success`/`failed`/`skipped`) plus `attemptsRun`.
- `generatePdf` — one child span per `attemptPDFGeneration` invocation (initial attempt and every background retry). Each child shares the parent's `traceId` and links via `parentSpanId`. `requestSummary` carries `attempt`, `url`, `sourceUrlBase`, `readinessStrategy`, and `pdfPrefix`. On success `responseSummary` includes `fileId` and `pdfBufferSize`; on failure it includes `errorTag` (e.g. `BrowserError`, `PDFRenderError`, `DatastreamSaveError`) plus the underlying `cause` message.

The hook owns its own audit identifiers in `src/api/services/PDFAudit.ts` rather than registering with `redbox-core`. The relevant `redbox-core` types are widened (`IntegrationAuditNameLike`, `IntegrationAuditActionLike`) so hooks can ship new audit categories without a core release.

Audit calls degrade gracefully: if the global `IntegrationAuditService` is not available (e.g. in unit tests), `startPdfAudit`/`completePdfAudit`/`failPdfAudit` no-op and PDF generation continues unchanged.

## Structure

- `src/index.ts`: hook entrypoint using `defineRedboxHook()`
- `src/api/controllers`: hook controllers
- `src/api/services`: hook services
- `src/config`: configuration and reusable form definition helpers
- `src/form-config`: form config exports
- `test/unit`: fast hook-local TypeScript tests
- `test/integration`: portal integration tests
