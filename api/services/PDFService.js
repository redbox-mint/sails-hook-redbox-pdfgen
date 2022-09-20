"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Services = void 0;
const Rx_1 = require("rxjs/Rx");
const puppeteer_1 = require("puppeteer");
const fs = require("fs-extra");
const moment = require("moment");
const os = require('os');
const path = require('path');
const redbox_core_types_1 = require("@researchdatabox/redbox-core-types");
var Services;
(function (Services) {
    class PDF extends redbox_core_types_1.Services.Core.Service {
        constructor() {
            super(...arguments);
            this.processMap = {};
            this._exportedMethods = [
                'createPDF',
                'initPool'
            ];
        }
        initPool() {
        }
        generatePDF(oid, record, options) {
            return __awaiter(this, void 0, void 0, function* () {
                sails.log.verbose("PDFService::Creating PDF for: " + oid);
                let datastreamService = RecordsService;
                let compatMode = false;
                if (_.isEmpty(sails.config.record) || _.isEmpty(sails.config.record.datastreamService)) {
                    if (!_.isEmpty(datastreamService.addDatastream) && _.isFunction(datastreamService.addDatastream)) {
                        sails.log.warn(`PDFService::Plugin is guessing which DatastreamService to use, please set 'sails.config.record.datastreamService' explicitly or use the appropriate version of the PDF plugin.`);
                        compatMode = true;
                    }
                    else {
                        sails.log.error(`PDFService::Failed to retrieve datastream service name, please set 'sails.config.storage.serviceName'`);
                        return;
                    }
                }
                else {
                    sails.log.verbose(`PDFService::Using datastreamService: ${sails.config.record.datastreamService}`);
                    datastreamService = sails.services[sails.config.record.datastreamService];
                    if (_.isUndefined(datastreamService)) {
                        sails.log.error(`PDFService::Could not find service!`);
                        return;
                    }
                }
                const token = options['token'] ? options['token'] : undefined;
                if (token == undefined) {
                    sails.log.warn("PDFService::API token for PDF generation is not set. Skipping generation: " + oid);
                    return;
                }
                sails.log.verbose(`PDFService::Acquiring browser from pool....`);
                const tmpUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfgen'));
                const browser = yield puppeteer_1.launch({ executablePath: options['chrome_path'] ? options['chrome_path'] : '/usr/bin/google-chrome-stable', headless: true, args: ['--no-sandbox', `--user-data-dir=${tmpUserDataDir}`] });
                sails.log.verbose(`PDFService::Creating new page....`);
                const page = yield browser.newPage();
                page.setExtraHTTPHeaders({
                    Authorization: 'Bearer ' + token
                });
                if (_.get(sails.config, 'pdfgen.enableChromeLogging') == 'true') {
                    page.on('console', msg => sails.log.verbose(`PDFService::Chrome Console:${msg.text}`));
                    page.on('pageerror', error => {
                        sails.log.error(`PDFService::Chrome Page Error: ${error.message}`);
                    });
                    page.on('response', response => {
                        sails.log.verbose(`PDFService::Chrome Response: ${response.status}, URL:${response.url}`);
                    });
                    page.on('requestfailed', request => {
                        sails.log.error(`PDFService::Chrome Error: ${request.failure().errorText}, URL: ${request.url}`);
                    });
                }
                let sourceUrlBase = options['sourceUrlBase'] || '/default/rdmp/record/view';
                let pdfgenAppUrlOverride = _.get(sails.config, 'pdfgen.appUrlOverride');
                sails.log.verbose('PDFService::sourceUrlBase ' + sourceUrlBase);
                sails.log.verbose('PDFService::sails.config.pdfgen.appUrlOverride ' + pdfgenAppUrlOverride);
                let baseUrl = pdfgenAppUrlOverride || sails.config.appUrl;
                let currentURL = `${baseUrl}${sourceUrlBase}/${oid}`;
                this.processMap[currentURL] = true;
                sails.log.debug(`PDFService::Chromium loading page: ${currentURL}`);
                yield page.goto(currentURL);
                try {
                    yield page.waitForSelector(options['waitForSelector'], { timeout: 60000 });
                    sails.log.verbose(`PDFService::loaded page: ${currentURL}, waiting further...`);
                    yield this.delay(1500);
                    const date = moment().format('x');
                    const pdfPrefix = options['pdfPrefix'];
                    const fileId = `${pdfPrefix}-${oid}-${date}.pdf`;
                    const targetDir = sails.config.record.attachments.stageDir;
                    sails.log.verbose(`PDFService::Checking target dir: ${targetDir}`);
                    yield fs.ensureDir(targetDir);
                    sails.log.verbose(`PDFService::Printing PDF for ${oid}`);
                    const fpath = `${sails.config.record.attachments.stageDir}/${fileId}`;
                    let defaultPDFOptions = {
                        path: fpath,
                        format: 'A4',
                        printBackground: true
                    };
                    if (options['PDFOptions']) {
                        delete options['PDFOptions']['path'];
                        defaultPDFOptions = _.merge(defaultPDFOptions, options['PDFOptions']);
                    }
                    yield page.pdf(defaultPDFOptions);
                    sails.log.debug(`PDFService::Generated PDF at ${sails.config.record.attachments.stageDir}/${fileId} `);
                    yield page.close();
                    yield browser.close();
                    sails.log.verbose(`PDFService::Saving PDF: ${oid}`);
                    let savedPdfResponse = null;
                    if (compatMode) {
                        savedPdfResponse = yield datastreamService.addDatastream(oid, fileId);
                    }
                    else {
                        const datastream = new redbox_core_types_1.Datastream({ fileId: fileId, name: fileId });
                        savedPdfResponse = yield datastreamService.addDatastream(oid, datastream);
                    }
                    sails.log.debug(`PDFService::Saved PDF to storage: ${oid}`);
                    _.unset(this.processMap[currentURL]);
                }
                catch (e) {
                    sails.log.error(`PDFService::Error encountered while generating the PDF: ${oid}`);
                    sails.log.error(e);
                    sails.log.error(JSON.stringify(e));
                    try {
                        yield browser.close();
                    }
                    catch (e) {
                        sails.log.error(`PDFService:: Failed to close browser after error`);
                        sails.log.error(e);
                    }
                }
                finally {
                    if (browser && browser.process() != null) {
                        browser.process().kill('SIGTERM');
                    }
                    fs.removeSync(tmpUserDataDir, { recursive: true });
                }
                return record;
            });
        }
        createPDF(oid, record, options, user) {
            return Rx_1.Observable.fromPromise(this.generatePDF(oid, record, options));
        }
        delay(time) {
            return new Promise(function (resolve) {
                setTimeout(resolve, time);
            });
        }
    }
    Services.PDF = PDF;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.PDF().exports();
