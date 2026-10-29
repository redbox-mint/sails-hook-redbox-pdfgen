const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const work = fs.mkdtempSync('/tmp/pdfgen-build-');
for (const name of ['index.js', 'typescript', 'api', 'package.json', 'package-lock.json', 'tsconfig.json', 'test', 'README.md', '.npmignore', '.gitignore']) {
  fs.cpSync(path.join('/source', name), path.join(work, name), { recursive: true });
}
// Overlay the PDF package's private dependencies on its actual hoisted tree.
const modules = path.join(work, 'node_modules');
fs.mkdirSync(modules);
function linkTree(directory, destination, privatePackages = false) {
  for (const name of fs.readdirSync(directory)) {
    if (privatePackages && name === '.bin') continue;
    if (name.startsWith('@')) {
      fs.mkdirSync(path.join(destination, name), { recursive: true });
      linkTree(path.join(directory, name), path.join(destination, name), privatePackages);
    } else {
      const target = path.join(destination, name);
      if (fs.existsSync(target)) fs.unlinkSync(target);
      fs.symlinkSync(path.join(directory, name), target);
    }
  }
}
linkTree('/opt/redbox-portal/node_modules', modules);
linkTree('/opt/redbox-portal/node_modules/@researchdatabox/sails-hook-redbox-pdfgen/node_modules', modules, true);
function run(command, args) {
  const result = cp.spawnSync(command, args, { cwd: work, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run('npm', ['run', 'build', '--', '--skipLibCheck', '--types', 'node', '--typeRoots', '/opt/redbox-portal/node_modules/@types']);
if (['unit', 'all'].includes(process.argv[2])) run('npm', ['test']);
if (['browser', 'all'].includes(process.argv[2])) run('node', ['test/browser/pdf-service.cjs']);
if (['pack', 'all'].includes(process.argv[2])) run('npm', ['pack', '--ignore-scripts', '--pack-destination', '/artifacts']);
