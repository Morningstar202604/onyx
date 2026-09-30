export interface DefaultPluginMarketplace {
  id: string;
  source: string;
  name: string;
  description: string;
  pluginCount: number;
  lastUpdated?: string;
}

export const ONYX_OFFICIAL_PLUGIN_MARKETPLACE_ID = "onyx-plugins-official";

/** Settings 三类资源发现共用；Bootstrap 单测与官方 definition 的 defaultEnabled 机械对照。 */
export const DEFAULT_ENABLED_OFFICIAL_PLUGIN_IDS: ReadonlySet<string> = new Set([
  "browser-use@onyx-plugins-official",
  "image-search@onyx-plugins-official",
  "documents@onyx-plugins-official",
  "pdf@onyx-plugins-official",
  "presentations@onyx-plugins-official",
  "spreadsheets@onyx-plugins-official",
  // node_repl 宿主：不进市场、不对用户露出，也不贡献任何 skill/command/subagent，但必须
  // 始终可用 —— node_repl 的注册门禁是「Browser Use 或 Computer Use 任一启用」，宿主自己
  // 不参与那个判断。Browser Use 默认开着，宿主若默认关就等于它上来就没有宿主。
  "node-repl-host@onyx-plugins-official",
  "skill-creator@onyx-plugins-official",
  "plugin-creator@onyx-plugins-official",
  "onyx-guide@onyx-plugins-official",
  // 电脑控制回退为默认关闭，故 computer-use 不在此名单内。
  // 该集合必须与 official-plugin-definitions.ts 里标了 defaultEnabled 的插件逐一对应，
  // bootstrap 的「Settings 默认启用集合与 CLI 的官方插件声明一致」单测机械对照两者。
]);

export const DEFAULT_PLUGIN_MARKETPLACES: DefaultPluginMarketplace[] = [
  {
    // Onyx 官方插件市场：插件本体以本地 seed 随包分发，无远端 manifest（无服务器）。
    // source 留空表示"仅本地内置"，商店不应发起远端刷新请求。
    id: ONYX_OFFICIAL_PLUGIN_MARKETPLACE_ID,
    source: "",
    name: ONYX_OFFICIAL_PLUGIN_MARKETPLACE_ID,
    description: "Onyx built-in plugins marketplace: local seed only, no remote source.",
    pluginCount: 0,
  },
];

// 商店「公开」分段只有一个 ZCode 官方市场 id，内置与 CDN 不再拆分身份。
export const PUBLIC_STORE_MARKETPLACE_IDS = [ONYX_OFFICIAL_PLUGIN_MARKETPLACE_ID] as const;

export function isPublicStoreMarketplaceId(id: string): boolean {
  return (PUBLIC_STORE_MARKETPLACE_IDS as readonly string[]).includes(id);
}
