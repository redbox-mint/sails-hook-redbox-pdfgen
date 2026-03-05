import { expect } from 'chai';
import * as sinon from 'sinon';
import { Services } from '../PDFService';

declare var sails: any;
declare var BrandingService: any;
declare var global: any;

describe('PDFService Unit Tests', () => {
    let pdfService: any;
    let mockPage: any;
    let mockBrowser: any;
    let launchStub: sinon.SinonStub;
    let storageDiskPutStub: sinon.SinonStub;

    beforeEach(() => {
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
                    addDatastream: sinon.stub().resolves({})
                }
            },
            config: {
                appUrl: 'http://localhost:1500',
                brandingAware: (brand: string) => ({
                    pdfgen: {
                        token: 'test-token'
                    }
                }),
                record: {
                    attachments: {
                        stageDir: '/tmp'
                    }
                }
            }
        };

        global.BrandingService = {
            getBrandById: sinon.stub().returns({ name: 'default' })
        };

        global._ = require('lodash');

        // Compile output keeps the Services namespace on exports for direct construction in tests.
        const fs = require('fs');
        const vm = require('vm');
        const code = fs.readFileSync(__dirname + '/../../../../dist/api/services/PDFService.js', 'utf8');
        const sandbox = { ...global, exports: {}, module: {}, require: require, sails: global.sails, Buffer: Buffer, setTimeout: setTimeout, clearTimeout: clearTimeout };
        vm.createContext(sandbox);
        vm.runInContext(code, sandbox);
        
        pdfService = new sandbox.exports.Services.PDF();

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
        launchStub = sinon.stub(puppeteer, 'launch').resolves(mockBrowser);
        storageDiskPutStub = sinon.stub().resolves();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should fail fast if required services are missing', async () => {
        delete global.sails.services['storagemanagerservice'];
        
        let errorCaught = false;
        try {
            await pdfService.generatePDF('oid-1', { metaMetadata: { brandId: 1 } }, {}).catch(() => {});
            // Actually it resolves but with success: false
            const res = await pdfService.generatePDF('oid-1', { metaMetadata: { brandId: 1 } }, {});
            expect(res.success).to.be.false;
            expect(res.reason).to.contain('Required services missing');
        } catch(e) {
            errorCaught = true;
        }
    });

    it('should fall back to networkIdle strategy if unknown strategy provided', async () => {
        const record = { metaMetadata: { brandId: 1 } };
        const options = { readinessStrategy: 'invalidStrategy' };

        // Need to use any to access private methods in tests
        const service: any = pdfService;
        const result = await service.generatePDF('oid-1', record, options);
        expect(result.success).to.be.true;
        
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
        const result = await service.generatePDF('oid-1', record, options);
        expect(result.success).to.be.true;
        
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
        const result = await service.generatePDF('oid-1', record, options);
        expect(result.success).to.be.true;
        
        expect(mockPage.waitForFunction.calledWith('window.isReady === true')).to.be.true;
    });

    it('should schedule retry on transient failure', async () => {
        const record = { metaMetadata: { brandId: 1 } };
        const options = { 
            retryDelayMs: 10 // small delay for test
        };

        // Make page.goto fail on first try, succeed on second
        mockPage.goto.onFirstCall().rejects(new Error('Navigation timeout'));
        mockPage.goto.onSecondCall().resolves();

        const service: any = pdfService;
        const result = await service.generatePDF('oid-1', record, options);
        
        expect(result.success).to.be.false;
        expect(result.retryScheduled).to.be.true;
        expect(global.sails.log.warn.calledWithMatch(/Scheduling retry/)).to.be.true;
    });

    it('should not retry beyond maxRetries', async () => {
        const record = { metaMetadata: { brandId: 1 } };
        const options = { 
            maxRetries: 1
        };

        mockPage.goto.rejects(new Error('Navigation timeout'));

        const service: any = pdfService;

        // simulate first call
        const result = await service.generatePDF('oid-1', record, options, 1);
        expect(result.success).to.be.false;
        expect(result.retryScheduled).to.be.true;

        // simulate second call (retry 2, max 1)
        const result2 = await service.generatePDF('oid-1', record, options, 2);
        expect(result2.success).to.be.false;
        expect(result2.retryScheduled).to.be.false;
        expect(global.sails.log.error.calledWithMatch(/Max retries exhausted/)).to.be.true;
    });

});
