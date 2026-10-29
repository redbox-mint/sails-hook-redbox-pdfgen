// Model a browser child that outlives its parent, then recreates the profile.
// It shares the parent's process group and pipes, just like Chrome workers.
const fs = require('fs');
const cp = require('child_process');
const profile = process.argv.find(arg => arg.startsWith('--user-data-dir=')).slice('--user-data-dir='.length);
const report = process.argv[2];
const writer = cp.spawn(process.execPath, ['-e', `
  const fs = require('fs');
  const profile = process.argv[1];
  const parent = Number(process.argv[2]);
  const until = Date.now() + 2000;
  const timer = setInterval(() => {
    let parentAlive = true;
    try { process.kill(parent, 0); } catch { parentAlive = false; }
    if (!parentAlive && !fs.existsSync(profile)) {
      fs.mkdirSync(profile, {recursive: true});
      fs.writeFileSync(profile + '/late-writer', 'synthetic');
      clearInterval(timer);
    } else if (Date.now() >= until) clearInterval(timer);
  }, 10);
`, profile, String(process.pid)], { stdio: ['ignore', 'inherit', 'inherit'] });
fs.writeFileSync(report, JSON.stringify({ profile, parent: process.pid, child: writer.pid }));
setInterval(() => {}, 1000);
