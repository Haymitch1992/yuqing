import { PreviewActions } from "@/components/preview-actions";
import { ReportDocument } from "@/components/report-document";
import { smtpReady } from "@/lib/mail";
import { readReport, readSettings } from "@/lib/store";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `交控科技舆情日报 ${id}` };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [report, settings] = await Promise.all([readReport(id), readSettings()]);
  if (!report) notFound();
  return (
    <main>
      <PreviewActions
        id={report.id}
        reviewedAt={report.reviewedAt}
        sentAt={report.sentAt}
        sentTo={report.sentTo}
        recipient={settings.recipient}
        smtpReady={smtpReady(settings)}
      />
      <ReportDocument report={report} />
    </main>
  );
}
