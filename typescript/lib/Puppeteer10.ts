import fs = require('fs-extra');
import path = require('path');
import crypto = require('crypto');
import vm = require('vm');
const Module = require('module');

// Scope the legacy runner fix to this hook. Do not patch shared module exports,
// prototypes, the require cache or installed files in the portal's node_modules.
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

function bounded<T>(promise: Promise<T>): Promise<T> {
  let timer;
  const deadline = new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('PDFService browser cleanup did not complete within 5000 ms')), 5000);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

export async function launch(options: any) {
  let runner;
  class ManagedRunner extends BrowserRunner {
    private profile: string;
    private groupClosed = false;
    private cleanupError;

    constructor(...args: any[]) {
      super(...args);
      runner = this;
      this.profile = this._tempDirectory;
      // The original kill() deletes this directory before stopping Chrome, and
      // its exit listener runs before descendants release inherited pipes.
      this._tempDirectory = null;
    }

    start(startOptions) {
      try {
        super.start(startOptions);
        this._processClosing = new Promise<void>((resolve, reject) => {
          this.proc.once('close', () => {
            this.groupClosed = true;
            helper.removeEventListeners(this._listeners);
            // Only Puppeteer's own temporary profile belongs to this runner.
            // Never delete an explicit caller-supplied userDataDir.
            (this.profile ? fs.remove(this.profile) : Promise.resolve()).then(resolve, reject);
          });
        });
      } catch (error) {
        this._processClosing = this.profile ? fs.remove(this.profile) : Promise.resolve();
        this._processClosing.catch(() => {});
        throw error;
      }
      // A spawn error can reject cleanup before launch() reaches its catch.
      this._processClosing.catch(() => {});
    }

    kill() {
      try {
        if (this.proc && this.proc.pid && !this.groupClosed) {
          if (process.platform === 'win32') {
            this.proc.kill('SIGKILL');
          } else {
            // BrowserRunner.start uses detached:true on POSIX. Stop the owned
            // group, including workers that outlive the root browser process.
            process.kill(-this.proc.pid, 'SIGKILL');
          }
        }
      } catch (error) {
        if (error.code !== 'ESRCH') this.cleanupError = error;
      } finally {
        helper.removeEventListeners(this._listeners);
      }
    }

    async waitForCleanup() {
      await bounded(this._processClosing || Promise.resolve());
      if (this.cleanupError) throw this.cleanupError;
    }

    async close() {
      try {
        await bounded(super.close());
      } catch (error) {
        this.kill();
      }
      await this.waitForCleanup();
    }
  }

  // Evaluate the pinned launcher in its own CommonJS module, injecting this
  // call's runner. All other dependencies resolve normally from Puppeteer.
  const isolated = { exports: {} as any };
  loadLauncher(isolated.exports, name => name === './BrowserRunner.js' ? { BrowserRunner: ManagedRunner } : launcherRequire(name),
    isolated, launcherFile, path.dirname(launcherFile));
  const launcher = isolated.exports.default(path.dirname(packageFile), '901912', false, 'chrome');
  try {
    return await launcher.launch(options);
  } catch (error) {
    if (runner) {
      runner.kill();
      try {
        await runner.waitForCleanup();
      } catch (cleanupError) {
        // Preserve the original launch error, while reporting cleanup failures.
        console.error('PDFService::Browser cleanup failed after launch error', cleanupError);
      }
    }
    throw error;
  }
}
