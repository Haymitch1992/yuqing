import { GeneratePanel } from "@/components/generate-panel";
import { ReportListActions } from "@/components/report-list-actions";
import { listReports, readSettings } from "@/lib/store";
import { formatCnDate, formatCnDateTime, shanghaiToday } from "@/lib/time";
import { reportStatus } from "@/lib/types";
import { smtpReady } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [reports, settings] = await Promise.all([listReports(), readSettings()]);
  const today = shanghaiToday();

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8">
      <section className="grid gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">每日自动生成，也可手动再发</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#3f3a34]">
          每天 {settings.scheduleEnabled ? settings.scheduleTime : "（定时已关闭）"}（上海时间）会自动生成交控科技当日报告，并发到已保存的收件人；中午已有未发送草稿时，到点会重新采集后再发。
          也可以在这里手动生成，或打开预览后再发。当前发信{smtpReady(settings) ? "已配置" : "还没配置"}。
        </p>
      </section>

      <GeneratePanel today={today} />

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">已生成的报告</h2>
        {reports.length === 0 ? (
          <div className="border border-dashed border-[#cfc6b8] bg-white px-4 py-8 text-sm leading-6 text-[#3f3a34]">
            还没有报告。今天是 {formatCnDate(today)}。媒体报道通常记在发布当天，上交所公告记在披露日。可以先选择日期生成一份。
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
                      <ReportListActions id={report.id} sent={Boolean(report.sentAt)} />
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
