import { buildReport } from "@/lib/build-report";
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
    await writeReport(report);
    await writeSchedulerStamp(today);
    console.log(
      existing
        ? `[opinion] 已更新 ${today} 的草稿，等待预览`
        : `[opinion] 已生成 ${today} 的草稿，等待预览`,
    );
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
