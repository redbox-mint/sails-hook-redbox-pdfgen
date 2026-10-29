const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const loadPDFService = require('./helpers/pdf-service');

describe('PDFService browser lifecycle (1.2.x)', function () {
  let scratch;
  beforeEach(function () { scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfgen-test-')); });
  afterEach(function () { require('fs-extra').removeSync(scratch); });

  function fixture(failure, cleanupFailure) {
    const error = new Error(`injected ${failure}`);
    const events = [];
    let headersReady = false;
    function fail(boundary) { events.push(boundary); if (failure === boundary) throw error; }
    const page = {
      async setExtraHTTPHeaders(headers) {
        // Reject asynchronously to catch the old unawaited header promise.
        if (failure === 'headers') await new Promise(resolve => setImmediate(resolve));
        fail('headers');
        assert.strictEqual(headers.Authorization, 'Bearer synthetic-token');
        headersReady = true;
      },
      async goto() { fail('navigation'); assert(headersReady, 'navigation must await authentication headers'); },
      async waitForSelector() { fail('selector'); },
      async pdf(options) { fail('render'); fs.writeFileSync(options.path, '%PDF-1.4\n'); },
      async close() { fail('page-close'); },
      on() {}
    };
    const browser = {
      async newPage() { fail('new-page'); return page; },
      async close() { events.push('browser-close'); if (cleanupFailure === 'close') throw new Error('injected close failure'); },
      process() { return { kill() { events.push('kill'); if (cleanupFailure === 'kill') throw new Error('injected kill failure'); } }; }
    };
    const service = loadPDFService({
      stageDir: scratch, tmpdir: scratch,
      async launch(options) {
        fail('launch');
        return browser;
      },
      async addDatastream(oid, datastream) {
        fail('upload');
        assert.match(oid, /^synthetic-rmp(?:-\d+)?$/);
        assert(fs.existsSync(path.join(scratch, datastream.fileId)));
        assert.match(datastream.fileId, /^test-synthetic-rmp(?:-\d+)?-\d+\.pdf$/);
      }
    });
    return { service, error, events };
  }

  async function generate(service, record = {}, oid = 'synthetic-rmp') {
    return service.createPDF(oid, record, {
      token: 'synthetic-token', waitForSelector: '#ready', pdfPrefix: 'test'
    }).toPromise();
  }

  it('returns the record after rendering/upload and releases the browser and tracking entry', async function () {
    const { service, events } = fixture();
    const record = { metadata: { title: 'Synthetic' } };
    assert.strictEqual(await generate(service, record), record);
    assert(events.includes('upload'));
    assert(events.includes('browser-close'));
    assert.deepStrictEqual(Object.keys(service.processMap), []);
  });

  for (const boundary of ['launch', 'new-page', 'headers', 'navigation', 'selector', 'render', 'page-close', 'upload']) {
    it(`rejects ${boundary} failures and cleans up acquired resources`, async function () {
      const { service, error, events } = fixture(boundary);
      const unhandled = [];
      const listener = e => unhandled.push(e);
      process.on('unhandledRejection', listener);
      try {
        await assert.rejects(generate(service), e => e === error);
        await new Promise(resolve => setImmediate(resolve));
        assert.deepStrictEqual(unhandled, [], 'header failures must be awaited');
        assert.deepStrictEqual(Object.keys(service.processMap), []);
        assert.deepStrictEqual(fs.readdirSync(scratch).filter(name => name.startsWith('pdfgen')), []);
        if (boundary !== 'launch') assert(events.includes('browser-close'), 'acquired browser must be closed');
        else assert(!events.includes('browser-close'));
        if (boundary !== 'upload') assert(!events.includes('upload'), 'failed render must never upload');
      } finally {
        process.removeListener('unhandledRejection', listener);
      }
    });
  }

  for (const cleanupFailure of ['close', 'kill']) {
    it(`preserves the navigation error and clears tracking if ${cleanupFailure} cleanup fails`, async function () {
      const { service, error, events } = fixture('navigation', cleanupFailure);
      await assert.rejects(generate(service), e => e === error);
      assert(events.includes('kill'), 'termination must still be attempted');
      assert.deepStrictEqual(Object.keys(service.processMap), []);
    });
  }

  it('does not retain URL entries across successful PDFs for different records', async function () {
    const { service } = fixture();
    for (let i = 0; i < 3; i++) await generate(service, {}, `synthetic-rmp-${i}`);
    assert.deepStrictEqual(Object.keys(service.processMap), []);
  });
});
