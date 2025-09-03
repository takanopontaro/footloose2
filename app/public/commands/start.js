const { spawnSync } = require('node:child_process');
const { dirname } = require('node:path');

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

function isMusl() {
  let stderr;
  try {
    stderr = execSync('ldd --version', { stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    stderr = e.stderr;
  }
  return stderr?.toString().includes('musl') ?? false;
}

function start(options) {
  const args = ['-r', dirname(__dirname)];

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

  const bin = require.resolve(binPath);
  const result = spawnSync(bin, args, spawnOpts);

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? undefined;
}

module.exports = { start };
