"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function GeneratePanel({ today }: { today: string }) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function generate(nextDate: string, refresh = false) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: nextDate, refresh }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        setError(payload.error ?? "生成失败");
        return;
      }
      router.push(`/reports/${payload.id}`);
      router.refresh();
    } catch {
      setError("网络中断，请再试一次");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="grid gap-4 border border-[#e6e0d6] bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        void generate(date);
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="report-date">报告日</Label>
        <Input
          id="report-date"
          type="date"
          max={today}
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
        <p className="text-sm text-[#6b645b]">
          按上海时区的自然日采集。同一天未发送的报告再点生成会重新采集并更新。公告、新闻和行情分开取，大约需要十几秒。
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "正在采集…" : "生成并预览"}
        </Button>
      </div>
      {error ? (
        <p className="sm:col-span-2 text-sm text-[#c5362b]" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
