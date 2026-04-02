import { from } from 'rxjs';

import { Sails, Model } from "sails";
import { launch } from 'puppeteer';
import { DateTime } from 'luxon';
import * as fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'path';
import {
  Services as services,
  Datastream,
  DatastreamService
} from '@researchdatabox/redbox-core';
import { Duration, Effect, Schedule } from 'effect';
import type { PdfgenConfig } from '../../config/pdfgen';
import {
  BrowserError,
  DatastreamSaveError,
  MissingServiceError,
  MissingTokenError,
  PDFError,
  PDFRenderError
} from './PDFErrors';


export namespace Services {
  /**
   * WorkflowSteps related functions...
   *
   * Author: <a href='https://github.com/shilob' target='_blank'>Shilo Banihit</a>
   *
   */
  export class PDF extends services.Core.Service {

    private processMap: Map<string, boolean> = new Map<string, boolean>();
    private DatastreamService!: DatastreamService;
    protected _exportedMethods: any = [
      'createPDF',
      'init'
    ];

    public init() {
      this.registerSailsHook('after', ['hook:redbox:storage:ready', 'hook:redbox:datastream:ready', 'ready'], () => {
        const datastreamServiceName = sails.config.record.datastreamService;
        sails.log.verbose(`PDFService Webservice ready, using datastream service: ${datastreamServiceName}`);
        if (datastreamServiceName != undefined) {
          this.DatastreamService = sails.services[datastreamServiceName] as unknown as DatastreamService;
        }
      });
    }

    private logWarn(message: string, ...args: Array<unknown>) {
      return Effect.sync(() => sails.log.warn(message, ...args)).pipe(Effect.zipRight(Effect.logWarning(message)));
    }

    private logError(message: string, ...args: Array<unknown>) {
      return Effect.sync(() => sails.log.error(message, ...args)).pipe(Effect.zipRight(Effect.logError(message)));
    }

    private logDebug(message: string, ...args: Array<unknown>) {
      return Effect.sync(() => sails.log.debug(message, ...args)).pipe(Effect.zipRight(Effect.logDebug(message)));
    }

    private isRetryable(error: PDFError): boolean {
      return error._tag === 'BrowserError' || error._tag === 'PDFRenderError';
    }

    private buildRetrySchedule(brand: any, options: any) {
      const maxRetries = this.getOption(brand, options, 'maxRetries', 2);
      const baseDelayMs = this.getOption(brand, options, 'retryDelayMs', 5000);
      const multiplier = this.getOption(brand, options, 'retryBackoffMultiplier', 2);

      return Schedule.recurs(maxRetries).pipe(
        Schedule.addDelay((attempt) => Duration.millis(baseDelayMs * Math.pow(multiplier, Number(attempt))))
      );
    }


    private async waitForPageReady(page: any, brand: any, options: any): Promise<void> {
      const strategy = this.getOption(brand, options, 'readinessStrategy', 'networkIdle');
      const timeout = this.getOption(brand, options, 'readinessTimeout', 60000);

      switch (strategy) {
        case 'networkIdle':
          await page.waitForNetworkIdle({
            idleTime: this.getOption(brand, options, 'networkIdleTime', 2000),
            timeout
          });
          break;
        case 'selector':
          await page.waitForSelector(
            this.getOption(brand, options, 'waitForSelector'), { timeout }
          );
          break;
        case 'jsFlag':
          await page.waitForFunction(
            this.getOption(brand, options, 'waitForFunction'),
            { timeout, polling: 500 }
          );
          break;
        case 'networkIdle+selector':
          await page.waitForNetworkIdle({
            idleTime: this.getOption(brand, options, 'networkIdleTime', 2000),
            timeout
          });
          await page.waitForSelector(
            this.getOption(brand, options, 'waitForSelector'), { timeout }
          );
          break;
        default:
          sails.log.warn(`PDFService::Unknown readinessStrategy '${strategy}', falling back to networkIdle`);
          await page.waitForNetworkIdle({
            idleTime: this.getOption(brand, options, 'networkIdleTime', 2000),
            timeout
          });
          break;
      }
    }

    private attemptPDFGeneration(oid: string, record: any, options: any, brand: any, attempt: number): Effect.Effect<void, PDFError> {
      return Effect.scoped(Effect.gen(this, function* () {
        yield* Effect.sync(() => sails.log.verbose(`PDFService::Creating PDF for: ${oid} (Attempt ${attempt})`));

        const token = this.getOption(brand, options, 'token');
        if (!token) {
          yield* this.logWarn(`PDFService::API token for PDF generation is not set. Skipping generation: ${oid}`);
          return yield* Effect.fail(new MissingTokenError({ oid }));
        }

        const tmpUserDataDir = yield* Effect.acquireRelease(
          Effect.tryPromise({
            try: () => fs.mkdtemp(path.join(os.tmpdir(), 'pdfgen')),
            catch: (cause) => new BrowserError({ oid, url: '', cause })
          }),
          (dir) => Effect.promise(() => fs.rm(dir, { recursive: true, force: true })).pipe(Effect.catchAll(() => Effect.void))
        );

        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
          || ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome-stable'].find(candidate => existsSync(candidate));

        const browser = yield* Effect.acquireRelease(
          Effect.tryPromise({
            try: () => launch({
              headless: true,
              executablePath,
              args: ['--no-sandbox', `--user-data-dir=${tmpUserDataDir}`]
            }),
            catch: (cause) => new BrowserError({ oid, url: '', cause })
          }),
          (instance) => Effect.promise(async () => {
            try {
              await instance.close();
            } catch {
              // ignore close failures, process kill below handles the hard stop
            }
            const proc = instance.process?.();
            if (proc) {
              proc.kill('SIGTERM');
            }
          }).pipe(Effect.catchAll(() => Effect.void))
        );

        const page = yield* Effect.acquireRelease(
          Effect.tryPromise({
            try: () => browser.newPage(),
            catch: (cause) => new BrowserError({ oid, url: '', cause })
          }),
          (instance) => Effect.promise(() => instance.close()).pipe(Effect.catchAll(() => Effect.void))
        );

        yield* Effect.sync(() => {
          page.setExtraHTTPHeaders({
            Authorization: 'Bearer ' + token
          });
        });

        const enableLogging = this.getOption(brand, options, 'enableChromeLogging');
        if (enableLogging === true || enableLogging === 'true') {
          yield* Effect.sync(() => {
            page.on('console', (msg: any) => {
              sails.log.verbose(`PDFService::Chrome Console:${msg.text()}`);
            });
            page.on('pageerror', (error: any) => {
              sails.log.error(`PDFService::Chrome Page Error: ${error.message}`);
            });
            page.on('response', (response: any) => {
              sails.log.verbose(`PDFService::Chrome Response: ${response.status()}, URL:${response.url()}`);
            });
            page.on('requestfailed', (request: any) => {
              sails.log.error(`PDFService::Chrome Error: ${request.failure()?.errorText}, URL: ${request.url()}`);
            });
          });
        }

        const sourceUrlBase = this.getOption(brand, options, 'sourceUrlBase', `/${brand.name}/rdmp/record/view`);
        const pdfgenAppUrlOverride = this.getOption(brand, options, 'appUrlOverride');
        const baseUrl = pdfgenAppUrlOverride || sails.config.appUrl;
        const currentURL = `${baseUrl}${sourceUrlBase}/${oid}`;

        yield* Effect.addFinalizer(() => Effect.sync(() => {
          this.processMap.delete(currentURL);
        }));

        yield* Effect.sync(() => {
          sails.log.verbose(`PDFService::sourceUrlBase ${sourceUrlBase}`);
          sails.log.verbose(`PDFService::sails.config.pdfgen.appUrlOverride ${pdfgenAppUrlOverride}`);
          this.processMap.set(currentURL, true);
        });

        yield* this.logDebug(`PDFService::Chromium loading page: ${currentURL}`);

        yield* Effect.tryPromise({
          try: () => page.goto(currentURL, { waitUntil: 'domcontentloaded' }),
          catch: (cause) => new BrowserError({ oid, url: currentURL, cause })
        }).pipe(Effect.withSpan('navigatePage', { attributes: { oid, attempt, url: currentURL } }));

        yield* Effect.tryPromise({
          try: () => this.waitForPageReady(page, brand, options),
          catch: (cause) => new BrowserError({ oid, url: currentURL, cause })
        }).pipe(Effect.withSpan('waitForPageReady', {
          attributes: {
            oid,
            attempt,
            strategy: this.getOption(brand, options, 'readinessStrategy', 'networkIdle')
          }
        }));

        yield* Effect.sync(() => sails.log.verbose(`PDFService::Page ready: ${currentURL}, generating PDF...`));

        const date = DateTime.now().toMillis();
        const pdfPrefix = this.getOption(brand, options, 'pdfPrefix', '');
        const fileId = `${pdfPrefix}-${oid}-${date}.pdf`;

        let pdfOptions = this.getOption(brand, options, 'PDFOptions') || {};
        delete pdfOptions['path'];

        const defaultPDFOptions: any = {
          format: 'A4',
          printBackground: true,
          ...pdfOptions
        };

        const pdfBuffer = yield* Effect.tryPromise({
          try: () => page.pdf(defaultPDFOptions),
          catch: (cause) => new PDFRenderError({ oid, cause })
        }).pipe(Effect.withSpan('renderPDFBuffer', { attributes: { oid, attempt } }));

        yield* this.logDebug(`PDFService::Generated PDF buffer`);
        yield* Effect.sync(() => sails.log.verbose(`PDFService::Saving PDF: ${oid}`));

        const stagingDisk = StorageManagerService.stagingDisk();
        yield* Effect.tryPromise({
          try: () => stagingDisk.put(fileId, pdfBuffer),
          catch: (cause) => new DatastreamSaveError({ oid, cause })
        }).pipe(Effect.withSpan('saveToDatastream', { attributes: { oid, attempt, fileId } }));

        const datastream = new Datastream({ fileId: fileId, name: fileId });
        yield* Effect.tryPromise({
          try: () => this.DatastreamService.addDatastream(oid, datastream, stagingDisk),
          catch: (cause) => new DatastreamSaveError({ oid, cause })
        });

        yield* this.logDebug(`PDFService::Saved PDF to storage: ${oid}`);
      })).pipe(Effect.withSpan('generatePDF', { attributes: { oid, attempt, brand: brand.name } }));
    }

    private generatePDF(oid: string, record: any, options: any) {
      const brand = this.getBranding(record);
      let attempt = 0;

      return Effect.suspend(() => {
        attempt += 1;
        return this.attemptPDFGeneration(oid, record, options, brand, attempt);
      }).pipe(
        Effect.retry({
          schedule: this.buildRetrySchedule(brand, options),
          while: (error: PDFError) => this.isRetryable(error)
        }),
        Effect.withSpan('createPDF', { attributes: { oid, brand: brand.name } })
      );
    }

    private getBranding(record: any) {
      if (typeof BrandingService === 'undefined') {
        throw new Error('BrandingService global is not available');
      }
      return BrandingService.getBrandById(record.metaMetadata.brandId);
    }

    private getOption(branding: any, option: any, key: keyof PdfgenConfig | string, defaultValue: any = undefined) {
      const brandingConfig = sails.config.brandingAware(branding.name) as unknown as Record<string, unknown> & {
        pdfgen?: Record<string, unknown>;
      };
      let value = brandingConfig.pdfgen?.[key];
      if (option && option[key] !== undefined) {
        value = option[key];
      }
      if (value === undefined) {
        return defaultValue;
      }
      return value;
    }


    public createPDF(oid: string, record: any, options: any, user: any) {
      const brand = this.getBranding(record);
      const maxRetries = this.getOption(brand, options, 'maxRetries', 2);
      const baseDelayMs = this.getOption(brand, options, 'retryDelayMs', 5000);
      const multiplier = this.getOption(brand, options, 'retryBackoffMultiplier', 2);

      const runBackgroundRetries = (remainingRetries: number, nextAttempt: number): Effect.Effect<void, never> =>
        remainingRetries <= 0
          ? Effect.void
          : Effect.gen(this, function* () {
              const retryIndex = maxRetries - remainingRetries;
              const delayMs = baseDelayMs * Math.pow(multiplier, retryIndex);
              yield* this.logWarn(`PDFService::Scheduling retry ${nextAttempt - 1} of ${maxRetries} for ${oid} in ${delayMs}ms`);
              yield* Effect.sleep(Duration.millis(delayMs));
              yield* this.attemptPDFGeneration(oid, record, options, brand, nextAttempt).pipe(
                Effect.catchAll((error: PDFError) => {
                  if (this.isRetryable(error)) {
                    if (remainingRetries === 1) {
                      return this.logError(`PDFService::Max retries exhausted for ${oid} or non-retryable error.`, error);
                    }
                    return runBackgroundRetries(remainingRetries - 1, nextAttempt + 1);
                  }
                  return this.logWarn(`PDFService::non-retryable failure, skipping`, error);
                })
              );
            });

      const effect = this.attemptPDFGeneration(oid, record, options, brand, 1).pipe(
        Effect.catchAll((error: PDFError) => {
          if (this.isRetryable(error)) {
            return Effect.gen(this, function* () {
              yield* this.logWarn(`PDFService::Best-effort generation failed for ${oid}, but not blocking workflow. Retry scheduled: true. Error: ${error?.name} - ${error?.message}`);
              yield* Effect.forkDaemon(runBackgroundRetries(maxRetries, 2));
            });
          }

          if (error._tag === 'MissingTokenError') {
            return this.logWarn(`PDFService::Best-effort generation failed for ${oid}, but not blocking workflow. Retry scheduled: false. Error: ${error?.name} - ${error?.message}`);
          }

          return this.logWarn(`PDFService::Best-effort generation failed for ${oid}, but not blocking workflow. Retry scheduled: false. Error: ${error?.name} - ${error?.message}`);
        }),
        Effect.as(record),
        Effect.withSpan('createPDF', { attributes: { oid, brand: brand.name } })
      );

      return from(Effect.runPromise(effect));
    }
  }
}
