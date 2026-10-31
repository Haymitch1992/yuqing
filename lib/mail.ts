import dns from "node:dns/promises";
import net from "node:net";
import nodemailer from "nodemailer";
import { formatAmountWan, formatPct, formatPrice, formatSigned, formatWanShou, formatYi, formatYiShares } from "@/lib/format";
import { formatCnDate, formatCnDateTime } from "@/lib/time";
import type { AppSettings, Report } from "@/lib/types";

export function smtpReady(settings: AppSettings): boolean {
  return Boolean(settings.smtp.host && settings.smtp.user && settings.smtp.pass);
}

export function describeMailError(error: unknown): string {
  const nested =
    error && typeof error === "object" && "errors" in error && Array.isArray(error.errors)
      ? error.errors.filter((item): item is NodeJS.ErrnoException => item instanceof Error)
      : [];
  const codes = nested.map((item) => item.code).filter((code): code is string => Boolean(code));
  if (codes.some((code) => ["ETIMEDOUT", "ECONNREFUSED", "ENETUNREACH", "EHOSTUNREACH", "ESOCKET", "ECONNRESET"].includes(code))) {
    return "连不上邮件服务器。请确认主机、端口和加密方式，并检查当前网络能否访问该 SMTP 端口。163 邮箱使用 smtp.163.com 的 465 端口，并开启 SSL。";
  }
  const responseCode =
    error && typeof error === "object" && "responseCode" in error ? Number(error.responseCode) : 0;
  if (responseCode === 535 || responseCode === 550) {
    return "邮箱服务器拒绝了登录。163 邮箱要填授权码，不是登录密码，并确认 SMTP 服务已开启。";
  }
  if (error instanceof Error && error.message && error.message !== "AggregateError") return error.message;
  return "发送失败";
}

function cell(label: string, value: string): string {
  return `<td style="padding:8px 10px;border:1px solid #e6e0d6;color:#6b645b;width:18%">${label}</td><td style="padding:8px 10px;border:1px solid #e6e0d6;font-variant-numeric:tabular-nums">${value}</td>`;
}

export function renderEmailHtml(report: Report, previewUrl: string): string {
  const quote = report.quote;
  const quoteRows = quote
    ? [
        cell("收盘价", formatPrice(quote.close)) + cell("涨跌幅", formatPct(quote.changePct)),
        cell("涨跌额", formatSigned(quote.change)) + cell("成交量", quote.volumeShares ? formatWanShou(quote.volumeShares) : "—"),
        cell("最高价", formatPrice(quote.high)) + cell("成交额", quote.amountWan != null ? formatAmountWan(quote.amountWan) : "—"),
        cell("最低价", formatPrice(quote.low)) + cell("换手率", quote.turnoverPct != null ? `${quote.turnoverPct.toFixed(2)}%` : "—"),
        cell("市盈率(静)", quote.peStatic != null ? quote.peStatic.toFixed(2) : "—") +
          cell("市净率", quote.pb != null ? quote.pb.toFixed(2) : "—"),
        cell("总市值", quote.marketCapYi != null ? formatYi(quote.marketCapYi, "亿") : "—") +
          cell("总股本", quote.totalShares != null ? formatYiShares(quote.totalShares) : "—"),
      ]
    : [];

  const eventRows = report.clusters
    .map(
      (cluster) => `<tr>
        <td style="padding:8px 10px;border:1px solid #e6e0d6">${cluster.primary.publishedAt.slice(0, 16)}</td>
        <td style="padding:8px 10px;border:1px solid #e6e0d6">${cluster.primary.title}</td>
        <td style="padding:8px 10px;border:1px solid #e6e0d6">${cluster.sentiment}</td>
        <td style="padding:8px 10px;border:1px solid #e6e0d6">${cluster.primary.source}</td>
        <td style="padding:8px 10px;border:1px solid #e6e0d6;text-align:right">${cluster.heat}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
<body style="margin:0;background:#f6f3ec;color:#1c1917;font-family:'PingFang SC','Microsoft YaHei',sans-serif">
  <div style="max-width:760px;margin:24px auto;background:#fff;border:1px solid #e6e0d6;padding:28px">
    <p style="margin:0;letter-spacing:0.18em;font-size:12px;color:#6b645b">交控科技股份有限公司 · 688015</p>
    <h1 style="margin:8px 0 0;font-size:28px;font-weight:600">舆情日报</h1>
    <p style="color:#6b645b">报告日 ${formatCnDate(report.date)} · 生成于 ${formatCnDateTime(report.createdAt)}</p>
    <p>${report.overview}</p>
    <p>${report.peak}</p>
    <h2 style="font-size:18px;border-top:1px solid #e6e0d6;padding-top:16px">行情</h2>
    ${
      quote
        ? `<p style="color:#6b645b">截止 ${formatCnDate(quote.tradeDate)} 收盘${quote.partial ? "，历史日期只还原了价格和涨跌" : ""}。</p>
           <table style="width:100%;border-collapse:collapse;font-size:14px">${quoteRows.map((row) => `<tr>${row}</tr>`).join("")}</table>`
        : "<p>这次没有取到行情。</p>"
    }
    <h2 style="font-size:18px;border-top:1px solid #e6e0d6;padding-top:16px">事件 ${report.stats.events} 件 · 负面 ${report.stats.negative} 件</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="background:#f6f3ec">
        <th align="left" style="padding:8px 10px;border:1px solid #e6e0d6">时间</th>
        <th align="left" style="padding:8px 10px;border:1px solid #e6e0d6">标题</th>
        <th align="left" style="padding:8px 10px;border:1px solid #e6e0d6">情感</th>
        <th align="left" style="padding:8px 10px;border:1px solid #e6e0d6">来源</th>
        <th align="right" style="padding:8px 10px;border:1px solid #e6e0d6">热度</th>
      </tr>
      ${eventRows || `<tr><td colspan="5" style="padding:8px 10px;border:1px solid #e6e0d6">当日没有强相关事件。</td></tr>`}
    </table>
    <p style="margin-top:20px"><a href="${previewUrl}">在系统里打开完整预览</a></p>
    <p style="color:#6b645b;font-size:12px">行情来自腾讯行情，公告来自上交所。新闻来自东方财富搜索，以及网易、同花顺和腾讯自选股的公开列表，只保留标题含公司名或证券代码的结果。热度是同题条数，不是阅读量。</p>
  </div>
</body>
</html>`;
}

async function connectHost(host: string): Promise<{ host: string; servername?: string }> {
  const trimmed = host.trim();
  if (net.isIP(trimmed)) return { host: trimmed };
  try {
    const addresses = await dns.resolve4(trimmed);
    if (addresses[0]) return { host: addresses[0], servername: trimmed };
  } catch {
    // 解析失败时仍用主机名，让发送错误回到原来的连接失败提示。
  }
  return { host: trimmed };
}

export async function sendReportMail(settings: AppSettings, report: Report, to: string | string[], previewUrl: string): Promise<void> {
  if (!smtpReady(settings)) {
    throw new Error("还没有配置发信邮箱");
  }
  // 主机同时公布 IPv6 时，Node 会先试没有路由的 IPv6，再在大约 250ms 内放弃 IPv4。
  // 163 的 465 端口握手比这个窗口慢，于是信在连上之前就被放弃。这里固定走 IPv4。
  const target = await connectHost(settings.smtp.host);
  const transporter = nodemailer.createTransport({
    host: target.host,
    port: settings.smtp.port,
    secure: settings.smtp.secure,
    auth: { user: settings.smtp.user, pass: settings.smtp.pass },
    tls: target.servername ? { servername: target.servername } : undefined,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 20_000,
  });
  const from = settings.smtp.from || settings.smtp.user;
  await transporter.sendMail({
    from,
    to: Array.isArray(to) ? to : [to],
    subject: `交控科技舆情日报 ${report.date}`,
    text: `${report.overview}\n${report.peak}\n\n完整预览：${previewUrl}`,
    html: renderEmailHtml(report, previewUrl),
  });
}
