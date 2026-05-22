export const PROVIDER_LABELS = {
  OPENAI: 'ChatGPT',
  ANTHROPIC: 'Claude',
  GOOGLE: 'Gemini',
} as const;

export const PROVIDER_MODEL_DEFAULTS = {
  OPENAI: 'gpt-4o-mini',
  ANTHROPIC: 'claude-haiku-4-5',
  GOOGLE: 'gemini-1.5-flash',
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
  visibilityScore: number;     // 0-100, kaç % çalıştırmada markam geçti
  shareOfVoice: number;        // 0-100, markamın geçtiği yerlerde rakiplere oran
  totalRuns: number;
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
