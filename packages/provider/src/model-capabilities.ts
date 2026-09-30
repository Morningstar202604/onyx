// ============================================================
// 模型能力协商表：providerId+modelId -> 能力描述
// ============================================================
// 供 UI 按能力降级（图片输入/工具/推理参数/上下文窗口提示）。
// 规则：先按精确 modelId 匹配，再按 providerId+前缀匹配，最后用默认值。
// 默认值保守（无证据不声称支持），避免把不支持的能力入口暴露给用户。

export interface ModelCapabilities {
  /** 是否支持工具调用（function calling / tool use）。 */
  readonly supportsToolCall: boolean;
  /** 是否支持图像输入（vision / multimodal）。 */
  readonly supportsVision: boolean;
  /** 是否支持推理（reasoning effort / thinking）。 */
  readonly supportsReasoning: boolean;
  /** 上下文窗口 token 数（无可靠数据时 undefined）。 */
  readonly contextWindow?: number;
}

const DEFAULT_CAPABILITIES: ModelCapabilities = Object.freeze({
  supportsToolCall: false,
  supportsVision: false,
  supportsReasoning: false,
});

// 按 providerId 的默认能力（家族级事实）。
const PROVIDER_DEFAULT_CAPABILITIES: Readonly<Record<string, ModelCapabilities>> = Object.freeze({
  openai: Object.freeze({ supportsToolCall: true, supportsVision: true, supportsReasoning: true }),
  anthropic: Object.freeze({
    supportsToolCall: true,
    supportsVision: true,
    supportsReasoning: true,
  }),
});

// modelId 前缀 -> 能力覆盖（不区分大小写；按最长前缀优先）。
interface ModelCapabilityRule {
  readonly prefixes: readonly string[];
  readonly capabilities: ModelCapabilities;
}

const MODEL_CAPABILITY_RULES: readonly ModelCapabilityRule[] = Object.freeze([
  {
    // OpenAI 系
    prefixes: ["gpt-4o", "gpt-4.1", "gpt-4.5", "o1", "o3", "o4", "gpt-5"],
    capabilities: Object.freeze({ supportsToolCall: true, supportsVision: true, supportsReasoning: true }),
  },
  { prefixes: ["gpt-4-turbo"], capabilities: Object.freeze({ supportsToolCall: true, supportsVision: true, supportsReasoning: false }) },
  { prefixes: ["gpt-3.5"], capabilities: Object.freeze({ supportsToolCall: true, supportsVision: false, supportsReasoning: false }) },
  // Anthropic 系
  { prefixes: ["claude-3", "claude-4"], capabilities: Object.freeze({ supportsToolCall: true, supportsVision: true, supportsReasoning: true }) },
  // DeepSeek 系
  { prefixes: ["deepseek-chat", "deepseek-reasoner", "deepseek-v3", "deepseek-r1", "deepseek-v4"],
    capabilities: Object.freeze({ supportsToolCall: true, supportsVision: false, supportsReasoning: true }) },
  // Kimi / Moonshot 系
  { prefixes: ["kimi-k2", "moonshot-v1", "kimi-v1", "kimi-latest"],
    capabilities: Object.freeze({ supportsToolCall: true, supportsVision: false, supportsReasoning: true }) },
  // 阿里通义系
  { prefixes: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen3", "qwen2.5", "qwq"],
    capabilities: Object.freeze({ supportsToolCall: true, supportsVision: true, supportsReasoning: true }) },
  // 智谱 GLM 系
  { prefixes: ["glm-4", "glm-4.5", "glm-4.6", "glm-z1", "glm-z1-air"],
    capabilities: Object.freeze({ supportsToolCall: true, supportsVision: true, supportsReasoning: true }) },
  // MiniMax 系
  { prefixes: ["minimax-text", "MiniMax-M1"],
    capabilities: Object.freeze({ supportsToolCall: true, supportsVision: false, supportsReasoning: true }) },
  // 小米 MiMo 系
  { prefixes: ["MiMo-7B", "mimo"],
    capabilities: Object.freeze({ supportsToolCall: true, supportsVision: false, supportsReasoning: false }) },
  // 通义千问视觉专用
  { prefixes: ["qwen-vl", "qwen2-vl", "qwen2.5-vl", "glm-4v"],
    capabilities: Object.freeze({ supportsToolCall: false, supportsVision: true, supportsReasoning: false }) },
]);

export function resolveModelCapabilities(
  providerId: string,
  modelId: string,
): ModelCapabilities {
  const family = PROVIDER_DEFAULT_CAPABILITIES[providerId];
  const normalizedModelId = modelId.trim().toLowerCase();
  let bestRule: ModelCapabilityRule | undefined;

  for (const rule of MODEL_CAPABILITY_RULES) {
    const matched = rule.prefixes.some((prefix) => normalizedModelId.startsWith(prefix.toLowerCase()));
    if (!matched) continue;
    if (!bestRule || rule.prefixes[0]!.length > bestRule.prefixes[0]!.length) {
      bestRule = rule;
    }
  }

  if (bestRule) {
    return { ...family, ...bestRule.capabilities };
  }
  return family ?? DEFAULT_CAPABILITIES;
}

/** 供设置页展示；按 providerId 判断供应商是否整体支持图片输入（默认开启，规则仅收窄）。 */
export function providerSupportsVisionByDefault(providerId: string): boolean {
  return PROVIDER_DEFAULT_CAPABILITIES[providerId]?.supportsVision ?? false;
}
