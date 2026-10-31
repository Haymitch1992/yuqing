import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-semibold">没有这份报告</h1>
      <p className="mt-3 text-sm leading-6 text-[#3f3a34]">日期可能还没生成。回到列表选一天重新采集。</p>
      <Link href="/" className="mt-6 inline-block text-sm underline underline-offset-4">
        返回报告列表
      </Link>
    </main>
  );
}
