/**
 * Bağlayıcı hata kodları ve kullanıcıya gösterilen metinler — SAF SABİT modül.
 *
 * Bu dosya bilerek hiçbir şey import etmez: hem sunucu (errors.ts buradan re-export eder) hem de
 * istemci (entegrasyon paneli, OAuth dönüş mesajları) aynı metinleri kullanır; metin kopyası yok.
 * Ham sağlayıcı cevabı/secret asla bu mesajlara girmez.
 */
export type CommerceErrorCode =
  | 'AUTH_INVALID' // token/anahtar geçersiz → yeniden bağlan
  | 'AUTH_EXPIRED' // token süresi doldu, yenilenemedi → yeniden bağlan
  | 'SCOPE_MISSING' // gerekli izin yok
  | 'RATE_LIMITED' // sağlayıcı kotası, retryAfterMs
  | 'NOT_FOUND' // mağaza/ürün yok
  | 'INVALID_STORE' // domain biçimi/SSRF reddi
  | 'UPSTREAM_ERROR' // sağlayıcı 5xx / bozuk cevap
  | 'NETWORK' // zaman aşımı, DNS, bağlantı
  | 'UNSUPPORTED' // sağlayıcı bu özelliği desteklemiyor
  | 'CONFIG_MISSING' // sunucu env eksik (SHOPIFY_API_KEY vb.)
  | 'LIMIT_EXCEEDED' // plan sınırı (ürün sayısı)
  | 'WEBHOOK_INVALID'; // HMAC doğrulaması başarısız

export const USER_MESSAGES: Record<CommerceErrorCode, string> = {
  AUTH_INVALID: 'Mağaza kimlik bilgileri geçersiz. Bağlantıyı yeniden kurun.',
  AUTH_EXPIRED: 'Mağaza erişim izni sona erdi. Bağlantıyı yeniden kurun.',
  SCOPE_MISSING: 'Gerekli okuma izni verilmemiş (ürün okuma).',
  RATE_LIMITED: 'Sağlayıcı istek sınırı aşıldı; senkron otomatik olarak daha sonra devam edecek.',
  NOT_FOUND: 'Mağaza veya kaynak bulunamadı.',
  INVALID_STORE: 'Mağaza adresi geçersiz.',
  UPSTREAM_ERROR: 'Sağlayıcı geçici bir hata döndürdü; yeniden denenecek.',
  NETWORK: 'Sağlayıcıya ulaşılamadı (zaman aşımı veya ağ hatası).',
  UNSUPPORTED: 'Bu platform bu özelliği desteklemiyor.',
  CONFIG_MISSING: 'Bu entegrasyon sunucuda yapılandırılmamış.',
  LIMIT_EXCEEDED: 'Plan sınırı aşıldı; katalog kısmen senkronlandı.',
  WEBHOOK_INVALID: 'Webhook imzası doğrulanamadı.',
};

/**
 * OAuth geri dönüşünde (`/dashboard/integrations?error=<kod>`) görülebilecek, CommerceError dışı
 * kodlar. Bilinmeyen kod için `commerceMessage` genel bir metin üretir (kodu gösterir, sızıntı yok).
 */
export const CALLBACK_MESSAGES: Record<string, string> = {
  access_denied: 'Mağaza yetkilendirmesi reddedildi. İsterseniz yeniden deneyebilirsiniz.',
  invalid_state:
    'Yetkilendirme oturumu doğrulanamadı (süresi dolmuş veya başka tarayıcıda başlatılmış olabilir). Bağlantıyı yeniden başlatın.',
  state_mismatch: 'Yetkilendirme oturumu doğrulanamadı (süresi dolmuş olabilir). Bağlantıyı yeniden başlatın.',
  state_missing: 'Yetkilendirme oturumu bulunamadı. Bağlantıyı yeniden başlatın.',
  invalid_hmac: 'Sağlayıcıdan gelen imza doğrulanamadı. Bağlantıyı yeniden başlatın.',
  hmac_invalid: 'Sağlayıcıdan gelen imza doğrulanamadı. Bağlantıyı yeniden başlatın.',
  shop_mismatch:
    'Yetkilendirilen mağaza, başlatılan bağlantıyla eşleşmiyor. Doğru mağazada oturum açıp yeniden deneyin.',
  not_found: 'Bağlantı kaydı bulunamadı; sihirbazı yeniden başlatın.',
  connection_not_found: 'Bağlantı kaydı bulunamadı; sihirbazı yeniden başlatın.',
  already_connected: 'Bu mağaza zaten bağlı. Yeniden bağlamak için önce mevcut bağlantıyı kesin.',
  forbidden: 'Bu işlem için yetkiniz yok (yalnızca Admin/Owner mağaza bağlayabilir).',
  missing_params: 'Sağlayıcı eksik parametre döndürdü. Bağlantıyı yeniden başlatın.',
  session_expired: 'Oturumunuz sona erdi; giriş yapıp bağlantıyı yeniden başlatın.',
};

export function isCommerceErrorCode(code: unknown): code is CommerceErrorCode {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(USER_MESSAGES, code);
}

/** Kod → kullanıcı metni (CommerceError kodları + OAuth dönüş kodları + güvenli genel metin). */
export function commerceMessage(code: string | null | undefined): string {
  if (!code) return 'Bağlantı tamamlanamadı. Yeniden deneyin.';
  if (isCommerceErrorCode(code)) return USER_MESSAGES[code];
  const lower = code.toLowerCase();
  if (CALLBACK_MESSAGES[lower]) return CALLBACK_MESSAGES[lower];
  const safe = code.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  return `Bağlantı tamamlanamadı (kod: ${safe || 'bilinmiyor'}). Yeniden deneyin.`;
}
