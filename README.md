# ReDBox Portal Record PDF Generation

An installable hook for the ReDBox Portal to add PDF generation functionality for records using Puppeteer.

This legacy release starts a fresh Chrome instance for each PDF. `initPool()` remains a compatibility no-op.

## 1.2.10 hotfix for the UTS 1.2.9 release

This branch starts at `75854e3f8cb50a44fab69a447bba6e8d4cef559d`, the published `1.2.9` source used by UTS portal `v2.2.1`. It retains that release's API and locked dependency versions, and pins Puppeteer to UTS's actual `10.4.0` version. It does not include the ReDBox v5 changes now on master.

The hotfix places browser setup, authentication headers, navigation and rendering inside cleanup; awaits header setup; propagates rendering/upload errors through the existing Observable; and removes completed URL tracking entries. Cleanup failures do not replace the original rendering error. PDF naming, rendering options and datastream upload behavior remain the same. No pool, retry policy or dependency upgrade is introduced.

The [Puppeteer 10 lifecycle adapter](typescript/lib/Puppeteer10.ts) fixes the startup/profile race inside this hook. Upstream `BrowserRunner.kill()` removes the temporary directory before killing only the parent process; `Launcher.launch()` returns the timeout without awaiting exit cleanup. A surviving worker can recreate the directory. The adapter terminates the owned POSIX process group, waits for the process `close` event (including inherited pipe closure), then removes that runner's temporary profile. Launch errors wait for cleanup before returning. Caller-owned profiles are preserved. Graceful close has a five-second deadline before forced termination, and forced cleanup has its own five-second deadline. Cleanup failures are reported while preserving the original launch error.

The adapter evaluates the installed launcher in a separate CommonJS module with a runner specific to each call. It leaves shared Puppeteer exports, prototypes, require-cache entries and installed files unchanged. This uses Puppeteer internals deliberately: version and SHA-256 checks require the exact published `10.4.0` launcher/runner files, verified against UTS's packaged files. A modified or upgraded launcher is rejected before spawning. Any later dependency upgrade must replace or revalidate this adapter. Process-group behavior is verified on UTS's Linux runtime; Windows process-tree termination is not covered by these tests.

Callers and background jobs now receive errors that were previously logged and swallowed. Agenda may still log a failed job as “finished” when it emits its completion/finalization event; that does not indicate a successful PDF.

### Local verification

The existing `npm run build` and `npm test` scripts compile and run the failure regressions. To verify using the exact packaged UTS runtime dependencies and real Chrome, without installing them locally:

```bash
bash support/testing/run-uts.sh
# Or run a subset:
bash support/testing/run-uts.sh unit
bash support/testing/run-uts.sh browser
# Rebuild/package only, after tests:
bash support/testing/run-uts.sh pack
```

Docker must already have the pinned UTS image, or have authorized pull access. The runner prints no credentials. It uses a read-only source mount, no external network, no Sails lift or production records, a 1,200 MiB memory cap, one CPU, a PID cap and a 90-second watchdog. Tests use synthetic metadata and local adapters for framework registration and attachment storage. Full portal rendering and real S3 uploads require staging validation.

The default command runs 18 unit regressions, tests actual Chrome success, two navigation failures and 20 launch timeouts at 100 ms, then creates `support/.tmp/pdf-hotfix/researchdatabox-sails-hook-redbox-pdfgen-1.2.10.tgz`. The package is compiled from this checkout. The runner uses the historical PDF TypeScript compiler and UTS's actual hoisted/private module resolution; compiler flags restrict ambient types and skip checking third-party declarations. No production dependency files are modified. Profile deletion is asserted immediately when each launch rejects. Other browser resource assertions happen before test safety cleanup and allow up to two seconds for asynchronous exit handling. `browser-results.json` records the observations. Nothing is published or deployed.

The launch-timeout test starts actual Chrome behind a shim that withholds the DevTools endpoint. The default 100 ms timeout deliberately exercises very early startup rather than waiting production's 30 seconds. Use `PDFGEN_LAUNCH_TIMEOUT_MS=1000 PDFGEN_LAUNCH_REPEATS=5 bash support/testing/run-uts.sh browser` for the later startup case. The deterministic unit control uses the real upstream runner with a synthetic child that waits until its parent exits and the profile disappears, then recreates it. That control proves the test exercises the original race; the adapter's regressions require cleanup before rejection, stable deletion afterwards, independent concurrent launches, preserved caller profiles and cleanup after failed spawns. No broad temporary-directory sweep or delayed retry is involved.

Release `1.2.10` separately and pin it in the UTS build only after review and staging validation. This branch's historical CircleCI publish job is restricted to `v1.2.x` release tags, with unit tests before publishing; an ordinary branch push does not publish. No tag was created. The UTS image also contains a Chrome/Puppeteer revision mismatch; this hotfix intentionally leaves those versions unchanged.

## Installation
In your redbox portal root folder run the command:

```npm i @researchdatabox/sails-hook-redbox-pdfgen```

### 1.2.6 only
Before installing this plugin, install Chrome manually:
```
apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
```
Then set `export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`

## Configuration

The service is designed to run using the record post-save trigger functionality. It has the following options:

| Parameter      | Description                                                                                                                                                                                                                                                                                                                                                                                                                                          | Required |
|-----------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| waitForSelector | A [css selector](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagewaitforselectorselector-options) that puppeteer will wait for before generating the PDF. Usually this is when the angular app has finished initialising and the selector "div#loading.hidden" will be satisfactory. If you have components that make AJAX calls after initialisation that you need to wait on then you may need to use a different selector.  | Yes      |
| pdf-prefix      | The prefix of the filename that will be generated. PDFs will be stored as datastreams (attachments) to the record with this parameter as a prefix followed by an ISO8601 datestring. e.g. rdmp-pdf-201901021000.pdf                                                                                                                                                                                                                                  | Yes      |
| token           | An API access token that puppeteer will use to access the record. This needs to be generated for a user on the User Management page of the system. The user must also have appropriate roles set so that it has appropriate permissions to view the record.                                                                                                                                                                                          | Yes      |

### Example RecordType configuration

```
hooks: {
      onCreate: {
        post: [{

          function: 'sails.services.pdfservice.createPDF',
          options: {
            waitForSelector: 'div#loading.hidden',
            pdfPrefix: 'rdmp-pdf',
            token: 'abcd-efgh-abcd-abcd-abcd'
          }
        }]
      },
      onUpdate: {
        post: [{
          function: 'sails.services.pdfservice.createPDF',
          options: {
            waitForSelector: 'div#loading.hidden',
            pdfPrefix: 'rdmp-pdf',
            token: 'abcd-efgh-abcd-abcd-abcd'
          }
        }]
      }
    },
```

### System-wide configuration

`sails.config.pdfgen.minPool` and `sails.config.pdfgen.maxPool` have no effect in this release because browser pooling is disabled.
