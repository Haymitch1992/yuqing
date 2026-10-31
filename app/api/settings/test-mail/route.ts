import { describeMailError, sendReportMail, smtpReady } from "@/lib/mail";
import { formatRecipients, parseRecipients, recipientFieldError } from "@/lib/recipients";
import { readSettings } from "@/lib/store";
import type { Report } from "@/lib/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { to?: string | string[] } | null;
  const recipientError = recipientFieldError(body?.to ?? "", true);
  if (recipientError) return NextResponse.json({ error: recipientError }, { status: 400 });
  const to = parseRecipients(body?.to ?? "").emails;
  const settings = await readSettings();
  if (!smtpReady(settings)) {
    return NextResponse.json({ error: "请先保存完整的 SMTP 配置" }, { status: 400 });
  }
  const sample = {
    id: "mail-test",
    companyName: "交控科技股份有限公司",
    code: "688015",
    date: "测试",
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    sentAt: null,
    sentTo: null,
    quote: null,
    kline: [],
    clusters: [],
    stats: {
      spread: 0,
      events: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      dominant: "无",
      channels: [],
      media: [],
      hottestTitle: null,
      hottestSource: null,
      hottestHeat: 0,
    },
    overview: "这是一封发信测试，用来确认邮箱配置可用。",
    peak: "正式日报会在预览确认后发送。",
    warnings: [],
  } satisfies Report;
  try {
    await sendReportMail(settings, sample, to);
  } catch (error) {
    console.error("[opinion] 测试信失败", describeMailError(error));
    return NextResponse.json({ error: `测试信没有发出：${describeMailError(error)}` }, { status: 502 });
  }
  return NextResponse.json({ ok: true, to: formatRecipients(to) });
}
