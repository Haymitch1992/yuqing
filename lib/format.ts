export function formatPrice(value: number): string {
  return value.toFixed(2);
}

export function formatSigned(value: number, digits = 2): string {
  const text = value.toFixed(digits);
  return value > 0 ? `+${text}` : text;
}

export function formatPct(value: number): string {
  return `${formatSigned(value)}%`;
}

export function formatWanShou(shares: number): string {
  const lots = shares / 100;
  if (lots >= 10000) return `${(lots / 10000).toFixed(2)}万手`;
  return `${Math.round(lots).toLocaleString("zh-CN")}手`;
}

export function formatAmountWan(wan: number): string {
  return `${wan.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}万`;
}

export function formatYi(value: number, unit: string): string {
  return `${value.toFixed(2)}${unit}`;
}

export function formatYiShares(shares: number): string {
  return `${(shares / 1e8).toFixed(2)}亿`;
}

export function formatShare(count: number, total: number): string {
  if (total <= 0) return "0.00%";
  return `${((count / total) * 100).toFixed(2)}%`;
}

export function toneClass(value: number): string {
  if (value < 0) return "text-[#c5362b]";
  if (value > 0) return "text-[#1f7a45]";
  return "text-[#1c1917]";
}
