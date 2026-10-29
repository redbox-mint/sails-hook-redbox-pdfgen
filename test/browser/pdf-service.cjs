// Actual Puppeteer/Chrome from UTS; no Sails lift, records, network egress or S3.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const puppeteer = require('puppeteer');
const managedPuppeteer = require('../../lib/Puppeteer10');
const loadPDFService = require('../helpers/pdf-service');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const browsers = new Set();
const results = [];
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-browser-test-'));
const launchTimeoutMs = Number(process.env.PDFGEN_LAUNCH_TIMEOUT_MS || 100);
assert(Number.isInteger(launchTimeoutMs) && launchTimeoutMs >= 100 && launchTimeoutMs <= 5000);
const launchRepeats = Number(process.env.PDFGEN_LAUNCH_REPEATS || 20);
assert(Number.isInteger(launchRepeats) && launchRepeats >= 1 && launchRepeats <= 20);

function resources() {
  let chromium = 0, childPssBytes = 0;
  for (const pid of fs.readdirSync('/proc').filter(name => /^\d+$/.test(name))) {
    try {
      if (!/chrome|chromium/.test(fs.readFileSync(`/proc/${pid}/comm`, 'utf8'))) continue;
      const status = fs.readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8');
      chromium++;
      childPssBytes += Number(status.match(/^Pss:\s+(\d+)/m)?.[1] || 0) * 1024;
    } catch { /* A child can exit between reads. */ }
  }
  const profiles = fs.readdirSync(os.tmpdir()).filter(name => /^pdfgen[A-Za-z0-9]{6}$|^puppeteer_dev_chrome_profile-/.test(name));
  return { chromium, childPssBytes, profiles: profiles.length };
}

async function settledResources() {
  // Puppeteer 10's kill/profile cleanup runs asynchronously on process exit.
  const until = Date.now() + 2000;
  let current;
  do {
    await pause(25);
    current = resources();
    if (current.chromium === 0 && current.profiles === 0) return current;
  } while (Date.now() < until);
  return current;
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end('<!doctype html><html><body><div id="ready">Synthetic PDF</div></body></html>');
});

async function scenario(failure, repeats) {
  let launches = 0, uploads = 0;
  const stageDir = path.join(scratch, failure);
  fs.mkdirSync(stageDir);
  const shim = path.join(scratch, 'stalled-browser.sh');
  // /tmp is noexec. Launch through /bin/sh; withhold DevTools so BrowserRunner
  // hits its real connection timeout while an actual Chrome process starts.
  fs.writeFileSync(shim, '#!/bin/sh\nprofile=\nfor arg do\n case "$arg" in --user-data-dir=*) profile="$arg";; esac\ndone\nexec /usr/bin/google-chrome-stable --headless --no-sandbox --disable-dev-shm-usage "$profile" about:blank\n');
  const service = loadPDFService({
    stageDir,
    appUrl: failure === 'navigation' ? 'http://127.0.0.1:1' : `http://127.0.0.1:${server.address().port}`,
    async launch(options) {
      launches++;
      if (failure === 'launch') {
        return managedPuppeteer.launch({ ...options, executablePath: '/bin/sh', ignoreDefaultArgs: true,
          args: [shim, ...options.args], timeout: launchTimeoutMs });
      }
      const browser = await managedPuppeteer.launch({ ...options,
        args: [...options.args, '--disable-dev-shm-usage'], timeout: 10000 });
      browsers.add(browser);
      browser.once('disconnected', () => browsers.delete(browser));
      return browser;
    },
    async addDatastream(oid, datastream) {
      uploads++;
      const file = fs.readFileSync(path.join(stageDir, datastream.fileId));
      assert.equal(file.subarray(0, 5).toString(), '%PDF-');
    }
  });
  for (let i = 0; i < repeats; i++) {
    const record = { metadata: { title: 'Synthetic PDF' } };
    const promise = service.createPDF('synthetic-rmp', record, {
      token: 'synthetic-token', waitForSelector: '#ready', pdfPrefix: 'test'
    }).toPromise();
    if (failure === 'none') assert.equal(await promise, record);
    else if (failure === 'launch') {
      await assert.rejects(promise, error => error.message.includes(`Timed out after ${launchTimeoutMs} ms`) && error.message.includes('r901912'));
      assert.equal(resources().profiles, 0, 'launch must await profile cleanup before rejecting');
    } else await assert.rejects(promise, /ERR_UNSAFE_PORT/);
  }
  const immediate = resources();
  const beforeSafetyCleanup = await settledResources();
  const result = { failure, repeats, launches, uploads, immediate, beforeSafetyCleanup,
    processMapEntries: Object.keys(service.processMap).length };
  results.push(result);
  assert.deepEqual(beforeSafetyCleanup, { chromium: 0, childPssBytes: 0, profiles: 0 }, 'resources retained before test cleanup');
  assert.equal(result.processMapEntries, 0);
  assert.equal(uploads, failure === 'none' ? repeats : 0);
  assert.equal(launches, repeats);
}

(async () => {
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    await scenario('none', 1);
    await scenario('navigation', 2);
    await scenario('launch', launchRepeats);
    console.log('PASS: actual Chrome success, navigation failures and revision-901912 launch timeouts');
  } finally {
    // Assertions and snapshots precede this safety cleanup.
    const capture = JSON.stringify({ puppeteer: require('puppeteer/package.json').version, launchTimeoutMs, results }, null, 2) + '\n';
    fs.writeFileSync('/artifacts/browser-results.json', capture);
    fs.writeFileSync(`/artifacts/browser-results-${launchTimeoutMs}ms.json`, capture);
    for (const browser of browsers) await browser.close().catch(() => browser.process()?.kill('SIGKILL'));
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(scratch, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
