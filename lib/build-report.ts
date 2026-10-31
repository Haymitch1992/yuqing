import { classify, clusterArticles, buildStats, writeNarrative } from "@/lib/analyze";
import { fetchAnnouncements, fetchMarket, fetchNews, snapshotForDate } from "@/lib/collect";
import { fetchOutletNews } from "@/lib/outlets";
import { formatCnDate } from "@/lib/time";
import type { Article, Report } from "@/lib/types";

const COMPANY_NAME = "交控科技股份有限公司";
const CODE = "688015";

export async function buildReport(date: string, createdAt = new Date().toISOString()): Promise<Report> {
  const warnings: string[] = [];
  const [marketResult, announcementResult, newsResult, outletResult] = await Promise.allSettled([
    fetchMarket(),
    fetchAnnouncements(date),
    fetchNews(date),
    fetchOutletNews(date),
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

  const articles: Article[] = [];
  const seenUrls = new Set<string>();
  const addArticles = (incoming: Article[]) => {
    for (const item of incoming) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);
      articles.push(item);
    }
  };
  if (announcementResult.status === "fulfilled") addArticles(announcementResult.value);
  else warnings.push("上交所公告暂时取不到。");
  if (newsResult.status === "fulfilled") addArticles(newsResult.value);
  else warnings.push("东方财富新闻暂时取不到。");
  if (outletResult.status === "fulfilled") {
    warnings.push(...outletResult.value.warnings);
    addArticles(outletResult.value.articles);
  } else {
    warnings.push("网易、同花顺、腾讯自选股暂时取不到。");
  }

  const outletsEmpty = outletResult.status !== "fulfilled" || outletResult.value.articles.length === 0;
  if (
    marketResult.status === "rejected" &&
    announcementResult.status === "rejected" &&
    newsResult.status === "rejected" &&
    outletsEmpty
  ) {
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
