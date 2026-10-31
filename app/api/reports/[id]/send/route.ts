import { describeMailError, sendReportMail } from "@/lib/mail";
import { readReport, readSettings, writeReport, writeSettings } from "@/lib/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const report = await readReport(id);
  if (!report) return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  if (!report.reviewedAt) {
    return NextResponse.json({ error: "请先打开预览，再发送" }, { status: 400 });
  }
  const body = (await request.json().catch(() => null)) as { to?: string } | null;
  const to = body?.to?.trim() ?? "";
  if (!isEmail(to)) {
    return NextResponse.json({ error: "请填写有效的收件邮箱" }, { status: 400 });
  }
  const settings = await readSettings();
  if (!settings.smtp.host || !settings.smtp.user || !settings.smtp.pass) {
    return NextResponse.json({ error: "还没有配置发信邮箱，请先到设置里填写 SMTP" }, { status: 400 });
  }
  const origin = process.env.APP_ORIGIN || new URL(request.url).origin;
  try {
    await sendReportMail(settings, report, to, `${origin}/reports/${report.id}`);
  } catch (error) {
    console.error("[opinion] 报告邮件失败", describeMailError(error));
    return NextResponse.json({ error: `邮件没有发出：${describeMailError(error)}` }, { status: 502 });
  }
  report.sentAt = new Date().toISOString();
  report.sentTo = to;
  await writeReport(report);
  if (settings.recipient !== to) {
    settings.recipient = to;
    await writeSettings(settings);
  }
  return NextResponse.json({ sentAt: report.sentAt, sentTo: report.sentTo });
}
