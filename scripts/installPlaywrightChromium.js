const { spawnSync } = require('child_process');
const path = require('path');

const playwrightCli = path.join(
  __dirname,
  '..',
  'node_modules',
  'playwright',
  'cli.js',
);

const options = {
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '0',
  },
  stdio: 'inherit',
};

const result = spawnSync(process.execPath, [playwrightCli, 'install', 'chromium'], options);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status || 0);
