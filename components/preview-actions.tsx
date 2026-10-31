"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseRecipients, recipientFieldError } from "@/lib/recipients";
import { formatCnDateTime } from "@/lib/time";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function recipientLines(value: string): string {
  const { emails } = parseRecipients(value);
  return emails.length ? emails.join("\n") : value;
}

export function PreviewActions({
  id,
  reviewedAt,
  sentAt,
  sentTo,
  recipients,
  smtpReady,
}: {
  id: string;
  reviewedAt: string | null;
  sentAt: string | null;
  sentTo: string | null;
  recipients: string[];
  smtpReady: boolean;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(Boolean(reviewedAt));
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(recipientLines(sentTo || recipients.join("\n")));
  const [pending, setPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(sentAt ? { at: sentAt, to: sentTo ?? "" } : null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/reports/${id}/review`, { method: "POST" })
      .then((response) => {
        if (!cancelled && response.ok) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("预览状态没有记下，发送前请刷新页面");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function send() {
    const fieldError = recipientFieldError(email, true);
    if (fieldError) {
      setError(fieldError);
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/reports/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email }),
      });
      const payload = (await response.json()) as { sentAt?: string; sentTo?: string; error?: string };
      if (!response.ok || !payload.sentAt) {
        setError(payload.error ?? "发送失败");
        return;
      }
      setSent({ at: payload.sentAt, to: payload.sentTo ?? email });
      setOpen(false);
      router.refresh();
    } catch {
      setError("网络中断，邮件可能没有发出");
    } finally {
      setPending(false);
    }
  }

  async function refreshReport() {
    setRefreshing(true);
    setError("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: id, refresh: true }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "重新采集失败");
        return;
      }
      window.location.reload();
    } catch {
      setError("网络中断，请再试一次");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="sticky top-0 z-10 border-b border-[#e6e0d6] bg-[#fbf8f2]/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <Link href="/" className="text-[#6b645b] underline-offset-4 hover:underline">
            返回列表
          </Link>
          {sent ? (
            <p className="mt-1 text-[#1c1917]">
              已于 {formatCnDateTime(sent.at)} 发到 {sent.to}
            </p>
          ) : (
            <p className="mt-1 text-[#1c1917]">{ready ? "预览已打开，可以发送" : "正在记录预览…"}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!sent ? (
            <Button type="button" variant="outline" disabled={refreshing} onClick={() => void refreshReport()}>
              {refreshing ? "重新采集…" : "重新采集"}
            </Button>
          ) : null}
          <Button type="button" disabled={!ready || pending} onClick={() => setOpen(true)}>
            {sent ? "再发一封" : "发送到邮箱"}
          </Button>
        </div>
      </div>
      {error ? (
        <p className="mx-auto max-w-3xl px-4 pb-3 text-sm text-[#c5362b]" role="alert">
          {error}
        </p>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>发送这份日报</DialogTitle>
            <DialogDescription>
              {smtpReady
                ? "这些地址都会收到同一封日报，内容是标题、综述和事件表。发送前你已经看到了当前这份预览。"
                : "还没有配置发信邮箱。先保存 SMTP，再回到这里发送。"}
            </DialogDescription>
          </DialogHeader>
          {smtpReady ? (
            <div className="grid gap-2">
              <Label htmlFor="recipient">收件人</Label>
              <Textarea
                id="recipient"
                value={email}
                rows={4}
                spellCheck={false}
                placeholder={"name@example.com\nother@example.com"}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <p className="text-sm text-[#6b645b]">每行一个地址，也可以用逗号或分号分开。</p>
            </div>
          ) : (
            <Link href="/settings" className="text-sm underline underline-offset-4">
              去填写发信设置
            </Link>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="button" disabled={!smtpReady || pending || !email.trim()} onClick={() => void send()}>
              {pending ? "正在发送…" : "确认发送"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
