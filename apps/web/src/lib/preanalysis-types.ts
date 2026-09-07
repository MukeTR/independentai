import type { AuditFinding } from '@/server/geo-audit';
import type { DetectedPlatform } from '@/server/commerce/platform-detect';

/** POST /api/tools/agency-preanalysis yanıt öğesi (istemci ve route ortak tipi). */
export type PreanalysisItem = {
  domain: string;
  url: string;
  score: number;
  breakdown: {
    answerFirst: number;
    citationAuthority: number;
    aiComprehension: number;
    technical: number;
    freshness: number;
  };
  platform: { platform: DetectedPlatform; label: string; confidence: number; connectorAvailable: boolean };
  findings: AuditFinding[];
  fetched: boolean;
};
