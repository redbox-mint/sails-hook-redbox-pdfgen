import { expect } from 'chai';
import { Effect } from 'effect';
import { createRequire } from 'node:module';
import * as sinon from 'sinon';

declare var global: any;

const require = createRequire(import.meta.url);

describe('PDFService Unit Tests', () => {
    let pdfService: any;
    let mockPage: any;
    let mockBrowser: any;
    let storageDiskPutStub: sinon.SinonStub;
    let addDatastreamStub: sinon.SinonStub;

    beforeEach(function () {
        this.timeout(10000);
        storageDiskPutStub = sinon.stub().resolves();
        addDatastreamStub = sinon.stub().resolves({});

        global.sails = {
            log: {
                verbose: sinon.stub(),
                debug: sinon.stub(),
                info: sinon.stub(),
                warn: sinon.stub(),
                error: sinon.stub()
            },
            services: {
                storagemanagerservice: {
                    stagingDisk: () => ({
                        put: storageDiskPutStub
                    })
                },
                standarddatastreamservice: {
                    addDatastream: addDatastreamStub
                }
            },
            config: {
                appUrl: 'http://localhost:1500',
                brandingAware: () => ({
                    pdfgen: {
                        token: 'test-token'
                    }
                }),
                record: {
                    datastreamService: 'standarddatastreamservice',
                    attachments: {
                        stageDir: '/tmp'
                    }
                }
            }
        };

        global.BrandingService = {
            getBrandById: sinon.stub().returns({ name: 'default' })
        };
        global.StorageManagerService = global.sails.services.storagemanagerservice;
        global._ = require('lodash');

        const compiledServicePath = require.resolve('../../dist/api/services/PDFService.js');
        delete require.cache[compiledServicePath];
        const compiledService = require(compiledServicePath);
        pdfService = new compiledService.Services.PDF();
        pdfService.DatastreamService = global.sails.services.standarddatastreamservice;

        mockPage = {
            setExtraHTTPHeaders: sinon.stub(),
            on: sinon.stub(),
            goto: sinon.stub().resolves(),
            waitForNetworkIdle: sinon.stub().resolves(),
            waitForSelector: sinon.stub().resolves(),
            waitForFunction: sinon.stub().resolves(),
            pdf: sinon.stub().resolves(Buffer.from('mock pdf')),
            close: sinon.stub().resolves()
        };

        mockBrowser = {
            newPage: sinon.stub().resolves(mockPage),
            close: sinon.stub().resolves(),
            process: () => ({ kill: sinon.stub() })
        };

        const puppeteer = require('puppeteer');
        sinon.stub(puppeteer, 'launch').resolves(mockBrowser);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should fail fast if required services are missing', async () => {
        delete global.sails.services.storagemanagerservice;
        delete global.StorageManagerService;

        const service: any = pdfService;
        const exit = await Effect.runPromiseExit(service.generatePDF('oid-1', { metaMetadata: { brandId: 1 } }, {}));

        expect(exit._tag).to.equal('Failure');
        expect((exit as any).cause).to.exist;
    });

    it('should fall back to networkIdle strategy if unknown strategy provided', async () => {
        const record = { metaMetadata: { brandId: 1 } };
        const options = { readinessStrategy: 'invalidStrategy' };

        const service: any = pdfService;
        await Effect.runPromise(service.generatePDF('oid-1', record, options));

        expect(mockPage.waitForNetworkIdle.called).to.be.true;
        expect(global.sails.log.warn.calledWithMatch(/Unknown readinessStrategy/)).to.be.true;
    });

    it('should use selector strategy', async () => {
        const record = { metaMetadata: { brandId: 1 } };
        const options = {
            readinessStrategy: 'selector',
            waitForSelector: '#ready'
        };

        const service: any = pdfService;
        await Effect.runPromise(service.generatePDF('oid-1', record, options));

        expect(mockPage.waitForSelector.calledWith('#ready')).to.be.true;
        expect(mockPage.waitForNetworkIdle.called).to.be.false;
    });

    it('should use jsFlag strategy', async () => {
        const record = { metaMetadata: { brandId: 1 } };
        const options = {
            readinessStrategy: 'jsFlag',
            waitForFunction: 'window.isReady === true'
        };

        const service: any = pdfService;
        await Effect.runPromise(service.generatePDF('oid-1', record, options));

        expect(mockPage.waitForFunction.calledWith('window.isReady === true')).to.be.true;
    });

    it('should retry transient failures in the blocking effect', async () => {
        const record = { metaMetadata: { brandId: 1 } };
        const options = {
            retryDelayMs: 10
        };

        mockPage.goto.onFirstCall().rejects(new Error('Navigation timeout'));
        mockPage.goto.onSecondCall().resolves();

        const service: any = pdfService;
        await Effect.runPromise(service.generatePDF('oid-1', record, options));

        expect(mockPage.goto.calledTwice).to.be.true;
    });

    it('should stop retrying beyond maxRetries', async () => {
        const record = { metaMetadata: { brandId: 1 } };
        const options = {
            maxRetries: 1,
            retryDelayMs: 1
        };

        mockPage.goto.rejects(new Error('Navigation timeout'));

        const service: any = pdfService;
        const exit = await Effect.runPromiseExit(service.generatePDF('oid-1', record, options));

        expect(exit._tag).to.equal('Failure');
        expect(mockPage.goto.callCount).to.equal(2);
    });

    it('should return the record immediately from createPDF and schedule background retries', async () => {
        const record = { metaMetadata: { brandId: 1 } };
        const options = {
            maxRetries: 1,
            retryDelayMs: 10
        };

        mockPage.goto.onFirstCall().rejects(new Error('Navigation timeout'));
        mockPage.goto.onSecondCall().resolves();

        const observable = pdfService.createPDF('oid-1', record, options, {});
        const result = await new Promise((resolve, reject) => {
            observable.subscribe({ next: resolve, error: reject });
        });

        expect(result).to.equal(record);
        expect(mockPage.goto.callCount).to.equal(1);

        await new Promise((resolve) => setTimeout(resolve, 30));

        expect(mockPage.goto.callCount).to.equal(2);
        expect(global.sails.log.warn.calledWithMatch(/Retry scheduled: true/)).to.be.true;
    });
});
