import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseRecipients } from "@/lib/recipients";
import type { AppSettings, Report } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const reportDir = path.join(dataDir, "reports");

const defaultSettings: AppSettings = {
  scheduleEnabled: true,
  scheduleTime: "17:00",
  recipients: [],
  smtp: {
    host: "",
    port: 465,
    secure: true,
    user: "",
    pass: "",
    from: "",
  },
};

async function ensureDirs(): Promise<void> {
  await mkdir(reportDir, { recursive: true });
}

export async function readSettings(): Promise<AppSettings> {
  await ensureDirs();
  try {
    const raw = await readFile(path.join(dataDir, "settings.json"), "utf8");
    const parsed = JSON.parse(raw) as Partial<AppSettings> & { recipient?: string };
    const storedRecipients = parsed.recipients?.length ? parsed.recipients : (parsed.recipient ?? "");
    return {
      ...defaultSettings,
      scheduleEnabled:
        typeof parsed.scheduleEnabled === "boolean" ? parsed.scheduleEnabled : defaultSettings.scheduleEnabled,
      scheduleTime: parsed.scheduleTime || defaultSettings.scheduleTime,
      recipients: parseRecipients(storedRecipients).emails,
      smtp: { ...defaultSettings.smtp, ...parsed.smtp },
    };
  } catch {
    return structuredClone(defaultSettings);
  }
}

export async function writeSettings(settings: AppSettings): Promise<void> {
  await ensureDirs();
  await writeFile(path.join(dataDir, "settings.json"), JSON.stringify(settings, null, 2));
}

export async function readReport(id: string): Promise<Report | null> {
  try {
    const raw = await readFile(path.join(reportDir, `${id}.json`), "utf8");
    return JSON.parse(raw) as Report;
  } catch {
    return null;
  }
}

export async function writeReport(report: Report): Promise<void> {
  await ensureDirs();
  await writeFile(path.join(reportDir, `${report.id}.json`), JSON.stringify(report, null, 2));
}

export async function listReports(): Promise<Report[]> {
  await ensureDirs();
  const files = await readdir(reportDir);
  const reports: Report[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const report = await readReport(file.replace(/\.json$/, ""));
    if (report) reports.push(report);
  }
  return reports.sort((left, right) => right.date.localeCompare(left.date));
}

export async function readSchedulerStamp(): Promise<string | null> {
  try {
    const raw = await readFile(path.join(dataDir, "scheduler.json"), "utf8");
    return (JSON.parse(raw) as { lastRunDate?: string }).lastRunDate ?? null;
  } catch {
    return null;
  }
}

export async function writeSchedulerStamp(date: string): Promise<void> {
  await ensureDirs();
  await writeFile(path.join(dataDir, "scheduler.json"), JSON.stringify({ lastRunDate: date }));
}
