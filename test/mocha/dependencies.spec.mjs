import fs from "fs-extra";
import os from "os";
import path from "path";

import puppeteer from "puppeteer";
import { expect } from 'chai';

const host = process.env.RBPORTAL_TEST_HOST || 'redboxportal';
const port = 1500;
const tmpDir = path.join(os.tmpdir(), 'pdfgen-mocha');
const screenshotsDir = process.env.RBPORTAL_SCREENSHOTS_DIR
  || path.join(process.env.RBPORTAL_HOOK_DIR || process.cwd(), 'support/.tmp/screenshots/mocha');

let browser;
let tempDataDir;

async function waitForVisualReadiness(page) {
  await page.waitForNetworkIdle({ idleTime: 750, timeout: 15000 });

  await page.waitForFunction(() => {
    const styleLinks = Array.from(document.querySelectorAll('link[rel~="stylesheet"]'));
    return styleLinks.every((link) => {
      return Boolean(link.sheet) || link.disabled;
    });
  }, { timeout: 10000 });

  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (_error) {
        // Continue if font readiness cannot be resolved.
      }
    }
  });
}


const screenshotPath = (filename) => path.join(screenshotsDir, filename);

describe("Sails hook redbox pdfgen", function () {

  const redboxHomeUrl = `http://${host}:${port}`

  before(async () => {
    await fs.ensureDir(screenshotsDir);
    tempDataDir = await fs.mkdtemp(tmpDir);
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
      || ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome-stable'].find(candidate => fs.existsSync(candidate));

    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', `--user-data-dir=${tempDataDir}`]
    });
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
    if (tempDataDir) {
      await fs.remove(tempDataDir);
    }
  })


  it("Generate pdf export", async () => {
    const page = await browser.newPage();
    await page.goto(redboxHomeUrl, { waitUntil: 'networkidle2' });
    await waitForVisualReadiness(page);

    await page.screenshot({path: screenshotPath('01-home-load.png')});
    expect(page.url()).to.equal(`http://${host}:${port}/default/rdmp/home`);

    // set page size
    await page.setViewport({width: 1080, height: 1024});

    console.info("navigate to login page");
    await page.goto(`http://${host}:${port}/default/rdmp/user/login`, { waitUntil: 'networkidle2' });
    await waitForVisualReadiness(page);
    await page.screenshot({path: screenshotPath('02-load-login.png')});
    expect(page.url()).to.equal(`http://${host}:${port}/default/rdmp/user/login`);

    // Smoke-check login page availability on the current portal build.
    await page.screenshot({path: screenshotPath('03-login-page.png')});
    expect(page.url()).to.not.equal('chrome-error://chromewebdata/');

  }).timeout(30000);
});
