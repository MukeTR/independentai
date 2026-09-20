import { TOOL_REGISTRY } from '@/lib/tool-registry';
import { QUESTION_BANKS } from '@/data/question-bank';
import { SECTORS } from '@/data/sectors';
import { AI_MODELS, TUM_VERILER } from '@/data/ai-models';
import { STAT_KEYS } from '@/data/stats';
import { GEO_EKSENLERI, GEO_EKSEN_ADLARI } from '@/lib/geo-axes';
import { BOT_REGISTRY } from '@/server/discovery/bots';

/**
 * Ölçüm kapsamı şeridi — "bu sayfa buzdağının görünen kısmı".
 *
 * KURAL: buradaki HİÇBİR sayı elle yazılmaz. Hepsi kodun kendi kayıtlarından sayılır; bir araç
 * yayına alınırsa, bir sektör eklenirse ya da bot kaydına yeni tarayıcı girerse sayı kendiliğinden
 * değişir. Elle yazılan bir sayı bir gün mutlaka yalan olur.
 *
 * Bir kaynak boşsa (ör. liste sıfır uzunlukta) O KALEM HİÇ GÖSTERİLMEZ; sıfır yazmak yerine
 * sessizce düşer.
 */

type Kalem = { deger: number; baslik: string; alt: string };

const TR = (n: number) => n.toLocaleString('tr-TR');

export function OlcumKapsami({
  modelSayisi,
  saglayiciSayisi,
  uygulamaSayisi,
}: {
  modelSayisi: number;
  saglayiciSayisi: number;
  uygulamaSayisi: number;
}) {
  /* — Araç kataloğu — */
  const yayindakiAraclar = TOOL_REGISTRY.filter((t) => t.enabled);
  const paneldekiAraclar = yayindakiAraclar.filter((t) => t.dashboard);

  /* — Soru bankası — */
  const bankalar = Object.values(QUESTION_BANKS);
  const toplamSoru = bankalar.reduce((a, b) => a + b.questions.length, 0);
  const asamaSayisi = new Set(bankalar.flatMap((b) => b.questions.map((q) => q.stage))).size;

  /* — Sektör sayfaları — */
  const toplamKontrol = SECTORS.reduce((a, s) => a + s.checks.length, 0);
  const toplamSektorSorusu = SECTORS.reduce((a, s) => a + s.faq.length, 0);

  /* — Kaynaklı veri — */
  const kaynakliKalem = TUM_VERILER.length + STAT_KEYS.length;
  const turkiyeKalemi = TUM_VERILER.filter((v) => v.kapsam === 'türkiye').length;

  /* — Bot kaydı — `controlTokenOnly` girişler HTTP isteği üretmez, ayrı sayılır. — */
  const tarayicilar = BOT_REGISTRY.filter((b) => !b.controlTokenOnly);
  const kontrolTokenlari = BOT_REGISTRY.filter((b) => b.controlTokenOnly);
  const operatorler = new Set(tarayicilar.map((b) => b.operator)).size;

  const kalemler: Kalem[] = [
    {
      deger: modelSayisi,
      baslik: 'Bu sayfada izlenen model',
      alt: `${TR(saglayiciSayisi)} sağlayıcı, ${TR(uygulamaSayisi)} uygulama — hepsi aşağıdaki tablolarda.`,
    },
    {
      deger: tarayicilar.length,
      baslik: 'Tanınan yapay zekâ tarayıcısı',
      alt: `${TR(operatorler)} operatör, her birinin doğrulama yöntemiyle; ayrıca ${TR(
        kontrolTokenlari.length,
      )} robots.txt izin jetonu.`,
    },
    {
      deger: Object.keys(GEO_EKSENLERI).length,
      baslik: 'Sitenizin puanlandığı eksen',
      alt: `${GEO_EKSEN_ADLARI.join(', ')}.`,
    },
    {
      deger: toplamSoru,
      baslik: 'Soru bankasındaki gerçek müşteri cümlesi',
      alt: `${TR(bankalar.length)} sektör için ayrı ayrı yazıldı; her cümle ${TR(
        asamaSayisi,
      )} satın alma aşamasından birine işaretli.`,
    },
    {
      deger: yayindakiAraclar.length,
      baslik: 'Yayındaki ücretsiz araç',
      alt: `${TR(paneldekiAraclar.length)} tanesi panelde de çalışıyor; hiçbiri hesap istemiyor.`,
    },
    {
      deger: SECTORS.length,
      baslik: 'Sektör sayfası',
      alt: `Toplam ${TR(toplamKontrol)} kontrol adımı ve ${TR(toplamSektorSorusu)} sektör sorusu içeriyor.`,
    },
    {
      deger: kaynakliKalem,
      baslik: 'Kaynağı yazılı veri kalemi',
      alt: `${TR(turkiyeKalemi)} tanesi Türkiye ölçümü; her kalemde kaynak adı, ölçüm yılı ve bağlantı var.`,
    },
    {
      deger: AI_MODELS.length,
      baslik: 'Asistan profili',
      alt: 'Bot adı, web erişimi ve kaynak gösterme davranışı doğrulanarak yazıldı.',
    },
  ].filter((k) => k.deger > 0);

  if (kalemler.length === 0) return null;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-hairline border border-hairline rounded-2xl overflow-hidden">
        {kalemler.map((k) => (
          <div key={k.baslik} className="bg-paper-3 p-5">
            <div className="font-display text-[30px] lg:text-[34px] leading-none tabular text-ink">{TR(k.deger)}</div>
            <div className="text-[13px] text-ink mt-2.5 leading-snug font-medium">{k.baslik}</div>
            <div className="text-[12px] text-ink-faint mt-1.5 leading-snug">{k.alt}</div>
          </div>
        ))}
      </div>
      <p className="text-[13px] text-ink-faint mt-4 leading-relaxed max-w-3xl">
        Bu sayıların hepsi kodun kendi kayıtlarından sayılır, sayfaya elle yazılmaz: bir araç yayına alındığında ya da
        bot kaydına yeni bir tarayıcı girdiğinde buradaki rakam kendiliğinden değişir.
      </p>
    </div>
  );
}
