/**
 * Panel araç kutusu — TEK kaynak. Pazarlama sayfaları araç sayısını buradan (DASHBOARD_TOOLS.length) okur;
 * elle sayı yazılmaz.
 */
import {
  FileText,
  Bot,
  Code,
  ClipboardCheck,
  Calculator,
  CheckCircle2,
  Gauge,
  FileSearch,
  KeyRound,
  Link2,
  GitFork,
  ShieldAlert,
  PenLine,
  Store,
  PackageSearch,
  Bot as BotIcon,
  Tags,
} from 'lucide-react';

export type DashboardTool = {
  href: string;
  icon: typeof Gauge;
  title: string;
  desc: string;
  category: 'Denetim' | 'Keşif' | 'Üretici' | 'Hesaplayıcı' | 'E-ticaret';
};

export const DASHBOARD_TOOLS: DashboardTool[] = [
  {
    href: '/dashboard/tools/geo-audit',
    icon: Gauge,
    title: 'GEO Audit (0-100 skor)',
    desc: 'URL girin, sayfanızı gerçek zamanlı tarayıp AI-hazırlık skorunu 5 eksende çıkaralım.',
    category: 'Denetim',
  },
  {
    href: '/dashboard/tools/content-audit',
    icon: FileSearch,
    title: 'İçerik Denetleyicisi',
    desc: 'Sayfanızı analiz edip AI-alıntılanabilirliği artıracak önceliklendirilmiş aksiyon kartları verir.',
    category: 'Denetim',
  },
  {
    href: '/dashboard/tools/cannibalization',
    icon: GitFork,
    title: 'Kanibalizasyon Denetleyici',
    desc: 'Aynı konu için yarışan kendi sayfalarınızı tespit edin — AI alıntılarını birbirinden çalmasın.',
    category: 'Denetim',
  },
  {
    href: '/dashboard/tools/hallucination',
    icon: ShieldAlert,
    title: 'Halüsinasyon Tespiti',
    desc: 'AI cevaplarında markanız hakkında yanlış bilgi var mı? Gerçeklerinizle karşılaştırıp yakalar.',
    category: 'Denetim',
  },
  {
    href: '/dashboard/tools/keyword-finder',
    icon: KeyRound,
    title: 'Prompt / Anahtar Kelime Bulucu',
    desc: "Müşterilerinizin AI'a soracağı yüksek niyetli soruları bulun, tek tıkla takibe ekleyin.",
    category: 'Keşif',
  },
  {
    href: '/dashboard/tools/backlink-finder',
    icon: Link2,
    title: 'Backlink Bulucu',
    desc: 'AI motorlarının sektörünüzde en çok atıf verdiği siteler — en değerli outreach hedefleriniz.',
    category: 'Keşif',
  },
  {
    href: '/dashboard/tools/aeo-writer',
    icon: PenLine,
    title: 'AEO İçerik Yazıcı',
    desc: 'AI-alıntılanabilir FAQ, Q&A sayfası, meta ve sosyal içerik üretir. Boşlukları kapatın.',
    category: 'Üretici',
  },
  {
    href: '/dashboard/tools/llms-txt',
    icon: FileText,
    title: 'llms.txt Generator',
    desc: "AI bot'lara markanızı doğrudan anlatan markdown dosyası üret. 30 saniyede hazır.",
    category: 'Üretici',
  },
  {
    href: '/dashboard/tools/robots',
    icon: Bot,
    title: 'robots.txt Generator',
    desc: "AI crawler'larını yönet (GPTBot, ClaudeBot, PerplexityBot), sitemap referansı ekle.",
    category: 'Üretici',
  },
  {
    href: '/dashboard/tools/schema',
    icon: Code,
    title: 'Schema Markup Generator',
    desc: "Organization JSON-LD üret, HTML'inize yapıştır. AI gözündeki kanonik bilginiz.",
    category: 'Üretici',
  },
  {
    href: '/dashboard/tools/audit',
    icon: ClipboardCheck,
    title: 'GEO Audit Checklist',
    desc: '10 adımlık manuel denetim, her adımda not alma, markdown rapor olarak indir.',
    category: 'Denetim',
  },
  {
    href: '/dashboard/tools/visibility',
    icon: Calculator,
    title: 'Visibility Score Hesaplayıcı',
    desc: 'Promptlarınızı ve mention sayılarınızı gir, anlık Score + SoV çıktısı al.',
    category: 'Hesaplayıcı',
  },
  {
    href: '/dashboard/tools/checklist',
    icon: CheckCircle2,
    title: 'AI SEO Checklist',
    desc: '25 maddelik interaktif checklist, kategori bazlı skor, rapor indir.',
    category: 'Denetim',
  },
  {
    href: '/dashboard/tools/ecommerce-visibility',
    icon: Store,
    title: 'E-ticaret AI Görünürlük Testi',
    desc: 'Mağazanızı 6 eksende puanlar; bağlı katalog veri kalitesi ve ticari soru önerileriyle birlikte.',
    category: 'E-ticaret',
  },
  {
    href: '/dashboard/tools/product-page',
    icon: PackageSearch,
    title: 'Ürün Sayfası Testi',
    desc: 'Product JSON-LD, açıklama özgünlüğü, görsel alt metni, SSS/özellik tablosu ve AI cevap uyumu.',
    category: 'E-ticaret',
  },
  {
    href: '/dashboard/tools/ai-crawler',
    icon: BotIcon,
    title: 'AI Crawler Testi',
    desc: 'robots.txt bot matrisi (GPTBot, ClaudeBot, PerplexityBot…), noindex/canonical/sitemap/llms.txt.',
    category: 'E-ticaret',
  },
  {
    href: '/dashboard/tools/product-writer',
    icon: Tags,
    title: 'Ürün Açıklama Yazıcı',
    desc: 'Yalnızca verdiğiniz özelliklerle açıklama + 5 SSS + meta + Product JSON-LD iskeleti.',
    category: 'E-ticaret',
  },
];

export const DASHBOARD_TOOL_CATEGORIES = ['Denetim', 'Keşif', 'Üretici', 'Hesaplayıcı', 'E-ticaret'] as const;
