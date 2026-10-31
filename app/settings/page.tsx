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
          定时任务到点会自动生成当天报告并发送邮件。也可以在列表或预览页手动再发一封。
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
