import fs from "fs-extra";
import os from "os";
import path from "path";

import puppeteer from "puppeteer";
import { expect } from 'chai';

const host = 'localhost';
const port = 1500;
const tmpDir = path.join(os.tmpdir(), 'pdfgen-mocha');

let browser;
let tempDataDir;


// copy screenshots: docker compose -f support/test/docker-compose.mocha.yml cp mocha:/opt/sails-hook-redbox-pdfgen/test/screenshots ./test/screenshots

describe("Sails hook redbox pdfgen", function () {

  const redboxHomeUrl = `http://${host}:${port}`

  before(async () => {
    await fs.mkdtemp(tmpDir);
    browser = await puppeteer.launch({
      headless: 'shell',
      args: ['--no-sandbox', `--user-data-dir=${tempDataDir}`]
    });
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
    if (tempDataDir) {
      await fs.remove(tmpDir, {recursive: true});
    }
  })


  it("Generate pdf export", async () => {
    const page = await browser.newPage();
    await page.goto(redboxHomeUrl);

    await page.screenshot({path: 'test/screenshots/01-home-load.png'});
    expect(page.url()).to.equal(`http://${host}:${port}/default/rdmp/home`);

    // set page size
    await page.setViewport({width: 1080, height: 1024});

    console.info("click on 'Proceed to the dashboard'");
    await page.click('.main > a:nth-child(2)');
    await page.screenshot({path: 'test/screenshots/02-load-login.png'});
    expect(page.url()).to.equal(`http://${host}:${port}/default/rdmp/user/login`);

    console.info("show the admin login");
    await page.waitForSelector('#adminLoginLink', {visible: true});
    await page.click('#adminLoginLink');
    await page.screenshot({path: 'test/screenshots/03-show-admin.png'});

    console.info("fill in the user & pass");
    await page.waitForSelector('#adminLogin #username', {visible: true});
    await page.type('#adminLogin #username', 'admin');
    await page.$eval('#adminLogin #username', e => e.blur());
    expect(await page.$eval('#adminLogin #username', el => el.value)).to.equal('admin');
    await page.screenshot({path: 'test/screenshots/04-after-username.png'});

    await page.type('#adminLogin #password', 'rbadmin');
    expect(await page.$eval('#adminLogin #password', el => el.value)).to.equal('rbadmin');
    // blur the focus on the password, so the validation runs
    await page.$eval('#adminLogin #password', e => e.blur());
    await page.screenshot({path: 'test/screenshots/05-after-password.png'});

    console.info("click the button to login");
    await page.click('#adminLogin button[type="submit"]');
    await page.waitForSelector('#adminLoginLink', {visible: true});
    expect(await page.$eval('#adminLogin div.alert-danger', el => el.textContent)).to.equal(' Please provide a password. ');
    await page.screenshot({path: 'test/screenshots/06-after-login.png'});
    const navItems = await page.$$('#navbarSupportedContent > ul > li');
    expect(navItems.length).to.equal(7);

    // await page.waitForSelector('#adminLogin div.alert-danger', {hidden: true});
    // await page.waitForSelector('#adminLoginLink', {visible: true});

    expect(page.url()).to.equal(`http://${host}:${port}/default/rdmp/user/login`);

    // click on 'Plan'

    // await navItems[1].click();
    console.log(await page.cookies());
    const rdmpEditResponse = await page.goto(`http://${host}:${port}/default/rdmp/record/rdmp/edit`);
    console.log(rdmpEditResponse.request().redirectChain()[0].url());

    expect(page.url()).to.equal(`http://${host}:${port}/default/rdmp/record/rdmp/edit`);

    // cLick on 'Create RDMP'
    await page.click('#navbarSupportedContent li.dropdown:nth-child(2) > ul.show > li:nth-child(1) > a:nth-child(1)');
    expect(page.url()).to.equal(`http://${host}:${port}/default/rdmp/record/rdmp/edit`);
    expect(page.title()).to.equal('ReDBox - RDMP - Create RDMP');

    done();

  }).timeout(5000);
});
