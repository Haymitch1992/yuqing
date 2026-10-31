import type { Article, KlineBar, QuoteSnapshot } from "@/lib/types";

const COMPANY = "交控科技";
const CODE = "688015";
const SYMBOL = "sh688015";

async function getText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json,text/plain,*/*",
      ...headers,
    },
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${url}`);
  }
  return response.text();
}

function num(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

interface MarketPayload {
  quote: string[];
  kline: KlineBar[];
}

export async function fetchMarket(): Promise<MarketPayload> {
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${SYMBOL},day,,,60,qfq`;
  const payload = JSON.parse(await getText(url)) as {
    data?: Record<string, { qfqday?: string[][]; qt?: Record<string, string[]> }>;
  };
  const node = payload.data?.[SYMBOL];
  if (!node?.qfqday?.length || !node.qt?.[SYMBOL]) {
    throw new Error("行情返回为空");
  }
  const kline = node.qfqday.map((row) => ({
    date: row[0],
    open: Number(row[1]),
    close: Number(row[2]),
    high: Number(row[3]),
    low: Number(row[4]),
  }));
  return { quote: node.qt[SYMBOL], kline };
}

export function snapshotForDate(
  quote: string[],
  kline: KlineBar[],
  reportDate: string,
): { quote: QuoteSnapshot; bars: KlineBar[] } | null {
  const eligible = kline.filter((bar) => bar.date <= reportDate);
  if (eligible.length === 0) return null;
  const bars = eligible.slice(-20);
  const bar = eligible[eligible.length - 1];
  const prev = eligible.length > 1 ? eligible[eligible.length - 2] : null;
  const latest = kline[kline.length - 1];
  const useLive = bar.date === latest.date;

  if (!useLive) {
    const change = prev ? bar.close - prev.close : 0;
    const changePct = prev && prev.close ? (change / prev.close) * 100 : 0;
    return {
      bars,
      quote: {
        tradeDate: bar.date,
        close: bar.close,
        change,
        changePct,
        volumeShares: 0,
        high: bar.high,
        amountWan: null,
        low: bar.low,
        turnoverPct: null,
        peStatic: null,
        pb: null,
        peDynamic: null,
        volumeRatio: null,
        marketCapYi: null,
        totalShares: null,
        floatCapYi: null,
        floatShares: null,
        bps: null,
        dividendYield: null,
        partial: true,
      },
    };
  }

  const close = num(quote[3]) ?? bar.close;
  const change = num(quote[31]) ?? 0;
  const changePct = num(quote[32]) ?? 0;
  const pb = num(quote[46]);
  return {
    bars,
    quote: {
      tradeDate: bar.date,
      close,
      change,
      changePct,
      volumeShares: num(quote[6]) ?? 0,
      high: num(quote[33]) ?? bar.high,
      amountWan: num(quote[57]),
      low: num(quote[34]) ?? bar.low,
      turnoverPct: num(quote[38]),
      peStatic: num(quote[53]),
      pb,
      peDynamic: num(quote[67]),
      volumeRatio: num(quote[49]),
      marketCapYi: num(quote[44]),
      totalShares: num(quote[72]),
      floatCapYi: num(quote[45]),
      floatShares: num(quote[73]),
      bps: pb && close ? close / pb : null,
      dividendYield: num(quote[64]),
      partial: false,
    },
  };
}

interface SseAnnouncement {
  TITLE?: string;
  URL?: string;
  SSEDATE?: string;
  ADDDATE?: string;
  BULLETIN_TYPE?: string;
}

export async function fetchAnnouncements(reportDate: string): Promise<Article[]> {
  const url =
    "https://query.sse.com.cn/security/stock/queryCompanyBulletin.do?" +
    new URLSearchParams({
      isPagination: "true",
      "pageHelp.pageSize": "50",
      "pageHelp.pageNo": "1",
      "pageHelp.beginPage": "1",
      "pageHelp.cacheSize": "1",
      "pageHelp.endPage": "5",
      productId: CODE,
      securityType: "0101,120100,020100,020200,120200",
      reportType: "ALL",
      beginDate: reportDate,
      endDate: reportDate,
    }).toString();
  const payload = JSON.parse(
    await getText(url, { Referer: "https://www.sse.com.cn/" }),
  ) as { pageHelp?: { data?: SseAnnouncement[] | null } };
  const rows = payload.pageHelp?.data ?? [];
  return rows
    .filter((row) => row.TITLE && row.SSEDATE?.slice(0, 10) === reportDate)
    .map((row, index) => ({
      id: `ann-${index}-${row.URL ?? row.TITLE}`,
      title: row.TITLE!.trim(),
      url: row.URL?.startsWith("http")
        ? row.URL
        : `https://www.sse.com.cn${row.URL ?? ""}`,
      publishedAt: row.ADDDATE || `${reportDate} 00:00:00`,
      source: "上交所",
      channel: "公告" as const,
      summary: row.BULLETIN_TYPE ? `公告类型：${row.BULLETIN_TYPE}` : "上交所披露公告",
      sentiment: "中性" as const,
      event: "其他",
    }));
}

interface EastmoneyHit {
  date?: string;
  title?: string;
  content?: string;
  mediaName?: string;
  url?: string;
}

async function searchEastmoney(keyword: string, reportDate: string): Promise<EastmoneyHit[]> {
  const found: EastmoneyHit[] = [];
  for (let page = 1; page <= 5; page += 1) {
    const param = {
      uid: "",
      keyword,
      type: ["cmsArticleWebOld"],
      client: "web",
      clientType: "web",
      clientVersion: "curr",
      param: {
        cmsArticleWebOld: {
          searchScope: "default",
          sort: "time",
          pageIndex: page,
          pageSize: 20,
          preTag: "",
          postTag: "",
        },
      },
    };
    const url =
      "https://search-api-web.eastmoney.com/search/jsonp?cb=&param=" +
      encodeURIComponent(JSON.stringify(param));
    const payload = JSON.parse(
      await getText(url, { Referer: "https://so.eastmoney.com/" }),
    ) as { result?: { cmsArticleWebOld?: EastmoneyHit[] } };
    const batch = payload.result?.cmsArticleWebOld ?? [];
    if (batch.length === 0) break;
    for (const item of batch) {
      if (item.date?.slice(0, 10) === reportDate) found.push(item);
    }
    if (batch.every((item) => (item.date ?? "") < reportDate)) break;
  }
  return found;
}

function isStrongTitle(title: string): boolean {
  return title.includes(COMPANY) || title.includes(CODE);
}

export async function fetchNews(reportDate: string): Promise<Article[]> {
  const [byName, byCode] = await Promise.all([
    searchEastmoney(COMPANY, reportDate),
    searchEastmoney(CODE, reportDate),
  ]);
  const seen = new Set<string>();
  const articles: Article[] = [];
  for (const item of [...byName, ...byCode]) {
    const title = (item.title ?? "").replace(/<[^>]+>/g, "").trim();
    const url = (item.url ?? "").trim();
    if (!title || !url || !isStrongTitle(title) || seen.has(url)) continue;
    seen.add(url);
    articles.push({
      id: `news-${url}`,
      title,
      url,
      publishedAt: item.date ?? `${reportDate} 00:00:00`,
      source: item.mediaName?.trim() || "东方财富",
      channel: "网站",
      summary: (item.content ?? "").replace(/\s+/g, " ").trim().slice(0, 280),
      sentiment: "中性",
      event: "其他",
    });
  }
  return articles;
}
