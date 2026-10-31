"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export interface SettingsFormValue {
  scheduleEnabled: boolean;
  scheduleTime: string;
  recipient: string;
  smtpReady: boolean;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    from: string;
    hasPassword: boolean;
  };
}

export function SettingsForm({ initial }: { initial: SettingsFormValue }) {
  const [scheduleEnabled, setScheduleEnabled] = useState(initial.scheduleEnabled);
  const [scheduleTime, setScheduleTime] = useState(initial.scheduleTime);
  const [recipient, setRecipient] = useState(initial.recipient);
  const [host, setHost] = useState(initial.smtp.host);
  const [port, setPort] = useState(String(initial.smtp.port));
  const [secure, setSecure] = useState(initial.smtp.secure);
  const [user, setUser] = useState(initial.smtp.user);
  const [from, setFrom] = useState(initial.smtp.from);
  const [pass, setPass] = useState("");
  const [hasPassword, setHasPassword] = useState(initial.smtp.hasPassword);
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setPending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleEnabled,
          scheduleTime,
          recipient,
          smtp: { host, port: Number(port), secure, user, from, pass },
        }),
      });
      const payload = (await response.json()) as { error?: string; smtpReady?: boolean };
      if (!response.ok) {
        setError(payload.error ?? "保存失败");
        return;
      }
      if (pass.trim()) setHasPassword(true);
      setPass("");
      setMessage(payload.smtpReady ? "已保存，发信配置完整。" : "已保存。发信还缺主机、账号或授权码。");
    } catch {
      setError("网络中断，设置没有保存");
    } finally {
      setPending(false);
    }
  }

  async function testMail() {
    setTesting(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/settings/test-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipient }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "测试信没有发出");
        return;
      }
      setMessage(`测试信已发到 ${recipient}`);
    } catch {
      setError("网络中断，测试信没有发出");
    } finally {
      setTesting(false);
    }
  }

  return (
    <form
      className="grid gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <section className="grid gap-4 border border-[#e6e0d6] bg-white p-4">
        <h2 className="text-lg font-semibold">每天何时生成草稿</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={scheduleEnabled}
            onChange={(event) => setScheduleEnabled(event.target.checked)}
          />
          开启定时生成。到点只生成草稿，不会自动发信。
        </label>
        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="schedule-time">上海时间</Label>
          <Input
            id="schedule-time"
            type="time"
            value={scheduleTime}
            onChange={(event) => setScheduleTime(event.target.value)}
            required
          />
        </div>
        <p className="text-sm text-[#6b645b]">
          默认 20:30，是为了赶上当晚的公告。服务进程要一直开着，定时才会跑。
        </p>
      </section>

      <section className="grid gap-4 border border-[#e6e0d6] bg-white p-4">
        <h2 className="text-lg font-semibold">发信邮箱</h2>
        <div className="grid gap-2">
          <Label htmlFor="recipient">默认收件人</Label>
          <Input
            id="recipient"
            type="email"
            value={recipient}
            placeholder="name@example.com"
            onChange={(event) => setRecipient(event.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="smtp-host">SMTP 主机</Label>
            <Input id="smtp-host" value={host} placeholder="smtp.qq.com" onChange={(event) => setHost(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="smtp-port">端口</Label>
            <Input id="smtp-port" value={port} inputMode="numeric" onChange={(event) => setPort(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="smtp-user">账号</Label>
            <Input id="smtp-user" value={user} onChange={(event) => setUser(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="smtp-pass">授权码</Label>
            <Input
              id="smtp-pass"
              type="password"
              value={pass}
              placeholder={hasPassword ? "已保存，留空则不修改" : "邮箱授权码"}
              onChange={(event) => setPass(event.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="smtp-from">发件人显示地址</Label>
          <Input
            id="smtp-from"
            value={from}
            placeholder="留空则使用上面的账号"
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={secure} onChange={(event) => setSecure(event.target.checked)} />
          使用 SSL（端口 465 一般要勾上）
        </label>
        <p className="text-sm text-[#6b645b]">
          QQ 邮箱用 smtp.qq.com、端口 465。这里填的是授权码，不是邮箱登录密码。授权码只存在本机 data/settings.json，不会进仓库。
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "正在保存…" : "保存设置"}
          </Button>
          <Button type="button" variant="outline" disabled={testing || !recipient} onClick={() => void testMail()}>
            {testing ? "正在发测试信…" : "给默认收件人发测试信"}
          </Button>
        </div>
        {message ? <p className="text-sm text-[#1f7a45]">{message}</p> : null}
        {error ? (
          <p className="text-sm text-[#c5362b]" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </form>
  );
}
