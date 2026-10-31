import type { Article, Cluster, ReportStats, Sentiment } from "@/lib/types";

const NEGATIVE = ["利空", "下滑", "下降", "亏损", "跌停", "减持", "立案", "诉讼", "仲裁", "拖欠", "暴跌"];
const POSITIVE = ["增长", "上涨", "预增", "回购", "增持", "中标", "专利", "扭亏"];

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

export function classify(article: Article): Article {
  const title = article.title;
  if (title.includes("留置")) {
    return { ...article, event: "治理", sentiment: "负面" };
  }
  if (title.includes("董事长") && (title.includes("辞") || title.includes("离任"))) {
    return { ...article, event: "治理", sentiment: "负面" };
  }
  if (title.includes("减值")) {
    return { ...article, event: "财务", sentiment: "负面" };
  }
  if (/季报|季度报告|净利润|营收|业绩/.test(title)) {
    return {
      ...article,
      event: "业绩",
      sentiment: hasAny(title, NEGATIVE) ? "负面" : "中性",
    };
  }
  if (/总经理|聘任/.test(title)) {
    return {
      ...article,
      event: "人事",
      sentiment: hasAny(title, NEGATIVE) ? "负面" : "中性",
    };
  }
  if (/募投|募集资金/.test(title)) {
    return { ...article, event: "募投", sentiment: "中性" };
  }
  if (title.includes("中标")) {
    return { ...article, event: "经营", sentiment: "正面" };
  }
  if (title.includes("专利")) {
    return { ...article, event: "研发", sentiment: "正面" };
  }
  if (hasAny(title, NEGATIVE)) return { ...article, event: "其他", sentiment: "负面" };
  if (hasAny(title, POSITIVE)) return { ...article, event: "其他", sentiment: "正面" };
  return { ...article, event: "其他", sentiment: "中性" };
}

function normalizeTitle(title: string): string {
  return title
    .replace(/交控科技股份有限公司/g, "")
    .replace(/交控科技/g, "")
    .replace(/688015(\.SH)?/gi, "")
    .replace(/[\s\u3000【】[\]（）()：:，,。.!！?？、""“”《》]/g, "")
    .toLowerCase();
}

function bigrams(text: string): Set<string> {
  const grams = new Set<string>();
  for (let index = 0; index < text.length - 1; index += 1) {
    grams.add(text.slice(index, index + 2));
  }
  return grams;
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  for (const gram of left) {
    if (right.has(gram)) overlap += 1;
  }
  return overlap / (left.size + right.size - overlap);
}

function similar(left: string, right: string): boolean {
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length >= 6 && right.length >= 6 && (left.includes(right) || right.includes(left))) {
    return true;
  }
  return jaccard(bigrams(left), bigrams(right)) >= 0.55;
}

function majoritySentiment(members: Article[]): Sentiment {
  const counts = { 正面: 0, 中性: 0, 负面: 0 };
  for (const member of members) counts[member.sentiment] += 1;
  if (counts.负面 >= counts.正面 && counts.负面 >= counts.中性 && counts.负面 > 0) return "负面";
  if (counts.正面 >= counts.中性 && counts.正面 > 0) return "正面";
  return "中性";
}

function pickPrimary(members: Article[]): Article {
  return [...members].sort((left, right) => {
    const byTime = left.publishedAt.localeCompare(right.publishedAt);
    if (byTime !== 0) return byTime;
    if (left.channel === right.channel) return 0;
    return left.channel === "公告" ? -1 : 1;
  })[0];
}

export function clusterArticles(articles: Article[]): Cluster[] {
  const groups: Article[][] = [];
  const ordered = [...articles].sort((left, right) => left.publishedAt.localeCompare(right.publishedAt));
  for (const article of ordered) {
    const normalized = normalizeTitle(article.title);
    const group = groups.find(
      (candidate) =>
        candidate[0].event === article.event &&
        candidate.some((member) => similar(normalized, normalizeTitle(member.title))),
    );
    if (group) group.push(article);
    else groups.push([article]);
  }
  return groups
    .map((members, index) => {
      const primary = pickPrimary(members);
      return {
        id: `c${index + 1}`,
        sentiment: majoritySentiment(members),
        event: primary.event,
        heat: members.length,
        primary,
        members,
      };
    })
    .sort((left, right) => right.primary.publishedAt.localeCompare(left.primary.publishedAt));
}

function shareRows(names: string[]): { name: string; count: number; pct: number }[] {
  const total = names.length;
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh"))
    .map(([name, count]) => ({
      name,
      count,
      pct: total ? (count / total) * 100 : 0,
    }));
}

export function buildStats(clusters: Cluster[]): ReportStats {
  const articles = clusters.flatMap((cluster) => cluster.members);
  const positive = clusters.filter((cluster) => cluster.sentiment === "正面").length;
  const neutral = clusters.filter((cluster) => cluster.sentiment === "中性").length;
  const negative = clusters.filter((cluster) => cluster.sentiment === "负面").length;
  let dominant: ReportStats["dominant"] = "无";
  if (clusters.length > 0) {
    const ranked = [
      { name: "负面" as const, count: negative },
      { name: "中性" as const, count: neutral },
      { name: "正面" as const, count: positive },
    ].sort((left, right) => right.count - left.count);
    dominant = ranked[0].count === ranked[1]?.count ? "中性" : ranked[0].name;
  }
  const hottest = [...clusters].sort((left, right) => right.heat - left.heat || left.primary.publishedAt.localeCompare(right.primary.publishedAt))[0];
  return {
    spread: articles.length,
    events: clusters.length,
    positive,
    neutral,
    negative,
    dominant,
    channels: shareRows(articles.map((article) => article.channel)),
    media: shareRows(articles.map((article) => article.source)),
    hottestTitle: hottest?.primary.title ?? null,
    hottestSource: hottest?.primary.source ?? null,
    hottestHeat: hottest?.heat ?? 0,
  };
}

export function writeNarrative(dateLabel: string, stats: ReportStats): { overview: string; peak: string } {
  if (stats.events === 0) {
    return {
      overview: `报告日 ${dateLabel}，没有监测到标题含「交控科技」或「688015」的强相关信息。`,
      peak: "当日没有可排序的热点事件。",
    };
  }
  const dominant = stats.dominant === "无" ? "中性" : stats.dominant;
  return {
    overview: `报告日 ${dateLabel}，监测到与交控科技股份有限公司强相关的信息共 ${stats.spread} 条，归并为 ${stats.events} 件事件，其中负面事件 ${stats.negative} 件。当日事件以${dominant}为主。`,
    peak: stats.hottestTitle
      ? `热度最高的事件来自${stats.hottestSource ?? "未知来源"}发布的「${stats.hottestTitle}」，同题信息 ${stats.hottestHeat} 条。`
      : "当日没有可排序的热点事件。",
  };
}
