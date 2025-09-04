import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import react from '@vitejs/plugin-react-swc';
import { transform } from 'esbuild';
import { defineConfig } from 'vite';

import type { PluginOption, UserConfig } from 'vite';

function resolvePath(path: string): string {
  return resolve(__dirname, path);
}

// ユーザーが自前の config や css を利用できるようにしたいため、
// main.tsx では app を初期化せず、init メソッドを export している。
// init がユーザーデータを受け取れるようにすることで初期化の柔軟性が増す。
function assets(): PluginOption | undefined {
  return {
    name: 'assets',
    transformIndexHtml: {
      order: 'post',
      async handler(html) {
        // entry point の script タグ
        const re = /\s+<script.+src="(.+\.tsx.*)"><\/script>/;

        // src 属性値を取得する。
        const [, src] = html.match(re)!;

        // script タグを削除する。
        // entry point の実行コードをアンコメントする。
        // src 属性値を差し替える。
        html = html
          .replace(re, '')
          .replace(/<!--|-->/g, '')
          .replace('%src%', src);

        // デフォルトの css, config を inline 化する。
        const cssPath = resolvePath('public/app.css');
        const cssStr = readFileSync(cssPath, 'utf-8');
        const configPath = resolvePath('src/config.ts');
        const configStr = readFileSync(configPath, 'utf-8');
        const { code } = await transform(configStr, {
          loader: 'ts',
          format: 'esm',
        });
        const jsStrB64 = Buffer.from(code, 'utf-8').toString('base64');
        return html.replace('%css%', cssStr).replace('%js%', jsStrB64);
      },
    },
  };
}

// package 用の index.html を作成する。
function indexHtml(): PluginOption {
  return {
    name: 'indexHtml',
    apply: 'build',
    closeBundle() {
      const srcPath = resolvePath('index.html');
      const html = readFileSync(srcPath, 'utf-8')
        .replace(/\s+<script.+src=".+?"><\/script>/, '')
        .replace(/<!--|-->/g, '')
        .replace('%src%', '/app.js');
      const outPath = resolvePath('dist/index.html');
      writeFileSync(outPath, html, 'utf-8');
    },
  };
}

// package 用の package.json を作成する。
function packageJson(): PluginOption {
  return {
    name: 'packageJson',
    apply: 'build',
    closeBundle() {
      const srcPath = resolvePath('package.json');
      const contents = readFileSync(srcPath, 'utf-8');
      const json = JSON.parse(contents) as Record<string, unknown>;
      delete json.devDependencies;
      delete json.packageManager;
      delete json.private;
      delete json.scripts;
      delete json.type;
      const jsonStr = JSON.stringify(json, null, 2);
      const outPath = resolvePath('dist/package.json');
      writeFileSync(outPath, jsonStr, 'utf-8');
    },
  };
}

// development 用の設定
// 開発サーバーを起動する。
function devConfig(): UserConfig {
  return {
    server: {
      proxy: {
        '^/(config|preview)': `http://localhost:${process.env.SERVER_PORT}`,
      },
    },
    resolve: {
      alias: {
        '@config': resolve(__dirname, 'src/config'),
        '@libs': resolve(__dirname, 'src/libs'),
        '@modules': resolve(__dirname, 'src/modules'),
      },
    },
    plugins: [react(), assets()],
    build: {
      target: 'esnext',
      outDir: 'dist',
      rollupOptions: {
        output: { entryFileNames: 'app.js' },
      },
    },
  };
}

// production 用の設定
// ライブラリ形式でビルドする。
function prdConfig(): UserConfig {
  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    resolve: {
      alias: {
        '@config': resolve(__dirname, 'src/config'),
        '@libs': resolve(__dirname, 'src/libs'),
        '@modules': resolve(__dirname, 'src/modules'),
      },
    },
    plugins: [react(), indexHtml(), packageJson()],
    build: {
      target: 'esnext',
      outDir: 'dist',
      lib: {
        entry: resolve(__dirname, 'src/main.tsx'),
        fileName: () => 'app.js',
        formats: ['es'],
      },
    },
  };
}

export default defineConfig(({ mode }) =>
  mode === 'development' ? devConfig() : prdConfig(),
);
