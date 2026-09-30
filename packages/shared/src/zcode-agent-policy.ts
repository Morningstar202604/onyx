import { z } from "zod";
import type { CommandAgentSource } from "./command-types.js";
import type { ZCodeProvider } from "./zcode-task-types-core.js";

export const ONYX_AGENT_PROVIDER = "glm" satisfies ZCodeProvider;
export const ONYX_AGENT_PROVIDER_LABEL = "Onyx Agent";
export const ONYX_COMMAND_AGENT_SOURCE = "zcodeAgent" satisfies CommandAgentSource;

export const zcodeAgentProviderSchema = z.literal(ONYX_AGENT_PROVIDER);

export const ONYX_COMMAND_AGENT_SOURCES = [
  ONYX_COMMAND_AGENT_SOURCE,
] as const satisfies readonly CommandAgentSource[];

export function normalizeAgentProviderToZCodeAgent(
  _provider?: ZCodeProvider | null,
): ZCodeProvider {
  return ONYX_AGENT_PROVIDER;
}

export function isZCodeAgentProvider(
  provider: ZCodeProvider | null | undefined,
): provider is typeof ONYX_AGENT_PROVIDER {
  return provider === ONYX_AGENT_PROVIDER;
}
