import { renderReportDocx } from "@/lib/docx-report";
import { readReport } from "@/lib/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const report = await readReport(id);
  if (!report) return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  const buffer = await renderReportDocx(report);
  const filename = `交控科技舆情日报-${report.date}.docx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="jiaokong-opinion-${report.date}.docx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
