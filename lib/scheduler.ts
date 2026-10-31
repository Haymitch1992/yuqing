import { buildReport } from "@/lib/build-report";
import { formatRecipients } from "@/lib/recipients";
import { sendReportMail, smtpReady } from "@/lib/mail";
import { readReport, readSchedulerStamp, readSettings, writeReport, writeSchedulerStamp } from "@/lib/store";
import { shanghaiClock, shanghaiToday } from "@/lib/time";

let started = false;
let running = false;
let lastFailure = 0;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const settings = await readSettings();
    if (!settings.scheduleEnabled) return;
    const today = shanghaiToday();
    if (shanghaiClock() < settings.scheduleTime) return;
    if ((await readSchedulerStamp()) === today) return;
    if (Date.now() - lastFailure < 10 * 60 * 1000) return;

    const existing = await readReport(today);
    if (existing?.sentAt) {
      await writeSchedulerStamp(today);
      return;
    }

    const report = await buildReport(today);
    report.reviewedAt = new Date().toISOString();
    await writeReport(report);

    if (!smtpReady(settings) || settings.recipients.length === 0) {
      await writeSchedulerStamp(today);
      console.warn(
        `[opinion] 已生成 ${today} 的报告，但未自动发信：请在发信设置里补全 SMTP 和收件人。`,
      );
      return;
    }

    try {
      await sendReportMail(settings, report, settings.recipients);
    } catch (error) {
      lastFailure = Date.now();
      console.error("[opinion] 定时发信失败", error);
      return;
    }

    report.sentAt = new Date().toISOString();
    report.sentTo = formatRecipients(settings.recipients);
    await writeReport(report);
    await writeSchedulerStamp(today);
    console.log(`[opinion] 已生成并发送 ${today} 的日报到 ${report.sentTo}`);
  } catch (error) {
    lastFailure = Date.now();
    console.error("[opinion] 定时生成失败", error);
  } finally {
    running = false;
  }
}

export function startScheduler(): void {
  if (started) return;
  started = true;
  setInterval(() => {
    void tick();
  }, 30_000);
  void tick();
}
