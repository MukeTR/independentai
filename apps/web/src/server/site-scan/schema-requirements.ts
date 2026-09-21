/**
 * Şema gereksinim tabloları — `schema-denetimi` için Google zorunlu/önerilen alanlar (Search Central "yapılandırılmış
 * veri" belgeleri, Eylül 2026 okuması; Google'ın tabloları değişebilir → sonuçta "yaklaşık" etiketi) + sektöre göre
 * Organization/LocalBusiness alt tipi + kopyalanabilir JSON-LD şablonu.
 *
 *  - Şablonda uydurma değer YOK: bilinmeyen her alan `[DOLDURUN]`; sayfadan okunan ad/URL/telefon/logo verilirse
 *    yalnız onlar yazılır. `aggregateRating` ŞABLONA KONMAZ (gerçek yorum kanıtı gerekir — uyarı metni ayrıca döner).
 *  - Sunucu importu yok; istemci `schema-snippet.tsx` de bu modülü kullanabilir (saf).
 */
import type { SectorSlug } from '@/lib/tool-registry';

export type FieldRule = { field: string; why: string };
export type TypeRequirement = {
  type: string;
  label: string;
  /** Google zorunlu (eksik = fail) */
  required: FieldRule[];
  /** Google önerilen (eksik = warn) */
  recommended: FieldRule[];
  /** Google zengin sonuç üretir mi (bilgi) */
  richResult: boolean;
};

const f = (field: string, why: string): FieldRule => ({ field, why });

/** Organization ailesi için ortak alanlar (LocalBusiness alt tipleri ek ister). */
export const ORGANIZATION_REQUIREMENTS: TypeRequirement = {
  type: 'Organization',
  label: 'Organization / LocalBusiness',
  required: [f('name', 'Kuruluş adı — yapay zekâ sizi bu adla tanır'), f('url', 'Kanonik site adresi')],
  recommended: [
    f('logo', 'Logo görseli — Google bilgi paneli ve AI kartları'),
    f('telephone', 'Telefon — güven ve iletişim sinyali'),
    f('address', 'PostalAddress — konum sorularında eşleşme'),
    f('sameAs', 'Sosyal/dizin profilleri — kimlik doğrulama'),
    f('description', 'Tek cümlelik tanım'),
  ],
  richResult: false,
};

export const LOCAL_BUSINESS_EXTRA: FieldRule[] = [
  f('address', 'LocalBusiness için Google adres ister (PostalAddress)'),
  f('openingHoursSpecification', 'Çalışma saatleri — "şu an açık mı" sorusu'),
  f('geo', 'GeoCoordinates — harita eşleşmesi'),
  f('priceRange', 'Fiyat aralığı ($$ gibi) — fiyat sorularında ipucu'),
];

/** Sayfa tipi şemaları (Google belgeleri; zorunlu/önerilen). */
export const PAGE_TYPE_REQUIREMENTS: TypeRequirement[] = [
  {
    type: 'Product',
    label: 'Product',
    required: [f('name', 'Ürün adı'), f('image', 'Ürün görseli'), f('offers', 'Offer (fiyat + para birimi) veya review/aggregateRating')],
    recommended: [
      f('description', 'Açıklama'),
      f('brand', 'Marka'),
      f('sku', 'Stok kodu'),
      f('offers.priceCurrency', 'Para birimi (TRY)'),
      f('offers.availability', 'Stok durumu (InStock/OutOfStock)'),
    ],
    richResult: true,
  },
  {
    type: 'Article',
    label: 'Article / BlogPosting / NewsArticle',
    required: [f('headline', 'Başlık (≤110 karakter)'), f('image', 'En az bir görsel')],
    recommended: [
      f('datePublished', 'Yayın tarihi'),
      f('dateModified', 'Güncelleme tarihi'),
      f('author', 'Yazar (Person/Organization, name ile)'),
      f('publisher', 'Yayıncı Organization'),
    ],
    richResult: true,
  },
  {
    type: 'FAQPage',
    label: 'FAQPage',
    required: [f('mainEntity', 'Question dizisi'), f('mainEntity.name', 'Soru metni'), f('mainEntity.acceptedAnswer.text', 'Cevap metni')],
    recommended: [],
    richResult: true,
  },
  {
    type: 'Course',
    label: 'Course',
    required: [f('name', 'Kurs adı'), f('description', 'Açıklama'), f('provider', 'Sağlayıcı Organization')],
    recommended: [f('offers', 'Fiyat/ücretsiz bilgisi'), f('hasCourseInstance', 'Dönem, biçim (online/yüz yüze)')],
    richResult: true,
  },
  {
    type: 'Hotel',
    label: 'Hotel / LodgingBusiness',
    required: [f('name', 'Otel adı'), f('address', 'PostalAddress')],
    recommended: [
      f('telephone', 'Telefon'),
      f('image', 'Görsel'),
      f('priceRange', 'Fiyat aralığı'),
      f('checkinTime', 'Giriş saati'),
      f('checkoutTime', 'Çıkış saati'),
      f('amenityFeature', 'Olanaklar (havuz, spa…)'),
    ],
    richResult: false,
  },
  {
    type: 'RealEstateListing',
    label: 'RealEstateListing',
    required: [f('name', 'İlan başlığı'), f('url', 'İlan adresi')],
    recommended: [f('datePosted', 'İlan tarihi'), f('leaseLength', 'Kira süresi (kiralık)'), f('description', 'Açıklama')],
    richResult: false,
  },
  {
    type: 'BreadcrumbList',
    label: 'BreadcrumbList',
    required: [f('itemListElement', 'ListItem dizisi'), f('itemListElement.name', 'Öğe adı'), f('itemListElement.position', 'Sıra')],
    recommended: [f('itemListElement.item', 'Öğe URL’si (son öğe hariç)')],
    richResult: true,
  },
  {
    type: 'WebSite',
    label: 'WebSite',
    required: [f('name', 'Site adı'), f('url', 'Site adresi')],
    recommended: [f('potentialAction', 'SearchAction (site içi arama kutusu)')],
    richResult: true,
  },
  {
    type: 'Service',
    label: 'Service',
    required: [f('name', 'Hizmet adı'), f('provider', 'Sağlayıcı')],
    recommended: [f('areaServed', 'Hizmet bölgesi'), f('description', 'Açıklama'), f('offers', 'Fiyat bilgisi')],
    richResult: false,
  },
  {
    type: 'Event',
    label: 'Event',
    required: [f('name', 'Etkinlik adı'), f('startDate', 'Başlangıç'), f('location', 'Yer (Place/VirtualLocation)')],
    recommended: [f('endDate', 'Bitiş'), f('offers', 'Bilet'), f('image', 'Görsel'), f('organizer', 'Düzenleyen')],
    richResult: true,
  },
  {
    type: 'JobPosting',
    label: 'JobPosting',
    required: [f('title', 'Pozisyon'), f('description', 'Açıklama'), f('datePosted', 'İlan tarihi'), f('hiringOrganization', 'İşveren'), f('jobLocation', 'Konum')],
    recommended: [f('baseSalary', 'Maaş'), f('employmentType', 'Çalışma türü'), f('validThrough', 'Son başvuru')],
    richResult: true,
  },
];

export const PAGE_TYPE_BY_NAME: Record<string, TypeRequirement> = Object.fromEntries(
  PAGE_TYPE_REQUIREMENTS.map((r) => [r.type.toLowerCase(), r]),
);

/** Article alt tipleri Article kuralına bağlanır. */
const TYPE_ALIASES: Record<string, string> = {
  blogposting: 'article',
  newsarticle: 'article',
  techarticle: 'article',
  lodgingbusiness: 'hotel',
  resort: 'hotel',
  bedandbreakfast: 'hotel',
  hostel: 'hotel',
  motel: 'hotel',
  educationevent: 'event',
  businessevent: 'event',
};

export function requirementForType(type: string): TypeRequirement | null {
  const key = type.toLowerCase().replace(/^https?:\/\/schema\.org\//, '');
  return PAGE_TYPE_BY_NAME[TYPE_ALIASES[key] ?? key] ?? null;
}

/** Sektör → önerilen Organization alt tipi (LocalBusiness ailesi mi?). */
export const SECTOR_ORG_TYPE: Record<SectorSlug, { type: string; local: boolean; note: string }> = {
  saas: { type: 'Organization', local: false, note: 'Ürün için ayrıca SoftwareApplication (name, applicationCategory, offers) ekleyin.' },
  ajans: { type: 'ProfessionalService', local: true, note: 'LocalBusiness alt tipi; hizmetleri Service düğümleriyle bağlayın.' },
  klinik: { type: 'MedicalClinic', local: true, note: 'MedicalBusiness ailesi; tanıtım mevzuatı gereği yalnız bilgilendirici alanlar.' },
  'hukuk-danismanlik': { type: 'LegalService', local: true, note: 'Mali müşavirlik için AccountingService kullanın.' },
  'eticaret-altyapi': { type: 'Organization', local: false, note: 'Altyapı ürünü için SoftwareApplication; mağazalar için OnlineStore.' },
  egitim: { type: 'EducationalOrganization', local: true, note: 'Her program için ayrı Course düğümü ekleyin.' },
  gayrimenkul: { type: 'RealEstateAgent', local: true, note: 'İlan sayfalarında RealEstateListing kullanın.' },
  turizm: { type: 'Hotel', local: true, note: 'Otel dışı işletmeler için TravelAgency / TouristAttraction.' },
  'b2b-uretici': { type: 'Organization', local: false, note: 'additionalType ile üretici olduğunuzu belirtin; ürünler için Product.' },
};

export const PLACEHOLDER = '[DOLDURUN]';

export type TemplateHints = { name?: string | null; url?: string | null; telephone?: string | null; logo?: string | null };

export type SchemaTemplate = { type: string; json: string; notes: string[] };

/**
 * Kopyalanabilir JSON-LD şablonu — bilinmeyen alanlar `[DOLDURUN]`; verilen ipuçları dışında değer uydurulmaz.
 * aggregateRating/review bilinçli olarak yok (uyarı notu döner).
 */
export function schemaTemplate(sector: SectorSlug | null | undefined, hints: TemplateHints = {}): SchemaTemplate {
  const org = sector ? SECTOR_ORG_TYPE[sector] : { type: 'Organization', local: false, note: '' };
  const v = (x: string | null | undefined) => (x && x.trim() ? x.trim() : PLACEHOLDER);
  const node: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': org.type,
    name: v(hints.name),
    url: v(hints.url),
    logo: v(hints.logo),
    description: PLACEHOLDER,
    telephone: v(hints.telephone),
    email: PLACEHOLDER,
    address: {
      '@type': 'PostalAddress',
      streetAddress: PLACEHOLDER,
      addressLocality: PLACEHOLDER,
      addressRegion: PLACEHOLDER,
      postalCode: PLACEHOLDER,
      addressCountry: 'TR',
    },
    sameAs: [PLACEHOLDER, PLACEHOLDER],
  };
  if (org.local) {
    node.openingHoursSpecification = [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: PLACEHOLDER,
        closes: PLACEHOLDER,
      },
    ];
    node.geo = { '@type': 'GeoCoordinates', latitude: PLACEHOLDER, longitude: PLACEHOLDER };
    node.priceRange = PLACEHOLDER;
  }
  const notes = [
    `${PLACEHOLDER} yazan her alanı gerçek bilginizle değiştirin; bilmediğiniz alanı satırıyla birlikte silin.`,
    'aggregateRating / review ŞABLONDA YOK: yalnız sitenizde görünen gerçek yorumlar varsa eklenebilir; uydurma puan Google spam politikasına girer.',
    'Şablonu <script type="application/ld+json"> içinde her sayfaya (tercihen ana sayfa + iletişim) ekleyin; Rich Results Test ile doğrulayın.',
  ];
  if (org.note) notes.push(org.note);
  return { type: org.type, json: JSON.stringify(node, null, 2), notes };
}
