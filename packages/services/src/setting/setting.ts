import type { AppSettings } from "@onyx/shared";
import { ServiceChannels } from "@onyx/shared";
import { createServiceDescriptor } from "../descriptors.js";

export interface ISettingService {
  get(): Promise<AppSettings>;
  update(patch: Partial<AppSettings>): Promise<void>;
  /** Change the data base directory: copy data from old → new location, then persist the setting. */
  updateDataBaseDir(newDir: string | undefined): Promise<void>;
  ensureDefaultProject(homedir: string): Promise<{ path: string; created: boolean }>;
}

export const ISettingService = createServiceDescriptor<ISettingService>(ServiceChannels.Setting);
