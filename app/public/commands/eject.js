const fs = require('node:fs');
const path = require('node:path');

function copy(dest, entries) {
  entries.forEach((entry) => {
    const from = path.resolve(path.dirname(__dirname), entry);
    const to = path.resolve(dest, entry);
    try {
      fs.cpSync(from, to, {
        recursive: true,
        errorOnExist: true,
        force: false,
      });
    } catch (_e) {
      throw new Error(`Already exists: ${to}`);
    }
  });
}

function eject(dir = '.') {
  const cwd = process.cwd();
  const dest = path.resolve(cwd, dir);
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  try {
    copy(dest, ['app.css', 'config.ts', 'config', 'tsconfig.json', 'types']);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  console.log('Ejected config files to', dest);
}

module.exports = { eject };
