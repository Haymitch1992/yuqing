import { buildReport } from "@/lib/build-report";
import { listReports, readReport, writeReport } from "@/lib/store";
import { addDays, isIsoDate, shanghaiToday } from "@/lib/time";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const reports = await listReports();
  return NextResponse.json({
    today: shanghaiToday(),
    reports: reports.map((report) => ({
      id: report.id,
      date: report.date,
      createdAt: report.createdAt,
      reviewedAt: report.reviewedAt,
      sentAt: report.sentAt,
      sentTo: report.sentTo,
      events: report.stats.events,
      negative: report.stats.negative,
      spread: report.stats.spread,
    })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { date?: string; refresh?: boolean } | null;
  const date = body?.date ?? "";
  if (!isIsoDate(date)) {
    return NextResponse.json({ error: "日期格式应为 YYYY-MM-DD" }, { status: 400 });
  }
  const today = shanghaiToday();
  if (date > today || date < addDays(today, -366)) {
    return NextResponse.json({ error: "只能生成今天或过去一年内的报告" }, { status: 400 });
  }
  const existing = await readReport(date);
  if (existing?.sentAt) {
    if (body?.refresh) {
      return NextResponse.json({ error: "这份报告已经发送，不能覆盖" }, { status: 409 });
    }
    return NextResponse.json({ id: existing.id, existed: true });
  }
  try {
    const report = await buildReport(date);
    await writeReport(report);
    return NextResponse.json({ id: report.id, existed: Boolean(existing), refreshed: Boolean(existing) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
