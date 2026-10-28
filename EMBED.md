## 上游嵌入

- 上游：`yoqu/lingji-cut`（灵机剪影，Apache-2.0，★426，TypeScript；Electron 41 + electron-vite 5 + React 19 + Remotion 4），版本 `lingjijianying@1.3.1`
- **上游原生平台**：桌面 ✅ ｜ 网页 ❌ ｜ 移动 ❌
  - 桌面 ✅（主力形态）：electron-vite 工程 —— `electron/main.ts`（主进程：121 个 IPC handler、Remotion 渲染、TTS、发布）
    + `electron/preload.ts`（暴露 6 个 `window.*` 能力面）+ `index.html` 壳加载的 renderer（`src/`，React 19）。
    构建产物：`dist/`（renderer，`renderer.outDir='dist'`）+ `dist-electron/preload.js`（preload）+ `dist-electron/main.js`（主进程）。
  - 网页 ❌：**没有 Web 形态**。renderer 不直接用 Node API，导出 / TTS / 发布 / 项目读写**全部**经 preload 的 IPC
    （preload 里有 161 个不同 channel 的 `ipcRenderer.invoke` + 38 处 `send/on`）。
    单独跑 renderer = 界面能看、**所有创作能力全废**，属 skill §二 明令禁止的空壳。按 §9.1 **不替上游补造网页端**。
  - 移动 ❌：无 iOS/Android 工程。

- **工作方式**：**Wrap + `electron-module`**（§9.3 第一行「已有可运行的独立 UI，能打包」→ 原样接入）。
  上游源码**不动**，由本子应用 ensure 探测 renderer 与 preload 产物，交宿主 WebContentsView 加载。

- **挂载**：`guest.kind=electron-module`、`guest.module=lingji-cut-desktop`、
  `guest.capabilities=[fs, dialog, shell, spawn, stream, pty]`、`guest.preferStrategy=electron-module`。
  - 走宿主 `WebContentsView`（`packages/desktop/src/features/guest-module-webcontents-views.ts`），
    **不是** iframe，也不是「外开独立 Electron 窗」（skill §二 第 6 条禁止后者）。
  - ensure 输出宿主 G6 合同单行 JSON：`{ ok, appId, ensureId, module, rendererEntry, rendererSource, preloadPath?, reused?, warnings? }`。

- **端口**：`sidecar.defaultPort = 8133`（`lifecycle: lazy`）。仅 dev server 模式用它；本机实测走构建产物（file://），不占端口。

- **上游**：`yoqu/lingji-cut` @ `main`（tarball 落地，无 git 元数据）

### 面板与 Tab

| 面板 id | 名字 | 加载方式 |
| --- | --- | --- |
| `lingji-cut.main` | 灵机剪影 | `ensureTool` = `.agnx/tools/ensure-lingji-cut.mjs`（`mountElectronModule`） |

### 真实启动命令与探测顺序

```bash
cd ~/.agnx-dev/apps/lingji-cut
node .agnx/tools/ensure-lingji-cut.mjs --supervised --port 8133 --work-dir data
```

1. `ELECTRON_RENDERER_URL`（可 HTTP 探测时）
2. `http://127.0.0.1:8133/`（dev server；`LINGJI_DEV_PORT` 可覆盖）
3. `upstream/dist/index.html` → `pathToFileURL`（本机实测走这条）
4. preload：`upstream/dist-electron/preload.js`（兼容 `.cjs`/`.mjs`/`out/preload/*`）

脚本**只做探测，不启动任何窗口**。

## 构建可复现

```bash
# 上游（真树 upstream/，已 npm install 完毕）
cd upstream && npx electron-vite build     # → dist/ + dist-electron/  （实测 15s，全绿）

# 子应用胶水
cd .agnx && npm install && npm run build    # esbuild 0.25.12 → dist/index.js
```

> ⚠️ **踩过的坑（记录备查）**：首次用 `npx esbuild` 打胶水时，拉到的版本把 JSX 编成了
> `React.createElement` 而作用域只有 `import_react` → 宿主面板抛 `React is not defined` → 整块黑屏。
> **必须**用 `.agnx` 本地锁定的 esbuild 0.25.12 且 `--jsx=automatic`，产物里应出现
> `require("react/jsx-runtime")` 且 **不得**出现裸 `React.createElement`。已写入 build 脚本，可用 `npm run build` 复现。

## 桌面验收（已通过）

实测证据链：

| 检查项 | 结果 | 证据 |
| --- | --- | --- |
| 宿主侧栏出现子应用 | ✅ | `sidebar-mini-app-grid-lingji-cut` |
| Tab 可打开 | ✅ | `workspace-tab-mini-app_lingji-cut__lingji-cut.main__default` |
| 面板满铺挂载 | ✅ | `workspace-mini-app-lingji-cut-root`（`data-agnx-guest-module-host`） |
| **WebContentsView 加载上游 renderer** | ✅ | CDP target：`page \| 灵机剪影 \| file:///…/upstream/dist/index.html` |
| **上游 UI 真实渲染** | ✅ | `#root` 2 个子节点 / 7707 字符；`document.readyState=complete` |
| **上游 preload 注入** | ✅ | `typeof window.electronAPI === "object"`，另有 `agentAPI` / `conversationAPI` |
| 视口尺寸 | ✅ | 840×640，背景 `rgb(2,6,23)`（上游深色主题） |
| 截图 | ✅ | `logs/lingji-cut-guest-view.png` |

欢迎页完整可见：开始创作 / 导入文稿 / 导入音频 / 抖音导入 / 本地视频 / 导入项目 / 联系作者 / 赞赏支持 / 底部「未连接」状态栏。

> **取证方式说明**：guest 是原生 `WebContentsView`，叠加在窗口最上层，**不在宿主壳层 DOM 里**，
> 所以对宿主页 `Page.captureScreenshot` 抓不到它的像素（这也是早期截图全黑的原因之一）。
> 正确取证是连 CDP target 里那条 `file://` 页（guest view 自身）截图，见 `logs/lingji-cut-guest-view.png`。

## 嵌页宿主能力缺口

**核心结论**：宿主只加载 renderer + 绑定上游 preload，**上游主进程 `electron/main.ts` 不运行**，
所以 preload 暴露的 161 个 IPC channel 里，凡是依赖主进程 handler 的**全部无人应答**。
这是 `electron-module` 策略的结构性上限，与 snow-app / genoffice 同级。

实测三条（guest view 内真实调用）：

| 调用 | 结果 |
| --- | --- |
| `window.electronAPI.loadRecentProjects()` | ❌ `No handler registered for 'load-recent-projects'` |
| `window.electronAPI.listSystemFonts()` | ❌ `No handler registered for 'list-system-fonts'` |
| `window.electronAPI.getAppInfo()` | ✅ 返回正常（纯 preload 本地实现，不依赖主进程） |

| 上游能力 | 信号位置 | 嵌后风险 | 处置 (A–E) | 主路径 | 备注 |
| --- | --- | --- | --- | --- | --- |
| 主界面渲染 / 导航 / 状态栏 | `src/App.tsx`、`src/pages/*` | 无（纯 renderer） | A（已可用） | electron-module | 实测通过 |
| `getAppInfo` 等纯 preload 实现 | `electron/preload.ts` | 无 | A（已可用） | electron-module | 实测通过 |
| 最近项目 / 项目读写（`loadProject` `saveProjectSection` `saveTimeline`） | `electron/main.ts` handler | **点「导入项目」无响应** | E（**未接通**） | — | 需上游主进程；宿主无对应能力 |
| 选目录 / 选媒体文件（`selectProjectDirectory` `selectMediaFile`） | `electron/main.ts` + `dialog` | **点「导入文稿/音频/视频」无响应** | E（**未接通**） | — | 宿主 `dialog` capability 是独立接口，与上游 channel 名不匹配 |
| 字幕解析 / 音频时长（`parseSrtFile` `getAudioDuration`） | 主进程（ffprobe） | 导入链路断 | E（**未接通**） | — | 见下文 U 类说明 |
| AI 分析 / 卡片生成 / TTS（`analyzeSrt` `generateAICard…`） | 主进程 + LLM Provider | AI 创作全链路不可用 | E（**未接通**） | — | 见下文 U 类说明 |
| Remotion 编译与导出（`compileMotionCards` `remotion:compile-cards`） | 主进程 + Chrome Headless + ffmpeg | 导出不可用 | E（**未接通**） | — | — |
| 封面生成 / 图片卡片 / 字体列表 | 主进程 + `@ffmpeg-installer` / `font-list` | 不可用 | E（**未接通**） | — | `listSystemFonts` 实测失败 |
| 多平台发布（B站/抖音，含扫码登录与自动化） | 主进程 + playwright + node-pty | 不可用 | E（**未接通**） | — | 不并入 Agnx 会话 |
| 内置 Pi Agent 侧栏 | 主进程 + `@earendil-works/pi-coding-agent` | 不可用 | E（**未接通**） | — | 与 Agnx 模型源是两套 |
| 文件变更监听（`chokidar` → `onFileChanged`） | 主进程 | 外部编辑同步失效 | E（**未接通**） | — | 不崩，仅无事件 |

处置口径：A=上游原生已可用（无需胶水）；B=经宿主 capability 补齐；C=经 sidecar 补齐；
D=上游自管/不合并；**E=嵌入态不提供，如实标注**。

### 为什么不做「胶水补 IPC」（U 类，明确不做的理由）

理论上可以写一个 `agnx-embed` preload 用宿主 `agnx:guest-capability:invoke`（fs/dialog/shell/spawn/pty）
**替上游实现那 100+ 个 IPC channel**——snow-app 就是这么干的。**本次刻意不做**，理由：

1. 上游 channel 语义是「灵机剪影项目模型」（`saveProjectSection(projectDir, section, data)`、`compileMotionCards`、
   `analyzeSrt(entries, settings…)`），不是通用 fs/dialog；要让它们工作等于**在胶水里重写上游主进程业务逻辑**，
   直接违反 §9.3「不做太重 / 上游几乎不动」的硬约束。
2. 一旦 stub 返回假数据，用户会看到「导入成功」却读不到文件，比明确不可用更糟。
   本子应用选择**宁可功能不可用，也不谎称可用**。

若将来要打通，方向是「让上游主进程真正运行起来」而不是在胶水里补 IPC。但**现有宿主契约还不足**，
已核实的边界如下（勿按想象中的 API 做评估）：

| 需要的 | 宿主现状 | 结论 |
| --- | --- | --- |
| 嵌入一个**外部 Electron 窗口** | `electron-module` 契约是上游提供 `rendererEntry`，宿主自建 `WebContentsView`（`registerGuestModuleWebContentsViewIpc`），**只接收 renderer、不接管别人的窗口** | 无对应接口 |
| 把上游主进程当后台服务拉起 | `runtime.sidecars.kind` 只有 `python-gateway`/`node-host`/`rust-binary`/`generic`（`packages/server/src/workspace-apps/manifest-runtime.ts:7-10`），按 `healthKind`（http/framed-ipc/process）探活；supervised 需 `plan{command,cwd,fingerprint,healthUrl,port}`（`loopback-supervised-protocol.ts:66` `assertSupervisedLaunchPlan`） | 契约**支持**拉起 Electron 进程（`kind:"generic"`），但拉起来只是**后台进程**，它的 `BrowserWindow` 进不了 Tab |
| `surface.replace` capability 通道 | 通道**存在**：`packages/desktop/src/features/guest-capability-rpc.ts:368` `root === "surface"` → `invokeSurface`，要求 `manifest.guest.capabilities` 声明 | 存在，但只是下一行 `replaceGuestModuleSurface` 的 RPC 外壳，**不能接管外部窗口** |
| `replaceGuestModuleSurface` 接管已有窗口 | 入参 `GuestSurfaceReplaceInput = { guestModuleId, url, preload?, executeJavaScript?, executeDelayMs? }`（`guest-surface-replace.ts:13-20`）；`webContentsId` 是**返回值**（`:22-26`）。它在宿主自建的 WCV 上同槽换 renderer（「Shell Home → docs/sheets…」），**不接管外部 `BrowserWindow`** | 不能用于本场景 |
| 面板 WCV 是否可由外部提供 | `guest-module-webcontents-views.ts:456` 无条件 `new WebContentsView({...})`，宿主**只**自建；`grep -rn "fromWebContentsId\|adopt\|takeover" packages/desktop/src` **无结果** | **无任何接管外部窗口的机制** |
| `runtime.sidecars` 声明窗口型条目 | `manifest-sidecar.test.ts:48` 有 `{ id: "desktop-window", kind: "generic" }` 用例，但那是**声明解析兼容性**测试（允许缺 `ensureTool`/`stateFile`），不代表窗口能进 Tab | 仅为解析兼容，非能力 |

所以「让上游主进程作为 sidecar 跑起来 + 把它的窗口嵌进 Tab」是**需要新增宿主能力的立项**，
不是子应用侧写点胶水能完成的，不在本次 Wrap 范围内。

### 结论：必须新增宿主能力（二选一）

| 候选宿主能力 | 要解决什么 | 落在哪 |
| --- | --- | --- |
| **① 接管外部 `BrowserWindow` 的 WebContents 并挂到面板占位** | 上游主进程自己 `new BrowserWindow()` 后，把它的 WebContents 移交给宿主面板槽 | `packages/desktop/src/features/guest-module-webcontents-views.ts` 新增 attach 变体；`guest-surface-replace.ts` 增加「外部来源」入参 |
| **② 让上游主进程把 IPC 服务暴露给宿主自建的 WCV** | 上游主进程跑在独立进程/窗口，通过 framed-ipc 或 WS 把 121 个 handler 暴露给宿主 WCV 里的 renderer | 需要上游 preload 换成 Agnx 的转发层；`runtime.sidecars` + `kind:"generic"` + `healthKind:"framed-ipc"` |

两条都是**宿主改动**，不是 lingji-cut 的胶水能做的。本子应用在现有能力下已达到上限：**上游主界面可浏览，业务功能不可用**。

### 本次走过的弯路（记录，避免后来者重犯）

1. **误把「当前宿主能力」当成「策略上限」**：`electron-module` 不启动上游主进程是**当前实现**，不代表这是唯一正路；
   正确做法是核 sidecar 能否拉起 Electron，再判断窗口能否进 Tab——本次直到 lead 介入才补齐这一核实。
2. **两次引用了不存在的 API 用法**：先说 `surface.replace` 能接管外部窗口，再说 `guest-surface-replace` 能接管已有窗口。
   纪律：**凡提及 API，必须先在 `packages/` 里 grep 到源码再写**，不得按直觉命名或推断语义。

## 已知缺口

1. **上游主进程不运行 → 所有依赖主进程 handler 的功能不可用**（详见上表 E 类）。
   嵌入态可视为「上游主界面可浏览的空壳」，不是「完整可用的剪辑工具」。
2. `node-pty` 未编译（`node_modules/node-pty/build` 为空），且其 ABI 需与宿主 Electron 匹配；本路径未使用它。
3. `canvas@2.11.2` / `ffmpeg-static` / `@ffmpeg-installer` 的二进制安装脚本被 npm allow-scripts 拦截，
   若走完整功能路线需 `npm approve-scripts` 后重装。
4. 走 dev server 模式时需上游 `npx vite --port 8133` 常驻；本机实测走构建产物，不依赖 dev server。
5. 首次拉取上游受网络限制较大：GitHub 直连与多数镜像均失败，
   最终用 `curl -L --no-timeout "https://gh-proxy.com/https://codeload.github.com/yoqu/lingji-cut/tar.gz/refs/heads/main"`
   完整下载 212MB 成功（**必须不加 `--max-time`**，否则会被截断成不完整 gzip）。
6. `.agnx/package.json` 不放 `peerDependencies`：`@agnx-lab/app-sdk` 未发布到 registry，
   声明 peer 会让 `npm install` 直接 E404。SDK 由宿主运行时提供，构建时 `--external` 排除。

## 上游改动清单

**无源码改动。** 未修改上游任何 `.ts` / `.tsx` / `package.json` / `electron.vite.config.ts` / 构建脚本。
仅在 `upstream/` 内执行了 `npm install` 与 `npx electron-vite build`（生成 `dist/`、`dist-electron/`、`node_modules/`）。

---

宿主 commit：`f3b5da6c94eca748ea16a1571b716f1dac99ae48`
