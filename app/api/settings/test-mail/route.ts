import { sendReportMail, smtpReady } from "@/lib/mail";
import { readSettings } from "@/lib/store";
import type { Report } from "@/lib/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { to?: string } | null;
  const to = body?.to?.trim() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "请填写有效的收件邮箱" }, { status: 400 });
  }
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
    await sendReportMail(settings, sample, to, new URL("/", request.url).origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "发送失败";
    return NextResponse.json({ error: `测试信没有发出：${message}` }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
