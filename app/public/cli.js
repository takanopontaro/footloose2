#!/usr/bin/env node
const { execSync, spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { program } = require('commander');

const manifest = JSON.parse(readFileSync(`${__dirname}/package.json`, 'utf-8'));

program
  .name('@footloose2/app')
  .description('Here 🕺 We 💃 Go 👟')
  .version(manifest.version)
  .option('-p, --port <port>', 'Specify server port', '3000')
  .option(
    '-t, --time-style <format>',
    'Specify custom format for date-time',
    '%y/%m/%d %H:%M:%S',
  )
  .option('-b, --bookmark <file>', 'Specify bookmark json file')
  .option('-s, --style <file>', 'Specify user style file')
  .option('-c, --config <file>', 'Specify user config js/ts file')
  .helpOption('-h, --help', 'Display help for command')
  .showHelpAfterError();

program.parse();

const options = program.opts();

const args = ['-r', __dirname];

if ('port' in options) {
  args.push('-p', options.port);
}

if ('timeStyle' in options) {
  args.push('-t', options.timeStyle);
}

if ('bookmark' in options) {
  args.push('-b', options.bookmark);
}

if ('style' in options) {
  args.push('-s', options.style);
}

if ('config' in options) {
  args.push('-c', options.config);
}

const { arch, env, platform, release, version } = process;

const binPathMap = {
  'darwin': {
    x64: '@footloose2/server-darwin-x64/footloose2-server',
    arm64: '@footloose2/server-darwin-arm64/footloose2-server',
  },
  'linux': {
    x64: '@footloose2/server-linux-x64/footloose2-server',
    arm64: '@footloose2/server-linux-arm64/footloose2-server',
  },
  'linux-musl': {
    x64: '@footloose2/server-linux-x64-musl/footloose2-server',
    arm64: '@footloose2/server-linux-arm64-musl/footloose2-server',
  },
};

function isMusl() {
  let stderr;
  try {
    stderr = execSync('ldd --version', { stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    stderr = e.stderr;
  }
  return stderr?.toString().includes('musl') ?? false;
}

const binPath =
  platform === 'linux' && isMusl()
    ? binPathMap?.['linux-musl']?.[arch]
    : binPathMap?.[platform]?.[arch];

if (!binPath) {
  console.error('No prebuilt binaries for your platform.');
  process.exit(1);
}

const packageManager = env.npm_config_user_agent?.split(' ')[0];

const spawnOpts = {
  shell: false,
  stdio: 'inherit',
  env: {
    ...env,
    JS_RUNTIME_VERSION: version,
    JS_RUNTIME_NAME: release.name,
    ...(packageManager && { NODE_PACKAGE_MANAGER: packageManager }),
  },
};

const result = spawnSync(require.resolve(binPath), args, spawnOpts);

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? undefined;
