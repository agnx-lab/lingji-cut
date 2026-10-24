/**
 * 场景：灵机剪影子应用常量 — appId / 面板 id / 标题 / dev server 端口 / 上游真树相对路径。
 * 端口纪律：defaultPort=8133；避开 daemon 6767、Bridge 3054、Dev CDP 9333、Metro 8081、
 * 8120-8127、5173/5188 等已被其它子应用占用的号。
 */

export const LINGJI_APP_ID = "lingji-cut";
export const LINGJI_APP_TITLE = "灵机剪影";
export const LINGJI_PANEL_ID = "lingji-cut.main";
export const LINGJI_OPEN_COMMAND_ID = "lingji-cut.open";

/** electron-vite renderer dev server（Vite）端口；仅 dev 模式使用。 */
export const LINGJI_DEV_PORT = 8133;

/** electron-module guest renderer 的专用空 host 元素 testid（宿主用它生成挂载键）。 */
export const LINGJI_GUEST_HOST_TESTID = "workspace-mini-app-lingji-cut-root";

/** 上游真树在本子应用目录内的相对位置（ensure 与面板解析都用它）。 */
export const LINGJI_UPSTREAM_DIRNAME = "upstream";
