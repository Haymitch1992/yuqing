import { describeMailError, sendReportMail } from "@/lib/mail";
import { formatRecipients, parseRecipients, recipientFieldError } from "@/lib/recipients";
import { readReport, readSettings, writeReport, writeSettings } from "@/lib/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
  const body = (await request.json().catch(() => null)) as { to?: string | string[] } | null;
  const recipientError = recipientFieldError(body?.to ?? "", true);
  if (recipientError) return NextResponse.json({ error: recipientError }, { status: 400 });
  const recipients = parseRecipients(body?.to ?? "").emails;
  const settings = await readSettings();
  if (!settings.smtp.host || !settings.smtp.user || !settings.smtp.pass) {
    return NextResponse.json({ error: "还没有配置发信邮箱，请先到设置里填写 SMTP" }, { status: 400 });
  }
  try {
    await sendReportMail(settings, report, recipients);
  } catch (error) {
    console.error("[opinion] 报告邮件失败", describeMailError(error));
    return NextResponse.json({ error: `邮件没有发出：${describeMailError(error)}` }, { status: 502 });
  }
  report.sentAt = new Date().toISOString();
  report.sentTo = formatRecipients(recipients);
  await writeReport(report);
  const previous = settings.recipients.map((item) => item.toLowerCase()).join("\n");
  const next = recipients.map((item) => item.toLowerCase()).join("\n");
  if (previous !== next) {
    settings.recipients = recipients;
    await writeSettings(settings);
  }
  return NextResponse.json({ sentAt: report.sentAt, sentTo: report.sentTo });
}
