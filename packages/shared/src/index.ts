export * from './metrics';
export * from './capabilities';

export const PROVIDER_LABELS = {
  OPENAI: 'ChatGPT',
  ANTHROPIC: 'Claude',
  GOOGLE: 'Gemini',
} as const;

export const PROMPT_CATEGORIES = [
  { value: 'discovery', label: 'Keşif (öneri sorma)' },
  { value: 'comparison', label: 'Karşılaştırma' },
  { value: 'review', label: 'Yorum / değerlendirme' },
  { value: 'how_to', label: 'Nasıl yapılır' },
  { value: 'other', label: 'Diğer' },
] as const;

export const FREE_TRIAL_MONTHS = 6;

export type DashboardMetrics = {
  visibilityScore: number; // 0-100, geçerli run'ların % kaçında markam geçti
  shareOfVoice: number; // 0-100, kendi bahis / (kendi + rakip bahis)
  totalRuns: number; // geçerli (SUCCESS) run sayısı
  erroredRuns: number; // paydaya girmeyen hatalı run sayısı
  totalMentions: number;
  trend: { date: string; visibility: number }[];
  competitorBreakdown: { name: string; count: number }[];
  byProvider: { provider: string; visibility: number }[];
};

export type PromptDetailRun = {
  id: string;
  provider: string;
  modelName: string;
  runDate: string;
  responseText: string;
  isMocked: boolean;
  mentions: {
    name: string;
    isOwnBrand: boolean;
    isCompetitor: boolean;
    position: number;
    sentiment: string;
  }[];
};
