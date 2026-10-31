import { readReport, writeReport } from "@/lib/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const report = await readReport(id);
  if (!report) return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  if (!report.reviewedAt) {
    report.reviewedAt = new Date().toISOString();
    await writeReport(report);
  }
  return NextResponse.json({ reviewedAt: report.reviewedAt });
}
