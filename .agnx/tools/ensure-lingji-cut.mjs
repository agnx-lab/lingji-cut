#!/usr/bin/env node
/**
 * 场景：灵机剪影 electron-module ensure — 探测上游 renderer（dev HTTP :8133 或 electron-vite 产物 dist/index.html）
 * 与上游 preload（dist-electron/preload.js），输出宿主 G6 合同要求的单行 JSON。
 *
 * 用法：node .agnx/tools/ensure-lingji-cut.mjs --supervised [--port <n>] [--work-dir <path>]
 * stdout：单行 JSON { ok, appId, ensureId, rendererEntry, preloadPath?, reused?, warnings?, module?, message? }
 * 失败：{ ok:false, appId, ensureId, error, message, warnings }，退出码 1。
 *
 * 禁止：open -a / 外开独立 Electron 窗。本脚本只做探测，不启动任何窗口。
 */
import { access, constants as fsConstants } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** .agnx/tools → 上两级 = 子应用根 */
const appRoot = path.resolve(__dirname, "../..");
/** 上游真树：<appRoot>/upstream（由 prepare-upstream.mjs 落地） */
const upstreamRoot = path.join(appRoot, "upstream");
const appId = "lingji-cut";
const ensureId = "ensure-lingji-cut";
const moduleName = "lingji-cut-desktop";
/** 与 manifest.sidecar.defaultPort 一致；避开 daemon 6767 / Bridge 3054 / CDP 9333 / Metro 8081 / 8120-8127 / 5188 */
const DEFAULT_DEV_PORT = 8133;

const { values } = parseArgs({
  options: {
    supervised: { type: "boolean", default: false },
    port: { type: "string" },
    // 宿主 run-app-tool 会注入 --work-dir；本 ensure 不读 dataRoot，但必须声明以免 parseArgs 抛错
    "work-dir": { type: "string" },
    workDir: { type: "string" },
    "force-restart": { type: "boolean", default: false },
    forceRestart: { type: "boolean", default: false },
  },
  strict: true,
  allowPositionals: false,
});

async function pathExists(target) {
  try {
    await access(target, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function probeHttp(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 2500 }, (res) => {
      res.resume();
      resolve(res.statusCode != null && res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * 上游 electron-vite 产物名：preload 固定 dist-electron/preload.js（见上游 electron.vite.config.ts）。
 * 兼容可能出现的 .cjs / .mjs 变体。
 * @param {string} root
 */
async function resolvePreload(root) {
  const candidates = [
    "dist-electron/preload.js",
    "dist-electron/preload.cjs",
    "dist-electron/preload.mjs",
    "out/preload/index.js",
    "out/preload/index.cjs",
  ];
  for (const rel of candidates) {
    const abs = path.join(root, rel);
    if (await pathExists(abs)) {
      return abs;
    }
  }
  return null;
}

function resolveDevPort() {
  if (values.port) {
    const n = Number(values.port);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const fromEnv =
    Number(process.env.LINGJI_DEV_PORT) ||
    Number(process.env.ELECTRON_RENDERER_URL?.match?.(/:(\d+)/)?.[1]);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return DEFAULT_DEV_PORT;
}

async function resolveRendererEntry(devPort) {
  const envUrl =
    typeof process.env.ELECTRON_RENDERER_URL === "string"
      ? process.env.ELECTRON_RENDERER_URL.trim()
      : "";
  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    const base = envUrl.endsWith("/") ? envUrl : `${envUrl}/`;
    if (await probeHttp(base)) {
      return { url: base, source: "dev-server(ELECTRON_RENDERER_URL)" };
    }
  }
  const devUrl = `http://127.0.0.1:${devPort}/`;
  if (await probeHttp(devUrl)) {
    return { url: devUrl, source: `dev-server(:${devPort})` };
  }
  // electron-vite renderer 产物：上游 vite renderer.outDir = 'dist'，root = '.'
  const prodCandidates = ["dist/index.html", "out/renderer/index.html"];
  for (const rel of prodCandidates) {
    const abs = path.join(upstreamRoot, rel);
    if (await pathExists(abs)) {
      return { url: pathToFileURL(abs).href, source: `build(${rel})` };
    }
  }
  return null;
}

async function main() {
  if (!values.supervised) {
    console.error(`${ensureId}: 请使用 --supervised（Agnx process-supervisor 合同）`);
    process.exit(2);
  }

  const warnings = [];

  if (!(await pathExists(upstreamRoot))) {
    console.log(
      JSON.stringify({
        ok: false,
        appId,
        ensureId,
        module: moduleName,
        error: "LINGJI_UPSTREAM_MISSING",
        message:
          `上游真树缺失：请先在 ${appRoot} 执行 node .agnx/tools/prepare-upstream.mjs ` +
          `（把 yoqu/lingji-cut 落到 ${upstreamRoot}）并 npm install + npm run build`,
        warnings,
      }),
    );
    process.exit(1);
  }

  const devPort = resolveDevPort();
  const renderer = await resolveRendererEntry(devPort);

  if (!renderer) {
    console.log(
      JSON.stringify({
        ok: false,
        appId,
        ensureId,
        module: moduleName,
        error: "LINGJI_RENDERER_UNAVAILABLE",
        message:
          `灵机剪影 renderer 未就绪：请在 ${upstreamRoot} 执行 npm install && npx electron-vite build ` +
          `（产物 dist/index.html），或起 dev server：LINGJI_DEV_PORT=${devPort} npm run dev（只需其 Vite renderer）`,
        warnings,
      }),
    );
    process.exit(1);
  }

  const preloadPath = await resolvePreload(upstreamRoot);
  if (!preloadPath) {
    warnings.push(
      "未找到上游 preload 产物（dist-electron/preload.js）；请在真树执行 npx electron-vite build —— " +
        "缺 preload 时 renderer 的 window.electronAPI 全缺，界面会白屏/报错。",
    );
  }

  // electron-module 只探测 renderer/preload，不 spawn sidecar；不输出 plan（loopback zod 要求很严）。
  console.log(
    JSON.stringify({
      ok: true,
      appId,
      ensureId,
      module: moduleName,
      rendererEntry: renderer.url,
      rendererSource: renderer.source,
      preloadPath: preloadPath || undefined,
      reused: false,
      warnings,
    }),
  );
}

void main();
