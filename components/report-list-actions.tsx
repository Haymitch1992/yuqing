"use client";

import Link from "next/link";

export function ReportListActions({ id, sent }: { id: string; sent: boolean }) {
  return (
    <td className="px-3 py-3 text-right whitespace-nowrap">
      <Link href={`/reports/${id}`} className="underline underline-offset-4">
        预览
      </Link>
      <a href={`/api/reports/${id}/docx`} className="ml-3 underline underline-offset-4">
        Word
      </a>
      <Link href={`/reports/${id}?send=1`} className="ml-3 underline underline-offset-4">
        {sent ? "再发" : "发送"}
      </Link>
    </td>
  );
}
