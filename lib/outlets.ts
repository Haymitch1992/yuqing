import { isStrongTitle } from "@/lib/collect";
import type { Article } from "@/lib/types";

const COMPANY = "交控科技";
const CODE = "688015";

async function getText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json,text/html,*/*",
      ...headers,
    },
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

function cleanText(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function article(input: {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  channel: Article["channel"];
  summary: string;
}): Article {
  return {
    ...input,
    sentiment: "中性",
    event: "其他",
  };
}

function clockOnDate(date: string, label: string): string {
  const clock = label.match(/(\d{2}:\d{2})/);
  if (clock && (/^\d{2}-\d{2}/.test(label.trim()) || label.includes("昨天"))) {
    return `${date} ${clock[1]}:00`;
  }
  return `${date} 23:59:59`;
}

async function fetchNetease(reportDate: string): Promise<Article[]> {
  const articles: Article[] = [];
  const seen = new Set<string>();
  for (const keyword of [COMPANY, CODE]) {
    const html = await getText(`https://www.163.com/search?keyword=${encodeURIComponent(keyword)}`, {
      Referer: "https://www.163.com/",
    });
    for (const block of html.split('<div class="keyword_new ').slice(1)) {
      const url = block.match(/<h3>\s*<a href="([^"]+)"/)?.[1];
      const heading = block.match(/<h3>([\s\S]*?)<\/h3>/)?.[1];
      const time = block.match(/class="keyword_time">\s*([^<]+)/)?.[1]?.trim() ?? "";
      const title = heading ? cleanText(heading) : "";
      const day = time.slice(0, 10);
      if (!url || !title || day !== reportDate || !isStrongTitle(title) || seen.has(url)) continue;
      seen.add(url);
      const publishedAt = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(time)
        ? time.slice(0, 19)
        : /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(time)
          ? `${time.slice(0, 16)}:00`
          : `${day} 23:59:59`;
      articles.push(
        article({
          id: `netease-${url}`,
          title,
          url,
          publishedAt,
          source: "网易",
          channel: "网站",
          summary: "网易新闻搜索。站点只给出发布日期。",
        }),
      );
    }
  }
  return articles;
}

async function fetchTonghuashun(reportDate: string): Promise<Article[]> {
  const html = await getText("https://stockpage.10jqka.com.cn/688015/", {
    Referer: "https://www.10jqka.com.cn/",
  });
  const normalized = html.replace(/\\"/g, '"').replace(/\\n/g, " ");
  const articles: Article[] = [];
  const seen = new Set<string>();
  for (const chunk of normalized.split('{"id":').slice(1)) {
    const title = cleanText(chunk.match(/"title":"([^"]*)"/)?.[1] ?? "");
    const url = chunk.match(/"jumpUrl":"(https:\/\/news\.10jqka\.com\.cn\/[^"]+)"/)?.[1];
    const stamp = url?.match(/\/(\d{4})(\d{2})(\d{2})\//);
    if (!title || !url || !stamp || seen.has(url) || !isStrongTitle(title)) continue;
    const date = `${stamp[1]}-${stamp[2]}-${stamp[3]}`;
    if (date !== reportDate) continue;
    seen.add(url);
    const timeLabel = chunk.match(/"timeLabel":"([^"]*)"/)?.[1] ?? "";
    const origin = chunk.match(/"source":"([^"]*)"/)?.[1];
    articles.push(
      article({
        id: `ths-${url}`,
        title,
        url,
        publishedAt: clockOnDate(date, timeLabel),
        source: "同花顺",
        channel: "网站",
        summary: origin ? `同花顺个股资讯，原媒体${origin}。` : "同花顺个股资讯。",
      }),
    );
  }
  return articles;
}

interface QqNewsItem {
  time?: string;
  title?: string;
  url?: string;
  src?: string;
  summary?: string;
  id?: string;
}

async function fetchZixuangu(reportDate: string): Promise<Article[]> {
  const articles: Article[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 6; page += 1) {
    const payload = JSON.parse(
      await getText(
        `https://proxy.finance.qq.com/ifzqgtimg/appstock/news/info/search?symbol=sh${CODE}&page=${page}&n=20&type=2`,
        { Referer: "https://gu.qq.com/" },
      ),
    ) as { data?: { data?: QqNewsItem[] } };
    const batch = payload.data?.data ?? [];
    if (batch.length === 0) break;
    let older = false;
    for (const item of batch) {
      const title = cleanText(item.title ?? "");
      const url = (item.url ?? "").trim();
      const day = (item.time ?? "").slice(0, 10);
      if (day && day < reportDate) older = true;
      if (!title || !url || day !== reportDate || !isStrongTitle(title) || seen.has(url)) continue;
      seen.add(url);
      const summary = cleanText(item.summary ?? "").slice(0, 180);
      articles.push(
        article({
          id: `qq-${item.id ?? url}`,
          title,
          url,
          publishedAt: item.time && item.time.length >= 16 ? item.time.slice(0, 19) : `${reportDate} 23:59:59`,
          source: "腾讯自选股",
          channel: "APP",
          summary: item.src ? `腾讯自选股收录，原媒体${item.src}。${summary}` : summary || "腾讯自选股个股资讯。",
        }),
      );
    }
    if (older) break;
  }
  return articles;
}

const outlets: Array<[string, (reportDate: string) => Promise<Article[]>]> = [
  ["网易", fetchNetease],
  ["同花顺", fetchTonghuashun],
  ["腾讯自选股", fetchZixuangu],
];

export async function fetchOutletNews(reportDate: string): Promise<{ articles: Article[]; warnings: string[] }> {
  const settled = await Promise.allSettled(outlets.map(([, fetchOutlet]) => fetchOutlet(reportDate)));
  const articles: Article[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  settled.forEach((result, index) => {
    const name = outlets[index][0];
    if (result.status === "rejected") {
      warnings.push(`${name}暂时取不到。`);
      return;
    }
    for (const item of result.value) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      articles.push(item);
    }
  });
  return { articles, warnings };
}
