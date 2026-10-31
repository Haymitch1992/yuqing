"use client";

import { formatCnDate, isIsoDate } from "@/lib/time";
import { useEffect, useState } from "react";

const STEPS = [
  { title: "取行情", detail: "腾讯行情里的收盘价和近端走势" },
  { title: "取公告", detail: "上交所当日披露" },
  { title: "取新闻", detail: "东方财富、网易、同花顺、腾讯自选股" },
  { title: "归并成稿", detail: "同题合并、情感分类、写出概况" },
];

export function GenerateProgress({
  open,
  dateLabel,
  mode = "generate",
}: {
  open: boolean;
  dateLabel?: string;
  mode?: "generate" | "refresh";
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep(0);
      return;
    }
    setStep(0);
    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % STEPS.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [open]);

  if (!open) return null;

  const progress = ((step + 1) / STEPS.length) * 100;
  const current = STEPS[step];

  return (
    <div
      className="generate-progress-overlay fixed inset-0 z-50 flex items-center justify-center bg-[#1c1917]/35 px-4 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="generate-progress-card w-full max-w-md border border-[#e6e0d6] bg-[#fbf8f2] px-6 py-7 shadow-[0_18px_48px_rgba(28,25,23,0.18)]">
        <p className="text-xs tracking-[0.22em] text-[#6b645b]">交控科技 · 688015</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#1c1917]">
          {mode === "refresh" ? "正在重新采集" : "正在生成日报"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#3f3a34]">
          {dateLabel ? `报告日 ${isIsoDate(dateLabel) ? formatCnDate(dateLabel) : dateLabel}。` : ""}
          公告、新闻和行情分开取，大约需要十几秒。
        </p>

        <div className="mt-6 h-1.5 overflow-hidden bg-[#e6e0d6]">
          <div className="generate-progress-bar h-full bg-[#1c1917]" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-5 grid gap-3">
          {STEPS.map((item, index) => {
            const active = index === step;
            const done = index < step;
            return (
              <div
                key={item.title}
                className={`generate-progress-step flex items-start gap-3 border-l-2 pl-3 transition-colors duration-500 ${
                  active ? "border-[#1c1917]" : done ? "border-[#c5362b]/40" : "border-[#e6e0d6]"
                }`}
              >
                <span
                  className={`mt-1 inline-block size-2 shrink-0 rounded-sm ${
                    active ? "generate-progress-dot bg-[#c5362b]" : done ? "bg-[#1c1917]" : "bg-[#d7cfc2]"
                  }`}
                />
                <div>
                  <p className={`text-sm font-medium ${active ? "text-[#1c1917]" : "text-[#6b645b]"}`}>
                    {item.title}
                    {active ? <span className="generate-progress-ellipsis ml-1 text-[#c5362b]">···</span> : null}
                  </p>
                  <p className={`text-xs leading-5 ${active ? "text-[#3f3a34]" : "text-[#9a9186]"}`}>{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-xs leading-5 text-[#6b645b]">
          当前：{current.title}。请稍候，完成后会自动打开预览。
        </p>
      </div>
    </div>
  );
}
