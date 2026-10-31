import type { KlineBar } from "@/lib/types";

const WIDTH = 680;
const HEIGHT = 220;
const PAD = { left: 48, right: 16, top: 16, bottom: 28 };

export function renderPriceChartSvg(bars: KlineBar[], tradeDate: string): string | null {
  if (bars.length < 2) return null;
  const closes = bars.map((bar) => bar.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const xAt = (index: number) => PAD.left + (index * (WIDTH - PAD.left - PAD.right)) / (bars.length - 1);
  const yAt = (value: number) => PAD.top + ((max - value) / span) * (HEIGHT - PAD.top - PAD.bottom);
  const line = bars
    .map((bar, index) => `${index === 0 ? "M" : "L"}${xAt(index).toFixed(1)},${yAt(bar.close).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${xAt(bars.length - 1).toFixed(1)},${HEIGHT - PAD.bottom} L${xAt(0).toFixed(1)},${HEIGHT - PAD.bottom} Z`;
  const last = bars[bars.length - 1];
  const dot = bars
    .map((bar, index) =>
      bar.date === tradeDate
        ? `<circle cx="${xAt(index).toFixed(1)}" cy="${yAt(bar.close).toFixed(1)}" r="3.5" fill="#c5362b" />`
        : "",
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1360" height="440" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="近20个交易日收盘价" style="width:100%;height:auto;display:block">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff" />
  <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${HEIGHT - PAD.bottom}" stroke="#e6e0d6" />
  <line x1="${PAD.left}" y1="${HEIGHT - PAD.bottom}" x2="${WIDTH - PAD.right}" y2="${HEIGHT - PAD.bottom}" stroke="#e6e0d6" />
  <text x="4" y="${(yAt(max) + 4).toFixed(1)}" font-size="11" font-family="sans-serif" fill="#6b645b">${max.toFixed(2)}</text>
  <text x="4" y="${(yAt(min) + 4).toFixed(1)}" font-size="11" font-family="sans-serif" fill="#6b645b">${min.toFixed(2)}</text>
  <path d="${area}" fill="#1c1917" opacity="0.06" />
  <path d="${line}" fill="none" stroke="#1c1917" stroke-width="1.6" />
  ${dot}
  <text x="${PAD.left}" y="${HEIGHT - 8}" font-size="11" font-family="sans-serif" fill="#6b645b">${bars[0].date.slice(5)}</text>
  <text x="${WIDTH - PAD.right}" y="${HEIGHT - 8}" font-size="11" font-family="sans-serif" fill="#6b645b" text-anchor="end">${last.date.slice(5)}</text>
</svg>`;
}

export function priceChartCaption(count: number, tradeDate: string): string {
  return `近 ${count} 个交易日收盘价（元），前复权。红点是本报告使用的截止交易日 ${tradeDate}。来源：腾讯行情。`;
}
