import { from } from 'rxjs';

import { Sails, Model } from "sails";
import { launch } from 'puppeteer';
import { DateTime } from 'luxon';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'path';

import { Services as service, Datastream } from '@researchdatabox/redbox-core-types';

declare var sails: Sails;
declare var RecordType: Model;
declare var _this: any;
declare var _: any;
declare var User: any;
declare var BrandingService: any;

export namespace Services {
  /**
   * WorkflowSteps related functions...
   *
   * Author: <a href='https://github.com/shilob' target='_blank'>Shilo Banihit</a>
   *
   */
  export class PDF extends service.Core.Service {

    private processMap: Map<string, boolean> = new Map<string, boolean>();

    protected _exportedMethods: any = [
      'createPDF',
    ];

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

    private async generatePDF(oid: string, record: any, options: any, attempt: number = 1): Promise<{ success: boolean, reason?: any, retryScheduled?: boolean }> {
      sails.log.verbose(`PDFService::Creating PDF for: ${oid} (Attempt ${attempt})`);

      const brand = this.getBranding(record);
      
      const StorageManagerService = sails.services['storagemanagerservice'];
      const DatastreamService = sails.services['standarddatastreamservice'];

      if (!StorageManagerService || !DatastreamService) {
        const msg = `PDFService::Required services missing: storagemanagerservice or standarddatastreamservice. Ensure ReDBox core-types version is compatible.`;
        sails.log.error(msg);
        return { success: false, reason: msg, retryScheduled: false };
      }

      // Check that the token is provided
      let token = this.getOption(brand, options, 'token');
      if (!token) {
        const msg = `PDFService::API token for PDF generation is not set. Skipping generation: ${oid}`;
        sails.log.warn(msg);
        return { success: false, reason: msg, retryScheduled: false };
      }

      let browser;
      let tmpUserDataDir;
      let currentURL = '';
      try {
        // Start the browser
        sails.log.verbose(`PDFService::Launching browser....`);
        // Ensure the user data dir is new each run so that the browser is completely clean
        tmpUserDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdfgen'));
        // Use the default executablePath with the 'chrome-headless-shell' headless mode
        // https://pptr.dev/guides/headless-modes/
        browser = await launch({ headless: 'shell', args: ['--no-sandbox', `--user-data-dir=${tmpUserDataDir}`] });

        // Create a browser page
        sails.log.verbose(`PDFService::Creating new page....`)
        const page = await browser.newPage();
        page.setExtraHTTPHeaders({
          Authorization: 'Bearer ' + token
        });

        // Enable Chrome logging if configured
        const enableLogging = this.getOption(brand, options, 'enableChromeLogging');
        if (enableLogging === true || enableLogging === 'true') {
          page.on('console', msg => {
            sails.log.verbose(`PDFService::Chrome Console:${msg.text()}`)
          });
          page.on('pageerror', error => {
            sails.log.error(`PDFService::Chrome Page Error: ${error.message}`);
          });
          page.on('response', response => {
            sails.log.verbose(`PDFService::Chrome Response: ${response.status()}, URL:${response.url()}`);
          });
          page.on('requestfailed', request => {
            sails.log.error(`PDFService::Chrome Error: ${request.failure()?.errorText}, URL: ${request.url()}`);
          });
        }

        let sourceUrlBase = this.getOption(brand, options, 'sourceUrlBase', `/${brand.name}/rdmp/record/view`);
        let pdfgenAppUrlOverride = this.getOption(brand, options, 'appUrlOverride');
        sails.log.verbose(`PDFService::sourceUrlBase ${sourceUrlBase}`);
        sails.log.verbose(`PDFService::sails.config.pdfgen.appUrlOverride ${pdfgenAppUrlOverride}`);
        let baseUrl = pdfgenAppUrlOverride || sails.config.appUrl;
        currentURL = `${baseUrl}${sourceUrlBase}/${oid}`;
        this.processMap.set(currentURL, true);
        sails.log.debug(`PDFService::Chromium loading page: ${currentURL}`);

        const strategy = this.getOption(brand, options, 'readinessStrategy', 'networkIdle');
        const isNetworkIdleFirst = strategy === 'networkIdle' || strategy === 'networkIdle+selector';
        
        await page.goto(currentURL, { waitUntil: 'domcontentloaded' });

        await this.waitForPageReady(page, brand, options);
        
        sails.log.verbose(`PDFService::Page ready: ${currentURL}, generating PDF...`);

        // Build the path to the pdf file
        const date = DateTime.now().toMillis();
        const pdfPrefix = this.getOption(brand, options, 'pdfPrefix', '');
        const fileId = `${pdfPrefix}-${oid}-${date}.pdf`
        
        sails.log.verbose(`PDFService::Printing PDF for ${oid}`);

        let pdfOptions = this.getOption(brand, options, 'PDFOptions') || {};
        // We don't want the file path to be overriden since we will get a buffer
        delete pdfOptions['path'];

        const defaultPDFOptions: any = {
          format: 'A4',
          printBackground: true,
          ...pdfOptions
        };
        
        const pdfBuffer = await page.pdf(defaultPDFOptions);
        sails.log.debug(`PDFService::Generated PDF buffer`);

        // Release browser resources
        await page.close();
        await browser.close();

        // Save the pdf file to the datastream service
        sails.log.verbose(`PDFService::Saving PDF: ${oid}`);
        const stagingDisk = StorageManagerService.stagingDisk();
        await stagingDisk.put(fileId, pdfBuffer);

        const datastream = new Datastream({ fileId: fileId, name: fileId });
        await DatastreamService.addDatastream(oid, datastream, stagingDisk);
        sails.log.debug(`PDFService::Saved PDF to storage: ${oid}`);

        return { success: true };
      } catch (e: any) {
        const errorStack = e.stack || e.message || String(e);
        sails.log.error(`PDFService::Error encountered while generating the PDF: ${oid}`);
        sails.log.error(`Context: brand=${brand.name}, oid=${oid}, url=${currentURL}, attempt=${attempt}`);
        sails.log.error(errorStack);
        
        try {
          if (browser) {
            await browser.close();
          }
        } catch (err: any) {
          sails.log.error(`PDFService::Failed to close browser after error: ${err.message}`);
        }

        const maxRetries = this.getOption(brand, options, 'maxRetries', 2);
        // Basic check for transient failures vs non-retryable
        const isTransient = true; // In Puppeteer most errors like navigation timeout are transient
        if (isTransient && attempt <= maxRetries) {
          const retryDelay = this.getOption(brand, options, 'retryDelayMs', 5000);
          const backoff = this.getOption(brand, options, 'retryBackoffMultiplier', 2);
          const delay = retryDelay * Math.pow(backoff, attempt - 1);
          
          sails.log.warn(`PDFService::Scheduling retry ${attempt} of ${maxRetries} for ${oid} in ${delay}ms`);
          setTimeout(() => {
            this.generatePDF(oid, record, options, attempt + 1).catch(err => {
              sails.log.error(`PDFService::Retry failed for ${oid}: ${err.message}`);
            });
          }, delay);
          
          return { success: false, reason: e, retryScheduled: true };
        } else {
          sails.log.error(`PDFService::Max retries exhausted for ${oid} or non-retryable error.`);
          return { success: false, reason: e, retryScheduled: false };
        }

      } finally {
        // clean up in case browser didn't close properly
        if (browser && browser.process() != null) {
          browser.process().kill('SIGTERM');
        }
        if (tmpUserDataDir) {
          await fs.rm(tmpUserDataDir, { recursive: true, force: true });
        }
        if (currentURL) {
          this.processMap.delete(currentURL);
        }
      }
    }

    private getBranding(record: any) {
      return BrandingService.getBrandById(record.metaMetadata.brandId)
    }

    private getOption(branding: any, option: any, key: string, defaultValue: any = undefined) {
      let value = sails.config.brandingAware(branding.name).pdfgen[key];
      if (option && option[key] !== undefined) {
        value = option[key];
      }
      if (value === undefined) {
        return defaultValue;
      }
      return value;
    }


    public createPDF(oid: string, record: any, options: any, user: any) {
      // Return the observable so the workflow doesn't block on failures/retries
      // We wrap it in a try/catch promise to resolve with the record always
      const promise = this.generatePDF(oid, record, options).then(result => {
        if (!result.success) {
           sails.log.warn(`PDFService::Best-effort generation failed for ${oid}, but not blocking workflow. Retry scheduled: ${result.retryScheduled}`);
        }
        return record;
      });
      return from(promise);
    }
  }
}
module.exports = new Services.PDF().exports();
