/**
 * Entegrasyon paneli istemci tipleri — `/api/integrations*` yanıtlarının JSON (tarihler ISO string) hâli.
 * Kimlik bilgisi alanı hiçbir tipte yoktur; sunucu `publicConnectionView` ile zaten çıkarır.
 */
export type CommerceProvider = 'SHOPIFY' | 'IKAS' | 'TICIMAX';
export type ConnectionStatus = 'PENDING' | 'ACTIVE' | 'ERROR' | 'DISCONNECTED';
export type SyncJobStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';

export type LastSyncDto = {
  id: string;
  status: SyncJobStatus | string;
  fetched: number;
  total: number | null;
  errorCode: string | null;
  finishedAt: string | null;
  startedAt: string | null;
};

export type ConnectionDto = {
  id: string;
  provider: CommerceProvider;
  providerLabel: string;
  storeDomain: string;
  displayName: string | null;
  externalStoreId: string | null;
  status: ConnectionStatus;
  capabilities: Record<string, unknown> | null;
  scopes: string[];
  webhooksRegistered: boolean;
  lastSyncAt: string | null;
  lastErrorCode: string | null;
  lastErrorAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasCredentials: boolean;
  productCount: number;
  lastSync: LastSyncDto | null;
  errorMessage: string | null;
  configured: boolean;
};

export type ProviderDto = {
  provider: CommerceProvider;
  label: string;
  configured: boolean;
  auth: 'oauth' | 'credentials';
  capabilities: {
    products: true;
    categories: boolean;
    webhooks: boolean;
    incremental: boolean;
    count: boolean;
    pageSize: number;
    productUrls: boolean;
    auth: string;
  } | null;
};

export type IntegrationsResponse = {
  connections: ConnectionDto[];
  providers: ProviderDto[];
  limits: { storeConnections: number; catalogProducts: number; used: number };
  canWrite: boolean;
};

export type SyncDto = {
  id: string;
  status: SyncJobStatus | string;
  page: number;
  fetched: number;
  upserted: number;
  unchanged: number;
  deleted: number;
  total: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  triggeredBy: string | null;
  attempt: number;
  createdAt: string;
  progress: number;
};

export type SyncsResponse = { connectionStatus: ConnectionStatus; syncs: SyncDto[] };

export type ProductDto = {
  id: string;
  externalId: string;
  title: string;
  handle: string | null;
  url: string | null;
  vendor: string | null;
  productType: string | null;
  categories: string[];
  description: string | null;
  price: { min: number | null; max: number | null };
  currency: string | null;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';
  imageUrl: string | null;
  imageAlt: string | null;
  seoTitle: string | null;
  hasSeoTitle: boolean;
  hasSeoDescription: boolean;
  status: string | null;
  syncedAt: string;
};

export type ProductsResponse = {
  items: ProductDto[];
  total: number;
  nextCursor: string | null;
  connectionStatus: ConnectionStatus;
};

/** Realtime `integration.sync` olayından veya polling'den türetilen anlık ilerleme. */
export type SyncProgress = {
  jobId: string | null;
  status: 'queued' | 'running' | 'retrying' | 'error' | 'success';
  progress: number;
  fetched: number | null;
  total: number | null;
  errorCode: string | null;
  at: number;
};

export type CreateConnectionResponse = { connection: ConnectionDto; next: string | null };

export type PlatformDetectResponse = {
  url: string;
  platform: string;
  label: string;
  confidence: number;
  evidence: string[];
  connectorAvailable: boolean;
};

export const STATUS_LABELS: Record<ConnectionStatus, string> = {
  PENDING: 'Bekliyor',
  ACTIVE: 'Bağlı',
  ERROR: 'Hata',
  DISCONNECTED: 'Kesildi',
};

export function isSyncActive(conn: ConnectionDto, progress: SyncProgress | undefined): boolean {
  if (progress) return progress.status === 'queued' || progress.status === 'running' || progress.status === 'retrying';
  const s = conn.lastSync?.status;
  return conn.status !== 'DISCONNECTED' && (s === 'PENDING' || s === 'RUNNING');
}

export function progressFromSync(s: SyncDto): SyncProgress {
  const status: SyncProgress['status'] =
    s.status === 'SUCCESS'
      ? 'success'
      : s.status === 'ERROR'
        ? 'error'
        : s.status === 'RUNNING'
          ? 'running'
          : s.attempt > 1
            ? 'retrying'
            : 'queued';
  return {
    jobId: s.id,
    status,
    progress: s.progress,
    fetched: s.fetched,
    total: s.total,
    errorCode: s.errorCode,
    at: Date.now(),
  };
}
