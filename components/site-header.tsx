import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-[#e6e0d6] bg-[#fbf8f2]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="min-w-0">
          <p className="text-xs tracking-[0.18em] text-[#6b645b]">688015</p>
          <p className="truncate text-lg font-semibold text-[#1c1917]">交控科技舆情日报</p>
        </Link>
        <nav className="flex shrink-0 gap-4 text-sm">
          <Link href="/" className="text-[#1c1917] underline-offset-4 hover:underline">
            报告
          </Link>
          <Link href="/settings" className="text-[#1c1917] underline-offset-4 hover:underline">
            发信设置
          </Link>
        </nav>
      </div>
    </header>
  );
}
