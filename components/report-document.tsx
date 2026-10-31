import {
  formatAmountWan,
  formatPct,
  formatPrice,
  formatShare,
  formatSigned,
  formatWanShou,
  formatYi,
  formatYiShares,
  toneClass,
} from "@/lib/format";
import { formatCnDate, formatCnDateTime } from "@/lib/time";
import type { KlineBar, Report } from "@/lib/types";

function PriceChart({ bars, tradeDate }: { bars: KlineBar[]; tradeDate: string }) {
  if (bars.length < 2) return null;
  const width = 680;
  const height = 220;
  const pad = { left: 48, right: 16, top: 16, bottom: 28 };
  const closes = bars.map((bar) => bar.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const xAt = (index: number) =>
    pad.left + (index * (width - pad.left - pad.right)) / (bars.length - 1);
  const yAt = (value: number) => pad.top + ((max - value) / span) * (height - pad.top - pad.bottom);
  const line = bars
    .map((bar, index) => `${index === 0 ? "M" : "L"}${xAt(index).toFixed(1)},${yAt(bar.close).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${xAt(bars.length - 1).toFixed(1)},${height - pad.bottom} L${xAt(0).toFixed(1)},${height - pad.bottom} Z`;
  const last = bars[bars.length - 1];
  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="近20个交易日收盘价">
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="#e6e0d6" />
        <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} stroke="#e6e0d6" />
        <text x={4} y={yAt(max) + 4} fontSize="11" fill="#6b645b">
          {max.toFixed(2)}
        </text>
        <text x={4} y={yAt(min) + 4} fontSize="11" fill="#6b645b">
          {min.toFixed(2)}
        </text>
        <path d={area} fill="#1c1917" opacity="0.06" />
        <path d={line} fill="none" stroke="#1c1917" strokeWidth="1.6" />
        {bars.map((bar, index) =>
          bar.date === tradeDate ? (
            <circle key={bar.date} cx={xAt(index)} cy={yAt(bar.close)} r="3.5" fill="#c5362b" />
          ) : null,
        )}
        <text x={pad.left} y={height - 8} fontSize="11" fill="#6b645b">
          {bars[0].date.slice(5)}
        </text>
        <text x={width - pad.right} y={height - 8} fontSize="11" fill="#6b645b" textAnchor="end">
          {last.date.slice(5)}
        </text>
      </svg>
      <figcaption className="mt-1 text-xs text-[#6b645b]">
        近 {bars.length} 个交易日收盘价（元），前复权。红点是本报告使用的截止交易日 {tradeDate}。来源：腾讯行情。
      </figcaption>
    </figure>
  );
}

function QuoteTable({ report }: { report: Report }) {
  const quote = report.quote;
  if (!quote) return <p className="text-sm text-[#6b645b]">这次没有取到行情。</p>;
  const rows: [string, string, string, string][] = [
    ["收盘价", formatPrice(quote.close), "涨跌幅", formatPct(quote.changePct)],
    ["涨跌额", formatSigned(quote.change), "成交量", quote.volumeShares ? formatWanShou(quote.volumeShares) : "—"],
    ["最高价", formatPrice(quote.high), "成交额", quote.amountWan != null ? formatAmountWan(quote.amountWan) : "—"],
    ["最低价", formatPrice(quote.low), "换手率", quote.turnoverPct != null ? `${quote.turnoverPct.toFixed(2)}%` : "—"],
    ["市盈率(静)", quote.peStatic != null ? quote.peStatic.toFixed(2) : "—", "市净率", quote.pb != null ? quote.pb.toFixed(2) : "—"],
    ["市盈率(动)", quote.peDynamic != null ? quote.peDynamic.toFixed(2) : "—", "量比", quote.volumeRatio != null ? quote.volumeRatio.toFixed(2) : "—"],
    ["总市值", quote.marketCapYi != null ? formatYi(quote.marketCapYi, "亿") : "—", "总股本", quote.totalShares != null ? formatYiShares(quote.totalShares) : "—"],
    ["流通市值", quote.floatCapYi != null ? formatYi(quote.floatCapYi, "亿") : "—", "流通股", quote.floatShares != null ? formatYiShares(quote.floatShares) : "—"],
    ["每股净资产", quote.bps != null ? formatPrice(quote.bps) : "—", "股息率", quote.dividendYield != null ? `${quote.dividendYield.toFixed(2)}%` : "—"],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) => (
                <td
                  key={`${row[0]}-${index}`}
                  className={
                    index % 2 === 0
                      ? "w-[18%] border border-[#e6e0d6] bg-[#fbf8f2] px-3 py-2 text-[#6b645b]"
                      : `border border-[#e6e0d6] px-3 py-2 tabular-nums ${index === 3 && row[2] === "涨跌幅" ? toneClass(quote.changePct) : ""}`
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-[#6b645b]">
        以上为报告日当天或之前最后一个交易日的数据，截止 {formatCnDate(quote.tradeDate)} 收盘。
        {quote.partial ? " 这一天不是最新交易日，估值字段留空。" : " 来源：腾讯行情。"}
      </p>
    </div>
  );
}

function ShareTable({ headers, rows }: { headers: string[]; rows: { name: string; count: number; pct: number }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[24rem] border-collapse text-sm">
        <thead>
          <tr className="bg-[#fbf8f2] text-left text-[#6b645b]">
            {headers.map((header) => (
              <th key={header} className="border border-[#e6e0d6] px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="border border-[#e6e0d6] px-3 py-2 text-[#6b645b]" colSpan={headers.length}>
                当日没有可统计的条目。
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.name}>
                <td className="border border-[#e6e0d6] px-3 py-2 tabular-nums">{index + 1}</td>
                <td className="border border-[#e6e0d6] px-3 py-2">{row.name}</td>
                <td className="border border-[#e6e0d6] px-3 py-2 text-right tabular-nums">{row.count}</td>
                <td className="border border-[#e6e0d6] px-3 py-2 text-right tabular-nums">{row.pct.toFixed(2)}%</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ReportDocument({ report }: { report: Report }) {
  const negative = report.clusters.filter((cluster) => cluster.sentiment === "负面");
  return (
    <article className="mx-auto max-w-3xl bg-white px-4 py-8 text-[#1c1917] sm:px-10 sm:py-12">
      <p className="text-xs tracking-[0.2em] text-[#6b645b]">交控科技股份有限公司</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">舆情日报</h1>
      <dl className="mt-4 grid gap-1 text-sm text-[#3f3a34] sm:grid-cols-2">
        <div>报告日：{formatCnDate(report.date)}</div>
        <div>证券代码：{report.code}</div>
        <div>生成时间：{formatCnDateTime(report.createdAt)}</div>
        <div>传播 {report.stats.spread} 条 · 事件 {report.stats.events} 件</div>
      </dl>

      {report.warnings.length > 0 ? (
        <div className="mt-6 border border-[#e6c8a0] bg-[#fff8ee] px-4 py-3 text-sm">
          {report.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <p className="mt-6 text-sm leading-6 text-[#3f3a34]">
        只收录标题含「交控科技」或「688015」的信息。公告来自上交所当日披露。新闻来自东方财富搜索，并加上网易搜索、同花顺个股资讯和腾讯自选股个股资讯。今日头条、天眼查、雪球的公开页面当前打不开，报告里不单列这三家。热度是同题条数。
      </p>

      <section className="mt-10">
        <h2 className="border-t border-[#1c1917] pt-3 text-xl font-semibold">一、行情概况</h2>
        <div className="mt-4">
          {report.quote ? <PriceChart bars={report.kline} tradeDate={report.quote.tradeDate} /> : null}
        </div>
        <div className="mt-4">
          <QuoteTable report={report} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="border-t border-[#1c1917] pt-3 text-xl font-semibold">二、舆情概况</h2>
        <p className="mt-4 leading-7">{report.overview}</p>
        <p className="mt-2 leading-7">{report.peak}</p>
        <h3 className="mt-6 text-base font-semibold">情感分布（按事件）</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[24rem] border-collapse text-sm">
            <thead>
              <tr className="bg-[#fbf8f2] text-left text-[#6b645b]">
                <th className="border border-[#e6e0d6] px-3 py-2 font-medium">情感</th>
                <th className="border border-[#e6e0d6] px-3 py-2 font-medium text-right">事件数</th>
                <th className="border border-[#e6e0d6] px-3 py-2 font-medium text-right">占事件</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["正面", report.stats.positive],
                  ["负面", report.stats.negative],
                  ["中性", report.stats.neutral],
                ] as const
              ).map(([name, count]) => (
                <tr key={name}>
                  <td className="border border-[#e6e0d6] px-3 py-2">{name}</td>
                  <td className="border border-[#e6e0d6] px-3 py-2 text-right tabular-nums">{count}</td>
                  <td className="border border-[#e6e0d6] px-3 py-2 text-right tabular-nums">
                    {formatShare(count, report.stats.events)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="mt-6 text-base font-semibold">渠道（按条数）</h3>
        <div className="mt-3">
          <ShareTable headers={["序号", "渠道", "条数", "占比"]} rows={report.stats.channels} />
        </div>
        <h3 className="mt-6 text-base font-semibold">媒体（按条数）</h3>
        <div className="mt-3">
          <ShareTable headers={["序号", "媒体", "条数", "占比"]} rows={report.stats.media} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="border-t border-[#1c1917] pt-3 text-xl font-semibold">三、舆情明细</h2>
        <h3 className="mt-6 text-base font-semibold">全部事件</h3>
        <EventTable clusters={report.clusters} empty="当日没有强相关事件。" />
        <h3 className="mt-8 text-base font-semibold">负面事件</h3>
        <EventTable clusters={negative} empty="当日没有判为负面的事件。" />
      </section>

      <p className="mt-10 text-xs leading-5 text-[#6b645b]">
        情感按标题规则判断：留置、减值、业绩下滑为负面，专利和中标为正面，其余中性。同题归并后，明细只列每件事件的首发稿。正文只保留摘要和原文链接。
      </p>
    </article>
  );
}

function EventTable({
  clusters,
  empty,
}: {
  clusters: Report["clusters"];
  empty: string;
}) {
  if (clusters.length === 0) {
    return <p className="mt-3 text-sm text-[#6b645b]">{empty}</p>;
  }
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <thead>
          <tr className="bg-[#fbf8f2] text-left text-[#6b645b]">
            {["时间", "标题", "情感", "事件", "来源", "热度"].map((header) => (
              <th key={header} className="border border-[#e6e0d6] px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clusters.map((cluster) => (
            <tr key={cluster.id} className="align-top">
              <td className="border border-[#e6e0d6] px-3 py-2 whitespace-nowrap tabular-nums">
                {cluster.primary.publishedAt.slice(0, 16)}
              </td>
              <td className="border border-[#e6e0d6] px-3 py-2">
                <a href={cluster.primary.url} className="underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                  {cluster.primary.title}
                </a>
                {cluster.primary.summary ? (
                  <p className="mt-1 text-xs leading-5 text-[#6b645b]">{cluster.primary.summary}</p>
                ) : null}
                {cluster.members.length > 1 ? (
                  <details className="mt-2 text-xs text-[#6b645b]">
                    <summary>同题另外 {cluster.members.length - 1} 条</summary>
                    <ul className="mt-1 list-disc pl-4">
                      {cluster.members
                        .filter((member) => member.id !== cluster.primary.id)
                        .map((member) => (
                          <li key={member.id}>
                            <a href={member.url} className="underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                              {member.source}：{member.title}
                            </a>
                          </li>
                        ))}
                    </ul>
                  </details>
                ) : null}
              </td>
              <td className={`border border-[#e6e0d6] px-3 py-2 ${cluster.sentiment === "负面" ? "text-[#c5362b]" : ""}`}>
                {cluster.sentiment}
              </td>
              <td className="border border-[#e6e0d6] px-3 py-2">{cluster.event}</td>
              <td className="border border-[#e6e0d6] px-3 py-2">{cluster.primary.source}</td>
              <td className="border border-[#e6e0d6] px-3 py-2 text-right tabular-nums">{cluster.heat}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
