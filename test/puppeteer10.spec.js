const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const upstream = require('puppeteer');
const managed = require('../lib/Puppeteer10');
const runnerPrototype = require('puppeteer/lib/cjs/puppeteer/node/BrowserRunner.js').BrowserRunner.prototype;
const originalKill = runnerPrototype.kill;
const originalLaunch = upstream.launch;
const fixture = path.join(__dirname, 'fixtures/profile-writer.cjs');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('Puppeteer 10 profile cleanup race', function () {
  this.timeout(10000);
  let scratch;
  const reports = [];
  beforeEach(function () { scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-race-test-')); });
  afterEach(function () {
    for (const report of reports.splice(0)) {
      if (!fs.existsSync(report)) continue;
      const { parent, profile } = JSON.parse(fs.readFileSync(report));
      try { process.kill(-parent, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
      require('fs-extra').removeSync(profile);
    }
    require('fs-extra').removeSync(scratch);
  });

  async function timeout(launcher, name, extraArgs = []) {
    const report = path.join(scratch, name + '.json');
    reports.push(report);
    await assert.rejects(launcher.launch({
      executablePath: process.execPath, ignoreDefaultArgs: true,
      args: [fixture, report, ...extraArgs], timeout: 200
    }), error => error.message.includes('Timed out after 200 ms'));
    assert(fs.existsSync(report), 'fixture must start before timeout');
    return JSON.parse(fs.readFileSync(report));
  }

  it('demonstrates that the original runner allows a child to recreate its deleted profile', async function () {
    const { profile } = await timeout(upstream, 'control');
    const marker = path.join(profile, 'late-writer');
    const until = Date.now() + 2500;
    while (!fs.existsSync(marker) && Date.now() < until) await pause(10);
    assert(fs.existsSync(marker), 'original race must reproduce in the control');
  });

  it('stops the child tree before deleting the profile and returning the launch error', async function () {
    const { profile } = await timeout(managed, 'managed');
    assert(!fs.existsSync(profile), 'profile must already be removed when launch rejects');
    await pause(100);
    assert(!fs.existsSync(profile), 'a surviving child must not recreate the profile');
  });

  it('isolates cleanup for two simultaneous launch failures', async function () {
    const outcomes = await Promise.all([timeout(managed, 'first'), timeout(managed, 'second')]);
    assert.notStrictEqual(outcomes[0].profile, outcomes[1].profile);
    for (const { profile } of outcomes) assert(!fs.existsSync(profile));
    await pause(100);
    for (const { profile } of outcomes) assert(!fs.existsSync(profile));
  });

  it('preserves an explicit caller-owned profile', async function () {
    const profile = path.join(scratch, 'caller-profile');
    fs.mkdirSync(profile);
    fs.writeFileSync(path.join(profile, 'keep'), 'synthetic');
    await timeout(managed, 'caller-owned', [`--user-data-dir=${profile}`]);
    assert.strictEqual(fs.readFileSync(path.join(profile, 'keep'), 'utf8'), 'synthetic');
  });

  it('cleans up a failed spawn that never emits a process exit event', async function () {
    const profiles = () => fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('puppeteer_dev_chrome_profile-')).sort();
    const before = profiles();
    await assert.rejects(managed.launch({ executablePath: path.join(scratch, 'does-not-exist') }), /Failed to launch the browser process/);
    assert.deepStrictEqual(profiles(), before);
  });

  it('leaves the shared Puppeteer launcher and runner prototype unchanged', async function () {
    await timeout(managed, 'isolated-module');
    assert.strictEqual(upstream.launch, originalLaunch);
    assert.strictEqual(runnerPrototype.kill, originalKill);
  });
});
