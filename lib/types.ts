export type Sentiment = "正面" | "中性" | "负面";
export type Channel = "公告" | "网站";

export interface Article {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  channel: Channel;
  summary: string;
  sentiment: Sentiment;
  event: string;
}

export interface Cluster {
  id: string;
  sentiment: Sentiment;
  event: string;
  heat: number;
  primary: Article;
  members: Article[];
}

export interface QuoteSnapshot {
  tradeDate: string;
  close: number;
  change: number;
  changePct: number;
  volumeShares: number;
  high: number;
  amountWan: number | null;
  low: number;
  turnoverPct: number | null;
  peStatic: number | null;
  pb: number | null;
  peDynamic: number | null;
  volumeRatio: number | null;
  marketCapYi: number | null;
  totalShares: number | null;
  floatCapYi: number | null;
  floatShares: number | null;
  bps: number | null;
  dividendYield: number | null;
  partial: boolean;
}

export interface KlineBar {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
}

export interface ShareRow {
  name: string;
  count: number;
  pct: number;
}

export interface ReportStats {
  spread: number;
  events: number;
  positive: number;
  neutral: number;
  negative: number;
  dominant: Sentiment | "无";
  channels: ShareRow[];
  media: ShareRow[];
  hottestTitle: string | null;
  hottestSource: string | null;
  hottestHeat: number;
}

export interface Report {
  id: string;
  companyName: string;
  code: string;
  date: string;
  createdAt: string;
  reviewedAt: string | null;
  sentAt: string | null;
  sentTo: string | null;
  quote: QuoteSnapshot | null;
  kline: KlineBar[];
  clusters: Cluster[];
  stats: ReportStats;
  overview: string;
  peak: string;
  warnings: string[];
}

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface AppSettings {
  scheduleEnabled: boolean;
  scheduleTime: string;
  recipient: string;
  smtp: SmtpSettings;
}

export type ReportStatus = "待预览" | "待发送" | "已发送";

export function reportStatus(report: Pick<Report, "reviewedAt" | "sentAt">): ReportStatus {
  if (report.sentAt) return "已发送";
  if (report.reviewedAt) return "待发送";
  return "待预览";
}
