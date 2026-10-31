import {
  formatAmountWan,
  formatPct,
  formatPrice,
  formatShare,
  formatSigned,
  formatWanShou,
  formatYi,
  formatYiShares,
} from "@/lib/format";
import { priceChartCaption, renderPriceChartSvg } from "@/lib/price-chart";
import { formatCnDate, formatCnDateTime } from "@/lib/time";
import type { Cluster, KlineBar, Report } from "@/lib/types";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IBorderOptions,
} from "docx";
import sharp from "sharp";

const FONT = "微软雅黑";
const LINE = { style: BorderStyle.SINGLE, size: 4, color: "E6E0D6" } satisfies IBorderOptions;
const BORDERS = { top: LINE, bottom: LINE, left: LINE, right: LINE };
const HEADER_FILL = "FBF8F2";
const MUTED = "6B645B";
const DOWN = "C5362B";
const UP = "1F7A45";

function safe(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function run(text: string, options: { bold?: boolean; size?: number; color?: string } = {}): TextRun {
  return new TextRun({
    text: safe(text),
    font: FONT,
    size: options.size ?? 21,
    bold: options.bold,
    color: options.color,
  });
}

function paragraph(
  children: (TextRun | ExternalHyperlink)[],
  spacingAfter = 120,
  align?: (typeof AlignmentType)[keyof typeof AlignmentType],
): Paragraph {
  return new Paragraph({ spacing: { after: spacingAfter }, alignment: align, children });
}

function textParagraph(text: string, options: { bold?: boolean; size?: number; color?: string } = {}): Paragraph {
  return paragraph([run(text, options)]);
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  const major = level === HeadingLevel.HEADING_1;
  return new Paragraph({
    heading: level,
    spacing: { before: major ? 360 : 240, after: 120 },
    border: major
      ? { bottom: { style: BorderStyle.SINGLE, size: 12, color: "1C1917", space: 1 } }
      : undefined,
    children: [run(text, { bold: true, size: major ? 32 : 24 })],
  });
}

function cell(
  children: Paragraph[],
  options: { width?: number; fill?: string; span?: number } = {},
): TableCell {
  return new TableCell({
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    shading: options.fill ? { fill: options.fill } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    borders: BORDERS,
    columnSpan: options.span,
    children,
  });
}

function label(text: string, width: number): TableCell {
  return cell([textParagraph(text, { color: MUTED })], { width, fill: HEADER_FILL });
}

function value(text: string, width: number, color?: string): TableCell {
  return cell([textParagraph(text, { color })], { width });
}

function headerCell(text: string, width: number, align?: (typeof AlignmentType)[keyof typeof AlignmentType]): TableCell {
  return cell([paragraph([run(text, { bold: true, color: MUTED })], 40, align)], { width, fill: HEADER_FILL });
}

function grid(rows: TableRow[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

function tone(value: number): string | undefined {
  if (value < 0) return DOWN;
  if (value > 0) return UP;
  return undefined;
}

function quoteTable(report: Report): Table {
  const quote = report.quote;
  if (!quote) {
    return grid([
      new TableRow({
        children: [cell([textParagraph("这次没有取到行情。", { color: MUTED })], { span: 4 })],
      }),
    ]);
  }
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
  return grid(
    rows.map(
      (row) =>
        new TableRow({
          children: [
            label(row[0], 18),
            value(row[1], 32, row[0] === "涨跌额" ? tone(quote.change) : undefined),
            label(row[2], 18),
            value(row[3], 32, row[2] === "涨跌幅" ? tone(quote.changePct) : undefined),
          ],
        }),
    ),
  );
}

function shareTable(headers: [string, string, string, string], rows: { name: string; count: number; pct: number }[]): Table {
  const head = new TableRow({
    tableHeader: true,
    children: [
      headerCell(headers[0], 12),
      headerCell(headers[1], 48),
      headerCell(headers[2], 20, AlignmentType.RIGHT),
      headerCell(headers[3], 20, AlignmentType.RIGHT),
    ],
  });
  if (rows.length === 0) {
    return grid([
      head,
      new TableRow({
        children: [cell([textParagraph("当日没有可统计的条目。", { color: MUTED })], { span: 4 })],
      }),
    ]);
  }
  return grid([
    head,
    ...rows.map(
      (row, index) =>
        new TableRow({
          children: [
            value(String(index + 1), 12),
            value(row.name, 48),
            cell([paragraph([run(String(row.count))], 40, AlignmentType.RIGHT)], { width: 20 }),
            cell([paragraph([run(`${row.pct.toFixed(2)}%`)], 40, AlignmentType.RIGHT)], { width: 20 }),
          ],
        }),
    ),
  ]);
}

function titleContent(cluster: Cluster): Paragraph[] {
  const primary = cluster.primary;
  const title = /^https?:\/\//.test(primary.url)
    ? new ExternalHyperlink({
        link: primary.url,
        children: [run(primary.title, { color: "1C1917" })],
      })
    : run(primary.title);
  const paragraphs = [paragraph([title], 40)];
  if (primary.summary) paragraphs.push(textParagraph(primary.summary, { size: 18, color: MUTED }));
  const reprints = cluster.members.filter((member) => member.id !== primary.id);
  for (const member of reprints) {
    const labelText = `${member.source}：`;
    const link = /^https?:\/\//.test(member.url)
      ? new ExternalHyperlink({
          link: member.url,
          children: [run(member.title, { size: 18, color: MUTED })],
        })
      : run(member.title, { size: 18, color: MUTED });
    paragraphs.push(paragraph([run(labelText, { size: 18, color: MUTED }), link], 40));
  }
  return paragraphs;
}

function eventTable(clusters: Cluster[]): Table | Paragraph {
  if (clusters.length === 0) return textParagraph("当日没有列入这张表的事件。", { color: MUTED });
  const head = new TableRow({
    tableHeader: true,
    children: ["时间", "标题", "情感", "事件", "来源", "热度"].map((header, index) =>
      headerCell(header, [16, 40, 10, 10, 16, 8][index], index === 5 ? AlignmentType.RIGHT : undefined),
    ),
  });
  return grid([
    head,
    ...clusters.map(
      (cluster) =>
        new TableRow({
          children: [
            cell([textParagraph(cluster.primary.publishedAt.slice(0, 16))], { width: 16 }),
            cell(titleContent(cluster), { width: 40 }),
            cell([textParagraph(cluster.sentiment, { color: cluster.sentiment === "负面" ? DOWN : undefined })], { width: 10 }),
            cell([textParagraph(cluster.event)], { width: 10 }),
            cell([textParagraph(cluster.primary.source)], { width: 16 }),
            cell([paragraph([run(String(cluster.heat))], 40, AlignmentType.RIGHT)], { width: 8 }),
          ],
        }),
    ),
  ]);
}

async function priceChartImage(bars: KlineBar[], tradeDate: string): Promise<Buffer | null> {
  const svg = renderPriceChartSvg(bars, tradeDate);
  if (!svg) return null;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function renderReportDocx(report: Report): Promise<Buffer> {
  const quote = report.quote;
  const negative = report.clusters.filter((cluster) => cluster.sentiment === "负面");
  const children: (Paragraph | Table)[] = [
    textParagraph("交控科技股份有限公司 · 688015", { size: 18, color: MUTED }),
    new Paragraph({
      spacing: { after: 160 },
      children: [run("舆情日报", { bold: true, size: 44 })],
    }),
    textParagraph(`报告日：${formatCnDate(report.date)}　　证券代码：${report.code}`),
    textParagraph(`生成时间：${formatCnDateTime(report.createdAt)}　　传播 ${report.stats.spread} 条 · 事件 ${report.stats.events} 件`),
  ];

  for (const warning of report.warnings) {
    children.push(textParagraph(warning, { color: "8A5A00" }));
  }

  children.push(
    textParagraph(
      "只收录标题含「交控科技」或「688015」的信息。公告来自上交所当日披露。新闻来自东方财富搜索，并加上网易搜索、同花顺个股资讯和腾讯自选股个股资讯。今日头条、天眼查、雪球的公开页面当前打不开，报告里不单列这三家。热度是同题条数。数字与预览页是同一份统计结果。",
      { color: "3F3A34" },
    ),
    heading("一、行情概况", HeadingLevel.HEADING_1),
  );

  const chart = quote ? await priceChartImage(report.kline, quote.tradeDate) : null;
  if (chart && quote) {
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new ImageRun({
            type: "png",
            data: chart,
            transformation: { width: 640, height: 207 },
            altText: { title: "收盘价", description: priceChartCaption(report.kline.length, quote.tradeDate), name: "收盘价" },
          }),
        ],
      }),
      textParagraph(priceChartCaption(report.kline.length, quote.tradeDate), { size: 18, color: MUTED }),
    );
  }

  children.push(
    quoteTable(report),
    textParagraph(
      quote
        ? `以上为报告日当天或之前最后一个交易日的数据，截止 ${formatCnDate(quote.tradeDate)} 收盘。${quote.partial ? "这一天不是最新交易日，估值字段留空。" : "来源：腾讯行情。"}`
        : "这次没有取到行情。",
      { size: 18, color: MUTED },
    ),
    heading("二、舆情概况", HeadingLevel.HEADING_1),
    textParagraph(report.overview),
    textParagraph(report.peak),
    heading("情感分布（按事件）", HeadingLevel.HEADING_2),
    grid([
      new TableRow({
        tableHeader: true,
        children: [
          headerCell("情感", 40),
          headerCell("事件数", 30, AlignmentType.RIGHT),
          headerCell("占事件", 30, AlignmentType.RIGHT),
        ],
      }),
      ...(["正面", "负面", "中性"] as const).map((name) => {
        const count = name === "正面" ? report.stats.positive : name === "负面" ? report.stats.negative : report.stats.neutral;
        return new TableRow({
          children: [
            value(name, 40, name === "负面" ? DOWN : undefined),
            cell([paragraph([run(String(count))], 40, AlignmentType.RIGHT)], { width: 30 }),
            cell([paragraph([run(formatShare(count, report.stats.events))], 40, AlignmentType.RIGHT)], { width: 30 }),
          ],
        });
      }),
    ]),
    heading("渠道（按条数）", HeadingLevel.HEADING_2),
    shareTable(["序号", "渠道", "条数", "占比"], report.stats.channels),
    heading("媒体（按条数）", HeadingLevel.HEADING_2),
    shareTable(["序号", "媒体", "条数", "占比"], report.stats.media),
    heading("三、舆情明细", HeadingLevel.HEADING_1),
    heading("全部事件", HeadingLevel.HEADING_2),
    eventTable(report.clusters),
    heading("负面事件", HeadingLevel.HEADING_2),
    negative.length === 0 ? textParagraph("当日没有判为负面的事件。", { color: MUTED }) : eventTable(negative),
    textParagraph(
      "情感按标题规则判断：留置、减值、业绩下滑为负面，专利和中标为正面，其余中性。同题归并后，明细只列每件事件的首发稿，同题其余条目附在标题下。正文只保留摘要和原文链接。",
      { size: 18, color: MUTED },
    ),
  );

  const document = new Document({
    title: `交控科技舆情日报 ${report.date}`,
    creator: "交控科技舆情日报",
    styles: {
      default: {
        document: { run: { font: FONT, size: 21 } },
        heading1: { run: { font: FONT, size: 32, bold: true, color: "1C1917" } },
        heading2: { run: { font: FONT, size: 24, bold: true, color: "1C1917" } },
        hyperlink: { run: { font: FONT, color: "1C1917", underline: { type: "single" } } },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } },
        },
        children,
      },
    ],
  });
  return Packer.toBuffer(document);
}
