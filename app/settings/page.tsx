import { SettingsForm } from "@/components/settings-form";
import { readSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await readSettings();
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">发信设置</h1>
        <p className="mt-2 text-sm leading-6 text-[#3f3a34]">
          定时任务只负责把当天的草稿放进列表。邮件一定要在预览页确认后才发出。
        </p>
      </div>
      <SettingsForm
        initial={{
          scheduleEnabled: settings.scheduleEnabled,
          scheduleTime: settings.scheduleTime,
          recipients: settings.recipients.join("\n"),
          smtpReady: Boolean(settings.smtp.host && settings.smtp.user && settings.smtp.pass),
          smtp: {
            host: settings.smtp.host,
            port: settings.smtp.port,
            secure: settings.smtp.secure,
            user: settings.smtp.user,
            from: settings.smtp.from,
            hasPassword: Boolean(settings.smtp.pass),
          },
        }}
      />
    </main>
  );
}
