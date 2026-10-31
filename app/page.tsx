import { GeneratePanel } from "@/components/generate-panel";
import { listReports, readSettings } from "@/lib/store";
import { addDays, formatCnDate, formatCnDateTime, shanghaiToday } from "@/lib/time";
import { reportStatus } from "@/lib/types";
import { smtpReady } from "@/lib/mail";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [reports, settings] = await Promise.all([listReports(), readSettings()]);
  const today = shanghaiToday();
  const yesterday = addDays(today, -1);

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8">
      <section className="grid gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">先出草稿，看过再发</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#3f3a34]">
          每天 {settings.scheduleEnabled ? settings.scheduleTime : "（定时已关闭）"}（上海时间）会生成交控科技当日草稿。
          打开预览之后，才能发到邮箱。当前发信{smtpReady(settings) ? "已配置" : "还没配置"}。
        </p>
      </section>

      <GeneratePanel today={today} yesterday={yesterday} />

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">已生成的报告</h2>
        {reports.length === 0 ? (
          <div className="border border-dashed border-[#cfc6b8] bg-white px-4 py-8 text-sm leading-6 text-[#3f3a34]">
            还没有报告。今天是 {formatCnDate(today)}。媒体报道通常记在发布当天，上交所公告记在披露日。可以先生成昨天和今天各一份。
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#e6e0d6] bg-white">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr className="bg-[#fbf8f2] text-left text-[#6b645b]">
                  {["报告日", "事件", "负面", "状态", "生成时间", ""].map((header) => (
                    <th key={header || "action"} className="px-3 py-2 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const status = reportStatus(report);
                  return (
                    <tr key={report.id} className="border-t border-[#e6e0d6]">
                      <td className="px-3 py-3">{formatCnDate(report.date)}</td>
                      <td className="px-3 py-3 tabular-nums">{report.stats.events}</td>
                      <td className="px-3 py-3 tabular-nums">{report.stats.negative}</td>
                      <td className="px-3 py-3">
                        {status}
                        {report.sentTo ? <span className="block break-all text-xs text-[#6b645b]">{report.sentTo}</span> : null}
                      </td>
                      <td className="px-3 py-3 text-[#6b645b]">{formatCnDateTime(report.createdAt)}</td>
                      <td className="px-3 py-3 text-right">
                        <Link href={`/reports/${report.id}`} className="underline underline-offset-4">
                          预览
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
