/**
 * 场景：灵机剪影桌面 Panel — electron-module Guest 满铺槽（host.guest.mountElectronModule）。
 *
 * 上游原生形态只有 Electron：renderer 的导出 / TTS / 发布 / 项目读写全部经 preload 的
 * `window.electronAPI` → 主进程 IPC，单独跑浏览器里的 renderer 是空壳（skill §二 第 6 条禁止）。
 * 因此本面板只走 electron-module：宿主建独立 WebContentsView 加载上游 renderer 产物，
 * 并绑定上游 preload，让上游 IPC 面尽量原样可用。
 *
 * 版面纪律：Tab 内容区必须贴边满铺，禁止外层再包 Unistyles / padding，
 * 否则 guest host 四周会留 24px（见 snow-app panel 同款注释）。
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import type { WorkspaceAppHostApi } from "@agnx-lab/app-sdk";
import {
  LINGJI_APP_ID,
  LINGJI_APP_TITLE,
  LINGJI_GUEST_HOST_TESTID,
  LINGJI_OPEN_COMMAND_ID,
  LINGJI_PANEL_ID,
} from "./constants";

/** 品牌标 fallback（manifest.icon 优先；侧栏 / 命令面板用此标，禁止泛用 Bot）。 */
function LingjiCutBrandIcon(props: { size?: number | string; color?: string }): ReactElement {
  const size = props.size ?? 18;
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" aria-hidden focusable="false">
      <rect width="256" height="256" rx="56" fill="#0B1020" />
      <g stroke="#F0A24B" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* 胶片格：剪辑语义 */}
        <rect x="52" y="72" width="152" height="112" rx="16" />
        <path d="M96 72v112" />
        <path d="M160 72v112" />
        <path d="M84 72v112" stroke="#F0A24B" strokeWidth="4" opacity="0.55" />
        <path d="M172 72v112" stroke="#F0A24B" strokeWidth="4" opacity="0.55" />
        {/* 播放三角 + 剪刀切口 */}
        <path d="M118 116l34 20-34 20z" fill="#F0A24B" stroke="none" />
      </g>
      <g stroke="#5FD3C4" strokeWidth="8" strokeLinecap="round" opacity="0.95">
        <path d="M52 196h152" />
      </g>
    </svg>
  );
}

const PANEL_ROOT_STYLE: CSSProperties = {
  flex: "1 1 0%",
  alignSelf: "stretch",
  minHeight: 0,
  minWidth: 0,
  width: "100%",
  height: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  position: "relative",
};

/** 专用空 host 元素：宿主 WebContentsView 的原生 bounds 跟随它。 */
const GUEST_HOST_STYLE: CSSProperties = {
  flex: "1 1 auto",
  minHeight: 0,
  minWidth: 0,
  width: "100%",
  height: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  position: "relative",
};

const STATUS_OVERLAY_STYLE: CSSProperties = {
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
  background: "rgba(9,9,11,0.92)",
};

let boundHost: WorkspaceAppHostApi | null = null;

function getHost(): WorkspaceAppHostApi {
  if (!boundHost) {
    throw new Error(`${LINGJI_APP_TITLE} host 未绑定`);
  }
  return boundHost;
}

export function bindLingjiCutHost(host: WorkspaceAppHostApi): void {
  boundHost = host;
}

export function LingjiCutGuestPanel(): ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState("正在挂载 electron-module…");

  useEffect(() => {
    const host = getHost();
    const guest = host.guest;
    if (!guest?.mountElectronModule) {
      setStatus("宿主未提供 guest.mountElectronModule（需 Agnx 桌面端 G6.1+）");
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
      },
    });
    return unmount;
  }, []);

  return (
    <div style={PANEL_ROOT_STYLE} aria-label={`${LINGJI_APP_TITLE} panel`}>
      <div
        ref={hostRef}
        data-agnx-guest-module-host="true"
        data-testid={LINGJI_GUEST_HOST_TESTID}
        style={GUEST_HOST_STYLE}
      />
      {status ? <div style={STATUS_OVERLAY_STYLE}>{status}</div> : null}
    </div>
  );
}

export function activate(host: WorkspaceAppHostApi): () => void {
  bindLingjiCutHost(host);
  const disposers: Array<() => void> = [];

  disposers.push(
    host.registerMiniApp({
      id: LINGJI_PANEL_ID,
      appId: LINGJI_APP_ID,
      title: LINGJI_APP_TITLE,
      icon: LingjiCutBrandIcon,
      component: LingjiCutGuestPanel,
    }),
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
          currentPathname: context?.currentPathname,
        });
      },
    }),
  );

  return () => {
    for (const d of disposers.toReversed()) d();
  };
}
