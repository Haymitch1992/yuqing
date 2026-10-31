import { smtpReady } from "@/lib/mail";
import { parseRecipients, recipientFieldError } from "@/lib/recipients";
import { readSettings, writeSettings } from "@/lib/store";
import type { AppSettings } from "@/lib/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await readSettings();
  return NextResponse.json({
    scheduleEnabled: settings.scheduleEnabled,
    scheduleTime: settings.scheduleTime,
    recipients: settings.recipients,
    smtpReady: smtpReady(settings),
    smtp: {
      host: settings.smtp.host,
      port: settings.smtp.port,
      secure: settings.smtp.secure,
      user: settings.smtp.user,
      from: settings.smtp.from,
      hasPassword: Boolean(settings.smtp.pass),
    },
  });
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | (Omit<AppSettings, "smtp" | "recipients"> & {
        recipients?: string | string[];
        recipient?: string;
        smtp: Omit<AppSettings["smtp"], "pass"> & { pass?: string };
      })
    | null;
  if (!body) return NextResponse.json({ error: "设置格式不正确" }, { status: 400 });
  if (!/^\d{2}:\d{2}$/.test(body.scheduleTime)) {
    return NextResponse.json({ error: "生成时间应为 HH:mm" }, { status: 400 });
  }
  const recipientInput = body.recipients ?? body.recipient ?? "";
  const recipientError = recipientFieldError(recipientInput, false);
  if (recipientError) return NextResponse.json({ error: recipientError }, { status: 400 });
  const current = await readSettings();
  const nextPass = body.smtp.pass?.trim() ? body.smtp.pass : current.smtp.pass;
  const port = Number(body.smtp.port);
  const settings: AppSettings = {
    scheduleEnabled: Boolean(body.scheduleEnabled),
    scheduleTime: body.scheduleTime,
    recipients: parseRecipients(recipientInput).emails,
    smtp: {
      host: body.smtp.host?.trim() ?? "",
      port: Number.isFinite(port) ? port : 465,
      secure: Boolean(body.smtp.secure),
      user: body.smtp.user?.trim() ?? "",
      pass: nextPass,
      from: body.smtp.from?.trim() ?? "",
    },
  };
  await writeSettings(settings);
  return NextResponse.json({ ok: true, smtpReady: Boolean(settings.smtp.host && settings.smtp.user && settings.smtp.pass) });
}
