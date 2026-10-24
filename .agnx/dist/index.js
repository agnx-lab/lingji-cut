var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);

// src/panel.tsx
var import_react = require("react");

// src/constants.ts
var LINGJI_APP_ID = "lingji-cut";
var LINGJI_APP_TITLE = "\u7075\u673A\u526A\u5F71";
var LINGJI_PANEL_ID = "lingji-cut.main";
var LINGJI_OPEN_COMMAND_ID = "lingji-cut.open";
var LINGJI_GUEST_HOST_TESTID = "workspace-mini-app-lingji-cut-root";

// src/panel.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function LingjiCutBrandIcon(props) {
  const size = props.size ?? 18;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: size, height: size, viewBox: "0 0 256 256", fill: "none", "aria-hidden": true, focusable: "false", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { width: "256", height: "256", rx: "56", fill: "#0B1020" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { stroke: "#F0A24B", strokeWidth: "10", strokeLinecap: "round", strokeLinejoin: "round", fill: "none", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "52", y: "72", width: "152", height: "112", rx: "16" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M96 72v112" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M160 72v112" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M84 72v112", stroke: "#F0A24B", strokeWidth: "4", opacity: "0.55" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M172 72v112", stroke: "#F0A24B", strokeWidth: "4", opacity: "0.55" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M118 116l34 20-34 20z", fill: "#F0A24B", stroke: "none" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", { stroke: "#5FD3C4", strokeWidth: "8", strokeLinecap: "round", opacity: "0.95", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M52 196h152" }) })
  ] });
}
var PANEL_ROOT_STYLE = {
  flex: "1 1 0%",
  alignSelf: "stretch",
  minHeight: 0,
  minWidth: 0,
  width: "100%",
  height: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  position: "relative"
};
var GUEST_HOST_STYLE = {
  flex: "1 1 auto",
  minHeight: 0,
  minWidth: 0,
  width: "100%",
  height: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  position: "relative"
};
var STATUS_OVERLAY_STYLE = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  color: "#a1a1aa",
  fontSize: 14,
  lineHeight: 1.6,
  textAlign: "center",
  whiteSpace: "pre-wrap",
  background: "rgba(9,9,11,0.92)"
};
var boundHost = null;
function getHost() {
  if (!boundHost) {
    throw new Error(`${LINGJI_APP_TITLE} host \u672A\u7ED1\u5B9A`);
  }
  return boundHost;
}
function bindLingjiCutHost(host) {
  boundHost = host;
}
function LingjiCutGuestPanel() {
  const hostRef = (0, import_react.useRef)(null);
  const [status, setStatus] = (0, import_react.useState)("\u6B63\u5728\u6302\u8F7D electron-module\u2026");
  (0, import_react.useEffect)(() => {
    const host = getHost();
    const guest = host.guest;
    if (!guest?.mountElectronModule) {
      setStatus("\u5BBF\u4E3B\u672A\u63D0\u4F9B guest.mountElectronModule\uFF08\u9700 Agnx \u684C\u9762\u7AEF G6.1+\uFF09");
      return;
    }
    const container = hostRef.current;
    if (!container) {
      return;
    }
    const unmount = guest.mountElectronModule({
      container,
      // --supervised：与 process-supervisor 合同对齐（ensure 脚本会校验该参数）
      ensureArgs: ["--supervised"],
      onReady: () => {
        setStatus("");
      },
      onError: (detail) => {
        setStatus(detail.message);
      }
    });
    return unmount;
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: PANEL_ROOT_STYLE, "aria-label": `${LINGJI_APP_TITLE} panel`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        ref: hostRef,
        "data-agnx-guest-module-host": "true",
        "data-testid": LINGJI_GUEST_HOST_TESTID,
        style: GUEST_HOST_STYLE
      }
    ),
    status ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: STATUS_OVERLAY_STYLE, children: status }) : null
  ] });
}
function activate(host) {
  bindLingjiCutHost(host);
  const disposers = [];
  disposers.push(
    host.registerMiniApp({
      id: LINGJI_PANEL_ID,
      appId: LINGJI_APP_ID,
      title: LINGJI_APP_TITLE,
      icon: LingjiCutBrandIcon,
      component: LingjiCutGuestPanel
    })
  );
  disposers.push(
    host.registerCommand({
      id: LINGJI_OPEN_COMMAND_ID,
      appId: LINGJI_APP_ID,
      title: LINGJI_APP_TITLE,
      icon: LingjiCutBrandIcon,
      run: (context) => {
        host.openSubAppTab({
          appId: host.appId ?? LINGJI_APP_ID,
          panelId: LINGJI_PANEL_ID,
          serverId: context?.serverId,
          workspaceId: context?.workspaceId,
          currentPathname: context?.currentPathname
        });
      }
    })
  );
  return () => {
    for (const d of disposers.toReversed()) d();
  };
}
