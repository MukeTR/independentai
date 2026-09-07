/**
 * SiteGoal — sektörden bağımsız dönüşüm tanımı ve eşleştirme motoru.
 *
 * Üç eşleştirme yöntemi:
 *  - `PATH`            : kod yazmadan URL ile ("/tesekkurler", "/rezervasyon/*")
 *  - `EVENT`           : SDK'nın gönderdiği olay tipi ya da özel olay adı ("demo_request")
 *  - `DATA_ATTRIBUTE`  : `data-iai-event="…"` ile işaretlenmiş tıklama
 *
 * Aynı oturumda aynı hedef yalnızca **bir kez** dönüşüm sayılır (dedupe).
 */
import type { GoalMatch, GoalType, SiteGoal } from '@independentai/db';
import { prisma } from '../prisma';
import { ClientError, ConflictError, NotFoundError } from '../errors';
import type { Actor } from '../authz';
import { normalizePath, safeToken, toEventType } from './events';
import type { NormalizedEvent } from './events';
import { getOwnedSite } from './sites';

export const GOAL_TYPES = [
  'SIGN_UP',
  'LEAD',
  'DEMO',
  'CONTACT',
  'BOOKING',
  'APPLICATION',
  'SUBSCRIBE',
  'PURCHASE',
  'CUSTOM',
] as const satisfies readonly GoalType[];

export const GOAL_MATCHES = ['EVENT', 'PATH', 'DATA_ATTRIBUTE'] as const satisfies readonly GoalMatch[];

/** Site türüne göre hazır hedef paketleri (kullanıcı isterse tek tıkla ekler). */
export const GOAL_TEMPLATES: Record<string, { name: string; type: GoalType; matchMethod: GoalMatch; eventName?: string; pathPattern?: string }[]> = {
  saas: [
    { name: 'Kayıt', type: 'SIGN_UP', matchMethod: 'EVENT', eventName: 'sign_up' },
    { name: 'Demo talebi', type: 'DEMO', matchMethod: 'EVENT', eventName: 'demo_request' },
    { name: 'Fiyat sayfası', type: 'CUSTOM', matchMethod: 'PATH', pathPattern: '/fiyat*' },
  ],
  service: [
    { name: 'Form gönderimi', type: 'LEAD', matchMethod: 'EVENT', eventName: 'form_submit' },
    { name: 'Telefon tıklaması', type: 'CONTACT', matchMethod: 'EVENT', eventName: 'phone_click' },
    { name: 'Randevu', type: 'BOOKING', matchMethod: 'EVENT', eventName: 'booking' },
  ],
  media: [
    { name: 'İçerik görüntüleme', type: 'CUSTOM', matchMethod: 'EVENT', eventName: 'content_view' },
    { name: 'Abonelik', type: 'SUBSCRIBE', matchMethod: 'EVENT', eventName: 'subscribe' },
  ],
  education: [
    { name: 'Program görüntüleme', type: 'CUSTOM', matchMethod: 'EVENT', eventName: 'content_view' },
    { name: 'Başvuru', type: 'APPLICATION', matchMethod: 'EVENT', eventName: 'application' },
  ],
  marketplace: [
    { name: 'İlan görüntüleme', type: 'CUSTOM', matchMethod: 'EVENT', eventName: 'content_view' },
    { name: 'Satıcıya ulaşma', type: 'CONTACT', matchMethod: 'EVENT', eventName: 'phone_click' },
  ],
  ecommerce: [
    { name: 'Ürün görüntüleme', type: 'CUSTOM', matchMethod: 'EVENT', eventName: 'product_view' },
    { name: 'Sepete ekleme', type: 'CUSTOM', matchMethod: 'EVENT', eventName: 'add_to_cart' },
    { name: 'Satın alma', type: 'PURCHASE', matchMethod: 'EVENT', eventName: 'purchase' },
  ],
  other: [{ name: 'Form gönderimi', type: 'LEAD', matchMethod: 'EVENT', eventName: 'form_submit' }],
};

export type GoalView = {
  id: string;
  name: string;
  type: GoalType;
  matchMethod: GoalMatch;
  pathPattern: string | null;
  eventName: string | null;
  attributeValue: string | null;
  defaultValue: number | null;
  currency: string | null;
  isActive: boolean;
};

export function toGoalView(g: SiteGoal): GoalView {
  return {
    id: g.id,
    name: g.name,
    type: g.type,
    matchMethod: g.matchMethod,
    pathPattern: g.pathPattern,
    eventName: g.eventName,
    attributeValue: g.attributeValue,
    defaultValue: g.defaultValue ? Number(g.defaultValue) : null,
    currency: g.currency,
    isActive: g.isActive,
  };
}

/**
 * Yol deseni eşleştirme: sondaki `*` önek eşleşmesi, diğer hâllerde tam eşleşme.
 * Desen normalize edilerek saklanır, böylece "/Tesekkurler/" ile "/tesekkurler" aynıdır.
 */
export function pathMatches(pattern: string, path: string): boolean {
  if (!pattern) return false;
  const p = pattern.endsWith('*') ? pattern.slice(0, -1) : pattern;
  const normPattern = normalizePath(p === '' ? '/' : p).toLowerCase();
  const normPath = path.toLowerCase();
  if (pattern.endsWith('*')) {
    return normPattern === '/' ? true : normPath === normPattern || normPath.startsWith(`${normPattern}/`) || normPath.startsWith(normPattern);
  }
  return normPath === normPattern;
}

/** Olay için eşleşen ilk aktif hedefi döndürür (öncelik: EVENT/DATA_ATTRIBUTE > PATH). */
export function matchGoal(goals: SiteGoal[], event: NormalizedEvent): SiteGoal | null {
  const active = goals.filter((g) => g.isActive);
  const eventName = (event.customName ?? '').toLowerCase();
  const typeName = event.type.toLowerCase();

  for (const g of active) {
    if (g.matchMethod === 'EVENT' && g.eventName) {
      const want = g.eventName.toLowerCase();
      if (want === typeName || (eventName && want === eventName)) return g;
    }
    if (g.matchMethod === 'DATA_ATTRIBUTE' && g.attributeValue) {
      if (eventName && g.attributeValue.toLowerCase() === eventName) return g;
    }
  }
  // Yol hedefleri yalnızca sayfa görüntülemede sayılır (tıklama olayları yolu tekrar tetiklemesin).
  if (event.type === 'PAGE_VIEW' || event.type === 'CONTENT_VIEW') {
    for (const g of active) {
      if (g.matchMethod === 'PATH' && g.pathPattern && pathMatches(g.pathPattern, event.path)) return g;
    }
  }
  return null;
}

// ───────────── CRUD ─────────────

function cleanGoalInput(input: Record<string, unknown>) {
  const name = typeof input.name === 'string' ? input.name.trim().slice(0, 80) : '';
  if (name.length < 2) throw new ClientError('Hedef adı en az 2 karakter olmalı');

  const type = GOAL_TYPES.includes(input.type as GoalType) ? (input.type as GoalType) : null;
  if (!type) throw new ClientError('Geçersiz hedef türü');

  const matchMethod = GOAL_MATCHES.includes(input.matchMethod as GoalMatch) ? (input.matchMethod as GoalMatch) : null;
  if (!matchMethod) throw new ClientError('Geçersiz eşleştirme yöntemi');

  let pathPattern: string | null = null;
  let eventName: string | null = null;
  let attributeValue: string | null = null;

  if (matchMethod === 'PATH') {
    const raw = typeof input.pathPattern === 'string' ? input.pathPattern.trim() : '';
    if (!raw) throw new ClientError('Yol deseni gerekli (örn. /tesekkurler)');
    const wildcard = raw.endsWith('*');
    const base = normalizePath(wildcard ? raw.slice(0, -1) : raw);
    pathPattern = wildcard ? `${base === '/' ? '' : base}*` : base;
  } else if (matchMethod === 'EVENT') {
    const raw = safeToken(input.eventName, 60);
    if (!raw) throw new ClientError('Olay adı gerekli (örn. demo_request)');
    const normalized = raw.toLowerCase().replace(/[\s-]+/g, '_');
    // Bilinen tip ya da serbest özel ad
    eventName = toEventType(normalized) ? normalized : normalized;
  } else {
    const raw = safeToken(input.attributeValue, 60);
    if (!raw) throw new ClientError('data-iai-event değeri gerekli');
    attributeValue = raw.toLowerCase().replace(/[\s-]+/g, '_');
  }

  const valueRaw = input.defaultValue;
  const defaultValue =
    valueRaw === null || valueRaw === undefined || valueRaw === ''
      ? null
      : Number.isFinite(Number(valueRaw)) && Number(valueRaw) >= 0
        ? Number(valueRaw)
        : null;
  const currency = typeof input.currency === 'string' ? input.currency.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || null : null;

  return { name, type, matchMethod, pathPattern, eventName, attributeValue, defaultValue, currency };
}

export async function listGoals(tenantId: string, trackedSiteId: string): Promise<GoalView[]> {
  const goals = await prisma.siteGoal.findMany({ where: { tenantId, trackedSiteId }, orderBy: { createdAt: 'asc' } });
  return goals.map(toGoalView);
}

export async function createGoal(actor: Actor, trackedSiteId: string, input: Record<string, unknown>): Promise<GoalView> {
  const site = await getOwnedSite(actor, trackedSiteId);
  const data = cleanGoalInput(input);
  const count = await prisma.siteGoal.count({ where: { trackedSiteId: site.id } });
  if (count >= 25) throw new ClientError('Site başına en fazla 25 hedef tanımlanabilir');
  try {
    const goal = await prisma.siteGoal.create({
      data: { tenantId: actor.tenantId, trackedSiteId: site.id, ...data },
    });
    return toGoalView(goal);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unique')) throw new ConflictError('Bu adla bir hedef zaten var');
    throw err;
  }
}

export async function updateGoal(actor: Actor, goalId: string, input: Record<string, unknown>): Promise<GoalView> {
  const goal = await prisma.siteGoal.findFirst({ where: { id: goalId, tenantId: actor.tenantId } });
  if (!goal) throw new NotFoundError('Hedef bulunamadı');
  if (input.isActive !== undefined && Object.keys(input).length === 1) {
    const updated = await prisma.siteGoal.update({ where: { id: goal.id }, data: { isActive: input.isActive === true } });
    return toGoalView(updated);
  }
  const data = cleanGoalInput({ ...goal, ...input });
  const updated = await prisma.siteGoal.update({
    where: { id: goal.id },
    data: { ...data, isActive: input.isActive === undefined ? goal.isActive : input.isActive === true },
  });
  return toGoalView(updated);
}

export async function deleteGoal(actor: Actor, goalId: string): Promise<void> {
  const goal = await prisma.siteGoal.findFirst({ where: { id: goalId, tenantId: actor.tenantId } });
  if (!goal) throw new NotFoundError('Hedef bulunamadı');
  await prisma.siteGoal.delete({ where: { id: goal.id } });
}

/** Şablon paketini uygular (var olan adlar atlanır). */
export async function applyGoalTemplate(actor: Actor, trackedSiteId: string, kind: string): Promise<GoalView[]> {
  const site = await getOwnedSite(actor, trackedSiteId);
  const template = GOAL_TEMPLATES[kind] ?? GOAL_TEMPLATES.other!;
  const existing = await prisma.siteGoal.findMany({ where: { trackedSiteId: site.id }, select: { name: true } });
  const names = new Set(existing.map((g) => g.name));
  const created: GoalView[] = [];
  for (const t of template) {
    if (names.has(t.name)) continue;
    const goal = await prisma.siteGoal.create({
      data: {
        tenantId: actor.tenantId,
        trackedSiteId: site.id,
        name: t.name,
        type: t.type,
        matchMethod: t.matchMethod,
        eventName: t.eventName ?? null,
        pathPattern: t.pathPattern ?? null,
      },
    });
    created.push(toGoalView(goal));
  }
  return created;
}
