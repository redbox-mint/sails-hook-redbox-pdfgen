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
exports.launch = void 0;
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const vm = require("vm");
const Module = require('module');
const packageFile = require.resolve('puppeteer/package.json');
const packageInfo = require(packageFile);
if (packageInfo.version !== '10.4.0') {
    throw new Error('PDFService requires Puppeteer 10.4.0 for its lifecycle hotfix');
}
const launcherFile = require.resolve('puppeteer/lib/cjs/puppeteer/node/Launcher.js');
const runnerFile = require.resolve('puppeteer/lib/cjs/puppeteer/node/BrowserRunner.js');
const expected = [
    [launcherFile, 'a29e4a32d565c12c70a201da3fb9551616b801460e7517a31943f683b98dff03'],
    [runnerFile, 'fb176c7975a24fcdc3ba86005c5705d971d70b83008b0fcc09a3cab5fd913209']
];
for (const [filename, hash] of expected) {
    if (crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex') !== hash) {
        throw new Error('PDFService lifecycle hotfix requires the unmodified Puppeteer 10.4.0 launcher and runner');
    }
}
const { BrowserRunner } = require(runnerFile);
const { helper } = require('puppeteer/lib/cjs/puppeteer/common/helper.js');
const launcherRequire = Module.createRequire(launcherFile);
const loadLauncher = vm.runInThisContext(Module.wrap(fs.readFileSync(launcherFile, 'utf8')), { filename: launcherFile });
function bounded(promise) {
    let timer;
    const deadline = new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('PDFService browser cleanup did not complete within 5000 ms')), 5000);
    });
    return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}
function launch(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let runner;
        class ManagedRunner extends BrowserRunner {
            constructor(...args) {
                super(...args);
                this.groupClosed = false;
                runner = this;
                this.profile = this._tempDirectory;
                this._tempDirectory = null;
            }
            start(startOptions) {
                try {
                    super.start(startOptions);
                    this._processClosing = new Promise((resolve, reject) => {
                        this.proc.once('close', () => {
                            this.groupClosed = true;
                            helper.removeEventListeners(this._listeners);
                            (this.profile ? fs.remove(this.profile) : Promise.resolve()).then(resolve, reject);
                        });
                    });
                }
                catch (error) {
                    this._processClosing = this.profile ? fs.remove(this.profile) : Promise.resolve();
                    this._processClosing.catch(() => { });
                    throw error;
                }
                this._processClosing.catch(() => { });
            }
            kill() {
                try {
                    if (this.proc && this.proc.pid && !this.groupClosed) {
                        if (process.platform === 'win32') {
                            this.proc.kill('SIGKILL');
                        }
                        else {
                            process.kill(-this.proc.pid, 'SIGKILL');
                        }
                    }
                }
                catch (error) {
                    if (error.code !== 'ESRCH')
                        this.cleanupError = error;
                }
                finally {
                    helper.removeEventListeners(this._listeners);
                }
            }
            waitForCleanup() {
                return __awaiter(this, void 0, void 0, function* () {
                    yield bounded(this._processClosing || Promise.resolve());
                    if (this.cleanupError)
                        throw this.cleanupError;
                });
            }
            close() {
                const _super = Object.create(null, {
                    close: { get: () => super.close }
                });
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        yield bounded(_super.close.call(this));
                    }
                    catch (error) {
                        this.kill();
                    }
                    yield this.waitForCleanup();
                });
            }
        }
        const isolated = { exports: {} };
        loadLauncher(isolated.exports, name => name === './BrowserRunner.js' ? { BrowserRunner: ManagedRunner } : launcherRequire(name), isolated, launcherFile, path.dirname(launcherFile));
        const launcher = isolated.exports.default(path.dirname(packageFile), '901912', false, 'chrome');
        try {
            return yield launcher.launch(options);
        }
        catch (error) {
            if (runner) {
                runner.kill();
                try {
                    yield runner.waitForCleanup();
                }
                catch (cleanupError) {
                    console.error('PDFService::Browser cleanup failed after launch error', cleanupError);
                }
            }
            throw error;
        }
    });
}
exports.launch = launch;
