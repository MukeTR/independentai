/**
 * Rapor CTA satırı — bağlantıları rapordan türetir (sunucu bileşeni):
 *  "Bunları biz düzeltelim" → /contact?src=rapor&site=&token= · "Kendim düzelteceğim" → #oneriler
 *  "Yeniden tara" → /arac/<slug>?url= · WhatsApp/kopyala (istemci) · "Skor nasıl hesaplanır?" → araç sayfası anchor'ı.
 */
import { ReportCtaRow, contactHref } from '@/components/marketing/report-cta-row';
import { toolPath } from '@/lib/tool-registry';
import { rescanPath, verdictLine, whatsappShareText, type PublicReport } from '@/server/public-report';

export function methodHref(report: PublicReport): string {
  return report.tool ? `${toolPath(report.tool.slug)}#nasil-hesaplanir` : '/arac';
}

export function ReportActions({ report }: { report: PublicReport }) {
  const verdict = verdictLine(report.result.findings);
  return (
    <ReportCtaRow
      contactHref={contactHref({ src: 'rapor', site: report.hostname, token: report.token, sektor: report.sector })}
      selfHref="#oneriler"
      rescanHref={rescanPath(report.tool, report.hostname, report.sector)}
      methodHref={methodHref(report)}
      share={{
        url: report.reportUrl,
        text: whatsappShareText({
          hostname: report.hostname,
          toolTitle: report.toolTitle,
          score: report.score,
          verdict,
          reportUrl: report.reportUrl,
        }),
      }}
    />
  );
}
