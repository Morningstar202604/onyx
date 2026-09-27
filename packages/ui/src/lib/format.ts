const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/**
 * 统一字节数格式化：B → KB → MB → GB → TB，0 与非法输入显示 "0 B"。
 * 传入 locale 时使用本地化数字格式（千分位/小数点），否则用 toFixed。
 */
export function formatBytes(bytes: number, locale?: string): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = unitIndex === 0 ? 0 : value >= 100 ? 0 : 1;
  if (locale) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)} ${BYTE_UNITS[unitIndex]}`;
  }
  return `${value.toFixed(digits)} ${BYTE_UNITS[unitIndex]}`;
}
