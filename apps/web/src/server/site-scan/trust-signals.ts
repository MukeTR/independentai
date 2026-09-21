/**
 * Güven sinyalleri (`/arac/guven-sinyalleri`, TRUST_SIGNALS) — kimlik (ad/adres/telefon), KVKK/aydınlatma/çerez,
 * hakkımızda/ekip, iletişim kanalları, harici doğrulama (harita, sosyal, sameAs).
 *  - YALNIZ pass/warn: "eksik" hukuki hüküm değildir; fail üretilmez (spec §4). Skor yine 0–100.
 *  - MERSİS / vergi no yalnız bilgi notu; regulated sektörde (klinik/hukuk) "ruhsat / baro" ifadesi bilgi notu.
 *  - KVKK onay kutusu sezgiseli: form içinde checkbox + kvkk|onay|rıza → "olasılık" etiketi.
 *  - ≤5 istek: sayfa + kvkk/iletişim/hakkımızda/çerez hedeflerine HEAD (200 mü).
 */
import type { HeadResult, ScanBudget } from './budget';
import { defineSiteTool } from './core';
import { collectPageArtifact, SCAN_HEADERS, type PageArtifact, type PageLink } from './fetch-page';
import { hasOrganizationSchema } from './quick-checks';
import { normalizeTr } from './tr-text';
import { isSectorSlug } from '@/lib/tool-registry';

export type TrustAxis = 'identity' | 'kvkk' | 'about' | 'contact' | 'external';

export const TRUST_AXES = [
  { key: 'identity' as const, label: 'Kimlik', weight: 30, description: 'Ünvan, telefon, adres — footer ve şemada' },
  { key: 'kvkk' as const, label: 'KVKK ve politikalar', weight: 25, description: 'Aydınlatma metni, gizlilik, çerez, (e-ticarette) mesafeli satış/iade' },
  { key: 'about' as const, label: 'Hakkımızda / ekip', weight: 15, description: 'Kim olduğunuzu anlatan sayfa ve erişilebilirliği' },
  { key: 'contact' as const, label: 'İletişim kanalları', weight: 15, description: 'İletişim sayfası, tel:, WhatsApp, e-posta' },
  { key: 'external' as const, label: 'Harici doğrulama', weight: 15, description: 'Google Haritalar, sosyal profiller, sameAs' },
];

/** 81 il (Türkçe küçük harf, normalizeTr ile karşılaştırılır). */
export const TR_CITIES = [
  'adana', 'adıyaman', 'afyonkarahisar', 'ağrı', 'amasya', 'ankara', 'antalya', 'artvin', 'aydın', 'balıkesir', 'bilecik',
  'bingöl', 'bitlis', 'bolu', 'burdur', 'bursa', 'çanakkale', 'çankırı', 'çorum', 'denizli', 'diyarbakır', 'edirne', 'elazığ',
  'erzincan', 'erzurum', 'eskişehir', 'gaziantep', 'giresun', 'gümüşhane', 'hakkari', 'hatay', 'isparta', 'mersin',
  'istanbul', 'izmir', 'kars', 'kastamonu', 'kayseri', 'kırklareli', 'kırşehir', 'kocaeli', 'konya', 'kütahya', 'malatya',
  'manisa', 'kahramanmaraş', 'mardin', 'muğla', 'muş', 'nevşehir', 'niğde', 'ordu', 'rize', 'sakarya', 'samsun', 'siirt',
  'sinop', 'sivas', 'tekirdağ', 'tokat', 'trabzon', 'tunceli', 'şanlıurfa', 'uşak', 'van', 'yozgat', 'zonguldak', 'aksaray',
  'bayburt', 'karaman', 'kırıkkale', 'batman', 'şırnak', 'bartın', 'ardahan', 'iğdır', 'yalova', 'karabük', 'kilis',
  'osmaniye', 'düzce',
] as const;

const CITY_SET = new Set<string>(TR_CITIES.map((c) => normalizeTr(c)));

export const PHONE_RE = /(\+90|0)\s?\(?\d{3}\)?\s?\d{3}\s?\d{2}\s?\d{2}/;
const ADDRESS_HINT_RE = /\b(mah|mahallesi|cad|caddesi|sok|sokak|sk|bulv|bulvarı|no|kat|daire|plaza|osb|sanayi)\b\.?/i;
const LEGAL_FORM_RE = /\b(a\.?\s?ş\.?|ltd\.?\s?şti\.?|limited|anonim|şti\.?|san\.?\s?(ve|&)?\s?tic\.?)\b/i;
const MERSIS_RE = /\b\d{16}\b/;
const TAX_RE = /\b(vergi|v\.?d\.?|vkn)\b[^0-9]{0,40}\b\d{10}\b/i;
const KVKK_LINK_RE = /kvkk|aydınlatma|aydinlatma|kişisel veri|kisisel veri|gizlilik|privacy/i;
const PRIVACY_RE = /gizlilik|privacy/i;
const COOKIE_RE = /çerez|cerez|cookie/i;
const SALES_RE = /mesafeli satış|mesafeli satis|iade|teslimat|cayma/i;
const ABOUT_RE = /hakkımızda|hakkimizda|hakkında|hakkinda|biz kimiz|ekibimiz|ekip|kurucu|about|team|kurumsal/i;
const CONTACT_RE = /iletişim|iletisim|contact|bize ulaşın|bize ulasin/i;
const MAPS_RE = /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google/i;
const SOCIAL_RE = /(instagram|linkedin|facebook|youtube|x\.com|twitter|tiktok)\.com|\bx\.com\b/i;
const COMMERCE_RE = /sepet|satın al|satin al|add to cart|checkout|ödeme/i;
const REGULATED_RE = /sağlık bakanlığı|ruhsat|baro sicil|baro no|smmm|ymm|oda sicil/i;

export type TrustCandidate = { kind: 'kvkk' | 'cookie' | 'about' | 'contact'; url: string; text: string; head: HeadResult | null };
export type TrustArtifacts = { page: PageArtifact; candidates: TrustCandidate[] };

export type TrustExtra = {
  phone: string | null;
  city: string | null;
  legalForm: boolean;
  mersis: boolean;
  taxNo: boolean;
  links: { kind: TrustCandidate['kind']; url: string; ok: boolean | null }[];
  channels: { tel: boolean; whatsapp: boolean; mailto: boolean; maps: boolean; social: string[] };
  consentCheckbox: boolean;
  regulatedHint: boolean;
  commerce: boolean;
};

function linkMatches(l: PageLink, re: RegExp): boolean {
  return re.test(l.text) || re.test(decodeURIComponent(l.url).replace(/^https?:\/\/[^/]+/, ''));
}

/** Aday sayfalar: kvkk, çerez, hakkımızda, iletişim — her türden ilk iç link. */
export function trustCandidates(page: PageArtifact): Omit<TrustCandidate, 'head'>[] {
  const out: Omit<TrustCandidate, 'head'>[] = [];
  const pick = (kind: TrustCandidate['kind'], re: RegExp) => {
    const l = page.links.find((x) => x.internal && linkMatches(x, re));
    if (l && !out.some((o) => o.url === l.url)) out.push({ kind, url: l.url, text: l.text });
  };
  pick('kvkk', /kvkk|aydınlatma|aydinlatma|kişisel-veri|kisisel-veri|kişisel veri|gizlilik|privacy/i);
  pick('cookie', COOKIE_RE);
  pick('about', ABOUT_RE);
  pick('contact', CONTACT_RE);
  return out;
}

async function headCandidates(page: PageArtifact, budget: ScanBudget): Promise<TrustCandidate[]> {
  const cands = trustCandidates(page).slice(0, 4);
  return Promise.all(
    cands.map(async (c) => ({ ...c, head: budget.exhausted ? null : await budget.head(c.url, 5_000, { headers: SCAN_HEADERS }) })),
  );
}

function cityIn(text: string): string | null {
  const tokens = normalizeTr(text).split(' ');
  for (const t of tokens) if (CITY_SET.has(t)) return t;
  return null;
}

/** Form içinde checkbox + kvkk|onay|rıza (sezgisel). */
export function consentCheckboxHint(html: string): boolean {
  const forms = html.match(/<form[\s\S]{0,20000}?<\/form>/gi) ?? [];
  return forms.some((f) => /type=["']checkbox["']/i.test(f) && /kvkk|onay|rıza|riza|aydınlatma|aydinlatma/i.test(f));
}

export const trustSignalsTool = defineSiteTool<TrustAxis, TrustArtifacts, TrustExtra>({
  kind: 'TRUST_SIGNALS',
  axes: TRUST_AXES,
  collect: async (url, budget) => {
    const page = await collectPageArtifact(url, budget);
    const candidates = page.reachable ? await headCandidates(page, budget) : [];
    return { page, candidates };
  },
  analyze: ({ page, candidates }, s, ctx) => {
    const text = page.text;
    const html = page.html;
    const links = page.links;
    const sector = isSectorSlug(ctx.input.sector) ? ctx.input.sector : null;
    const regulated = sector === 'klinik' || sector === 'hukuk-danismanlik';
    const pw = (ok: boolean): 'pass' | 'warn' => (ok ? 'pass' : 'warn');

    // ── Kimlik ──
    const phone = text.match(PHONE_RE)?.[0] ?? null;
    const city = cityIn(text.slice(-4000)) ?? cityIn(text);
    const addressHint = !!city && ADDRESS_HINT_RE.test(text);
    const legalForm = LEGAL_FORM_RE.test(text);
    const orgSchema = hasOrganizationSchema(page.jsonLd);
    s.check('identity', 30, pw(!!phone), 'Telefon numarası görünür', { pass: `Bulundu: ${phone}`, fail: '', warn: 'Sayfa metninde +90 / 0xxx biçiminde telefon yok; asistan “nasıl ulaşırım” sorusuna cevap bulamaz.' }, { fix: 'Footer’a +90 ile başlayan telefon yazın', topic: 'trustSignals' });
    s.check('identity', 30, pw(addressHint), 'Fiziksel adres', { pass: `İl: ${city} · mahalle/cadde/no ifadeleri var`, fail: '', warn: city ? `İl adı (${city}) var ama mahalle/cadde/no yok.` : 'Sayfa metninde il adı ve adres satırı yok.' }, { fix: 'Footer’a tam adres (mahalle, cadde, no, ilçe/il) ekleyin', topic: 'trustSignals' });
    s.check('identity', 20, pw(legalForm), 'Ticari ünvan (A.Ş. / Ltd. Şti.)', { pass: 'Ünvan biçimi bulundu.', fail: '', warn: 'Tüzel kişi ünvanı görünmüyor; kurumsal alıcı ve asistan işletmeyi doğrulayamaz.' }, { fix: 'Footer’a tam ticari ünvanı yazın', topic: 'trustSignals' });
    s.check('identity', 20, pw(orgSchema), 'Organization / LocalBusiness şeması', { pass: 'Var.', fail: '', warn: 'Kimlik şeması yok; metindeki bilgiler yapılandırılmış değil.' }, { fix: 'Organization JSON-LD ekleyin (schema denetimi aracı şablon üretir)', topic: 'organizationSchema' });
    const mersis = MERSIS_RE.test(text);
    const taxNo = TAX_RE.test(text);
    if (mersis || taxNo) s.note('identity', 'MERSİS / vergi numarası görünüyor', `${mersis ? 'MERSİS' : ''}${mersis && taxNo ? ' ve ' : ''}${taxNo ? 'vergi no' : ''} bulundu; kurumsal doğrulama için olumlu sinyal (puanlanmaz).`, 'pass');
    else s.note('identity', 'MERSİS / vergi numarası yok', 'Zorunlu değil; kurumsal sitelerde footer’da bulunması güveni artırır (puanlanmaz).', 'warn');

    // ── KVKK ──
    const linkOk = (kind: TrustCandidate['kind']) => {
      const c = candidates.find((x) => x.kind === kind);
      if (!c) return { present: false, ok: null as boolean | null };
      const ok = c.head ? c.head.status > 0 && c.head.status < 400 : null;
      return { present: true, ok };
    };
    const kvkkLink = links.some((l) => linkMatches(l, KVKK_LINK_RE));
    const kvkkTarget = linkOk('kvkk');
    s.check('kvkk', 40, pw(kvkkLink), 'KVKK aydınlatma / gizlilik bağlantısı', { pass: `Bağlantı var${kvkkTarget.ok === false ? ' ama hedef 200 dönmedi' : ''}.`, fail: '', warn: 'KVKK aydınlatma metni veya gizlilik politikası bağlantısı bulunamadı.' }, { fix: 'Footer’a “KVKK aydınlatma metni” bağlantısı ekleyin', topic: 'trustSignals' });
    s.check('kvkk', 15, pw(kvkkTarget.present ? kvkkTarget.ok !== false : false), 'KVKK sayfası erişilebilir', { pass: 'Hedef sayfa açılıyor.', fail: '', warn: kvkkTarget.present ? (kvkkTarget.ok === null ? 'Ölçülemedi (bütçe).' : 'Hedef 4xx/5xx döndü.') : 'Bağlantı yok.' }, { fix: 'Bağlantının 200 dönen bir sayfaya gittiğinden emin olun', topic: 'trustSignals' });
    s.check('kvkk', 15, pw(links.some((l) => linkMatches(l, PRIVACY_RE))), 'Gizlilik politikası', { pass: 'Var.', fail: '', warn: 'Gizlilik politikası bağlantısı yok.' }, { fix: 'Gizlilik politikası sayfası ekleyin ve footer’dan bağlayın', topic: 'trustSignals' });
    s.check('kvkk', 15, pw(links.some((l) => linkMatches(l, COOKIE_RE)) || /çerez|cookie/i.test(html.slice(0, 200_000))), 'Çerez politikası / bildirimi', { pass: 'Var.', fail: '', warn: 'Çerez politikası veya bildirimi görünmüyor.' }, { fix: 'Çerez politikası sayfası ve bildirim şeridi ekleyin', topic: 'trustSignals' });
    const commerce = COMMERCE_RE.test(text) || page.jsonLd.some((n) => String(n['@type']).toLowerCase().includes('product'));
    if (commerce)
      s.check('kvkk', 15, pw(links.some((l) => linkMatches(l, SALES_RE))), 'Mesafeli satış / iade koşulları', { pass: 'Var.', fail: '', warn: 'Satış yapan sitede mesafeli satış sözleşmesi veya iade sayfası bağlantısı yok.' }, { fix: 'Mesafeli satış sözleşmesi ve iade/teslimat sayfaları ekleyin', topic: 'trustSignals' });
    else s.note('kvkk', 'Mesafeli satış / iade', 'Sitede sepet/satın al sinyali yok; e-ticaret yapmıyorsanız bu madde sizi ilgilendirmez.', 'pass');
    const consent = consentCheckboxHint(html);
    s.note('kvkk', consent ? 'Formda onay kutusu görünüyor (olasılık)' : 'Formda KVKK onay kutusu görünmedi (olasılık)', consent ? 'Form içinde checkbox + KVKK/onay/rıza ifadesi bulundu; içerik doğrulanmadı.' : 'Form yoksa ya da JavaScript ile yükleniyorsa görünmeyebilir; sezgisel kontrol.', consent ? 'pass' : 'warn');

    // ── Hakkımızda ──
    const aboutLink = links.some((l) => linkMatches(l, ABOUT_RE));
    const aboutTarget = linkOk('about');
    s.check('about', 60, pw(aboutLink), 'Hakkımızda / ekip sayfası', { pass: 'Bağlantı var.', fail: '', warn: 'Hakkımızda, ekibimiz veya kurucu sayfası bağlantısı yok; asistan “kim bunlar” sorusuna cevap bulamaz.' }, { fix: 'Hakkımızda sayfası ekleyin: kuruluş yılı, ekip, belgeler', topic: 'trustSignals' });
    s.check('about', 40, pw(aboutTarget.present ? aboutTarget.ok !== false : false), 'Hakkımızda sayfası erişilebilir', { pass: 'Açılıyor.', fail: '', warn: aboutTarget.present ? (aboutTarget.ok === null ? 'Ölçülemedi (bütçe).' : 'Hedef 4xx/5xx döndü.') : 'Bağlantı yok.' }, { fix: 'Bağlantının çalıştığından emin olun', topic: 'trustSignals' });

    // ── İletişim ──
    const tel = /href=["']tel:/i.test(html);
    const whatsapp = /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\//i.test(html);
    const mailto = /href=["']mailto:/i.test(html);
    const contactLink = links.some((l) => linkMatches(l, CONTACT_RE));
    s.check('contact', 30, pw(contactLink), 'İletişim sayfası', { pass: 'Var.', fail: '', warn: 'İletişim sayfası bağlantısı yok.' }, { fix: 'İletişim sayfası ekleyin ve menüye koyun', topic: 'trustSignals' });
    s.check('contact', 25, pw(tel), 'Tıklanabilir telefon (tel:)', { pass: 'Var.', fail: '', warn: 'tel: bağlantısı yok; mobilde tek dokunuşla arama yapılamaz.' }, { fix: 'Telefonu <a href="tel:+90…"> ile bağlayın', topic: 'trustSignals' });
    s.check('contact', 25, pw(whatsapp), 'WhatsApp bağlantısı', { pass: 'Var.', fail: '', warn: 'wa.me bağlantısı yok; Türkiye’de müşteri çoğunlukla WhatsApp’tan yazar.' }, { fix: 'https://wa.me/90… bağlantısı ekleyin', topic: 'trustSignals' });
    s.check('contact', 20, pw(mailto), 'E-posta (mailto:)', { pass: 'Var.', fail: '', warn: 'mailto: bağlantısı yok.' }, { fix: 'Kurumsal e-posta adresini mailto: ile bağlayın', topic: 'trustSignals' });

    // ── Harici doğrulama ──
    const maps = MAPS_RE.test(html);
    const socials = [...new Set(links.filter((l) => !l.internal && SOCIAL_RE.test(l.url)).map((l) => (l.url.match(SOCIAL_RE)?.[1] ?? 'x').toLowerCase()))];
    const orgSameAs = page.jsonLd.some((n) => Array.isArray(n.sameAs) ? n.sameAs.length > 0 : typeof n.sameAs === 'string' && n.sameAs.length > 0);
    s.check('external', 35, pw(maps), 'Google Haritalar bağlantısı', { pass: 'Var.', fail: '', warn: 'Harita bağlantısı yok; konum sorularında işletme profiliyle eşleşme zayıflar.' }, { fix: 'Google İşletme Profili harita bağlantısını footer/iletişime ekleyin', topic: 'trustSignals' });
    s.check('external', 35, pw(socials.length > 0), 'Sosyal profil bağlantısı', { pass: socials.join(', '), fail: '', warn: 'Instagram/LinkedIn/YouTube gibi profil bağlantısı yok.' }, { fix: 'Aktif sosyal profillerinizi footer’a ekleyin', topic: 'trustSignals' });
    s.check('external', 30, pw(orgSameAs), 'Şemada sameAs', { pass: 'Var.', fail: '', warn: 'Organization.sameAs yok; profiller şemada bağlanmamış.' }, { fix: 'Organization JSON-LD’ye sameAs dizisi ekleyin', topic: 'organizationSchema' });

    if (regulated) {
      const hint = REGULATED_RE.test(text);
      s.note('identity', hint ? 'Ruhsat / sicil ifadesi görünüyor' : 'Ruhsat / sicil ifadesi görünmüyor', 'Klinik ve hukuk/mali müşavirlik sitelerinde ruhsat, baro veya oda sicil bilgisi bilgilendirme amaçlıdır; puanlanmaz ve hukuki yeterlilik hükmü değildir.', hint ? 'pass' : 'warn');
    }

    return {
      page,
      extra: {
        phone,
        city,
        legalForm,
        mersis,
        taxNo,
        links: candidates.map((c) => ({ kind: c.kind, url: c.url, ok: c.head ? c.head.status > 0 && c.head.status < 400 : null })),
        channels: { tel, whatsapp, mailto, maps, social: socials },
        consentCheckbox: consent,
        regulatedHint: regulated ? REGULATED_RE.test(text) : false,
        commerce,
      },
    };
  },
});
