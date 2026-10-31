import { classify, clusterArticles, buildStats, writeNarrative } from "@/lib/analyze";
import { fetchAnnouncements, fetchMarket, fetchNews, snapshotForDate } from "@/lib/collect";
import { formatCnDate } from "@/lib/time";
import type { Report } from "@/lib/types";

const COMPANY_NAME = "交控科技股份有限公司";
const CODE = "688015";

export async function buildReport(date: string, createdAt = new Date().toISOString()): Promise<Report> {
  const warnings: string[] = [];
  const [marketResult, announcementResult, newsResult] = await Promise.allSettled([
    fetchMarket(),
    fetchAnnouncements(date),
    fetchNews(date),
  ]);

  let quote: Report["quote"] = null;
  let kline: Report["kline"] = [];
  if (marketResult.status === "fulfilled") {
    const snapshot = snapshotForDate(marketResult.value.quote, marketResult.value.kline, date);
    if (snapshot) {
      quote = snapshot.quote;
      kline = snapshot.bars;
    } else {
      warnings.push("报告日之前没有可用的行情K线。");
    }
  } else {
    warnings.push("行情暂时取不到，报告里的行情节留空。");
  }

  const articles = [];
  if (announcementResult.status === "fulfilled") articles.push(...announcementResult.value);
  else warnings.push("上交所公告暂时取不到。");
  if (newsResult.status === "fulfilled") articles.push(...newsResult.value);
  else warnings.push("东方财富新闻暂时取不到。");

  if (marketResult.status === "rejected" && announcementResult.status === "rejected" && newsResult.status === "rejected") {
    throw new Error("行情、公告和新闻都没有取到，请稍后再生成。");
  }

  const clusters = clusterArticles(articles.map(classify));
  const stats = buildStats(clusters);
  const narrative = writeNarrative(formatCnDate(date), stats);

  return {
    id: date,
    companyName: COMPANY_NAME,
    code: CODE,
    date,
    createdAt,
    reviewedAt: null,
    sentAt: null,
    sentTo: null,
    quote,
    kline,
    clusters,
    stats,
    overview: narrative.overview,
    peak: narrative.peak,
    warnings,
  };
}
