-- Gece programı (2026-09-21): AuditKind 11 yeni değer, PublicScan ek sütun/indeks, Lead, BlockedSite,
-- Announcement, AgencySignal + enum'lar; backfill (PublicScan → Lead). Yalnızca ekleme; DROP/ALTER TYPE yok.
--
-- 1) Enum genişletme: dosya başında. Bu dosyadaki hiçbir DEFAULT/INSERT yeni AuditKind değerini KULLANMAZ
--    (PostgreSQL: aynı transaction içinde yeni enum değeri kullanılamaz).
ALTER TYPE "AuditKind" ADD VALUE 'ONPAGE_SEO';
ALTER TYPE "AuditKind" ADD VALUE 'SOCIAL_PREVIEW';
ALTER TYPE "AuditKind" ADD VALUE 'SECURITY_HEADERS';
ALTER TYPE "AuditKind" ADD VALUE 'REDIRECTS';
ALTER TYPE "AuditKind" ADD VALUE 'BROKEN_LINKS';
ALTER TYPE "AuditKind" ADD VALUE 'ROBOTS_SITEMAP';
ALTER TYPE "AuditKind" ADD VALUE 'HREFLANG';
ALTER TYPE "AuditKind" ADD VALUE 'SCHEMA_AUDIT';
ALTER TYPE "AuditKind" ADD VALUE 'QUESTION_COVERAGE';
ALTER TYPE "AuditKind" ADD VALUE 'TRUST_SIGNALS';
ALTER TYPE "AuditKind" ADD VALUE 'COMPARE';

-- 2) Yeni tipler, 3) PublicScan ek sütun + indeks, 4) tablolar (Prisma `migrate diff` çıktısı; sıra korunur)
-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('TOOL', 'CONTACT', 'ONBOARDING', 'RANK_CHECK', 'ADMIN');

-- CreateEnum
CREATE TYPE "AnnouncementTone" AS ENUM ('INFO', 'PROMO', 'WARN');

-- CreateEnum
CREATE TYPE "AnnouncementPlacement" AS ENUM ('LANDING', 'PRICING', 'TOOLS', 'APP');

-- CreateEnum
CREATE TYPE "AgencySubject" AS ENUM ('TENANT', 'VISITOR');

-- CreateEnum
CREATE TYPE "AgencySignalStatus" AS ENUM ('CANDIDATE', 'CONTACTED', 'CONVERTED', 'DISMISSED', 'DECLARED');

-- AlterTable
ALTER TABLE "PublicScan" ADD COLUMN     "meta" JSONB,
ADD COLUMN     "partial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sector" TEXT,
ADD COLUMN     "tenantId" TEXT,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "visitorHash" TEXT;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "hostname" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "lastScore" INTEGER,
    "bestScore" INTEGER,
    "kinds" "AuditKind"[] DEFAULT ARRAY[]::"AuditKind"[],
    "platform" TEXT,
    "sector" TEXT,
    "tenantId" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" "LeadSource" NOT NULL DEFAULT 'TOOL',
    "ownerUserId" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "company" TEXT,
    "message" TEXT,
    "topic" TEXT,
    "consentAt" TIMESTAMP(3),
    "iysConsentAt" TIMESTAMP(3),
    "utm" JSONB,
    "lastReportToken" TEXT,
    "notes" TEXT,
    "activity" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedSite" (
    "id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "redirectUrl" TEXT NOT NULL,
    "note" TEXT,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockedSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "tone" "AnnouncementTone" NOT NULL DEFAULT 'INFO',
    "placement" "AnnouncementPlacement" NOT NULL DEFAULT 'LANDING',
    "text" TEXT NOT NULL,
    "href" TEXT,
    "ctaLabel" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencySignal" (
    "id" TEXT NOT NULL,
    "subject" "AgencySubject" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "reasons" JSONB NOT NULL,
    "hostnames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "AgencySignalStatus" NOT NULL DEFAULT 'CANDIDATE',
    "declaredAt" TIMESTAMP(3),
    "note" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencySignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_hostname_key" ON "Lead"("hostname");

-- CreateIndex
CREATE INDEX "Lead_status_lastSeenAt_idx" ON "Lead"("status", "lastSeenAt");

-- CreateIndex
CREATE INDEX "Lead_lastSeenAt_idx" ON "Lead"("lastSeenAt");

-- CreateIndex
CREATE INDEX "Lead_contactEmail_idx" ON "Lead"("contactEmail");

-- CreateIndex
CREATE INDEX "Lead_tenantId_idx" ON "Lead"("tenantId");

-- CreateIndex
CREATE INDEX "Lead_source_createdAt_idx" ON "Lead"("source", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_sector_idx" ON "Lead"("sector");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedSite_hostname_key" ON "BlockedSite"("hostname");

-- CreateIndex
CREATE INDEX "Announcement_placement_enabled_idx" ON "Announcement"("placement", "enabled");

-- CreateIndex
CREATE INDEX "AgencySignal_status_score_idx" ON "AgencySignal"("status", "score");

-- CreateIndex
CREATE INDEX "AgencySignal_computedAt_idx" ON "AgencySignal"("computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgencySignal_subject_subjectId_key" ON "AgencySignal"("subject", "subjectId");

-- CreateIndex
CREATE INDEX "PublicScan_hostname_createdAt_idx" ON "PublicScan"("hostname", "createdAt");

-- CreateIndex
CREATE INDEX "PublicScan_visitorHash_createdAt_idx" ON "PublicScan"("visitorHash", "createdAt");

-- CreateIndex
CREATE INDEX "PublicScan_tenantId_createdAt_idx" ON "PublicScan"("tenantId", "createdAt");

-- 5) Backfill: mevcut public taramalardan lead (yalnız hostname/scanCount/tarih; kinds'a dokunulmaz)
INSERT INTO "Lead" ("id", "hostname", "firstSeenAt", "lastSeenAt", "scanCount", "source", "updatedAt")
SELECT md5(random()::text || hostname), hostname, min("createdAt"), max("createdAt"), count(*), 'TOOL', now()
FROM "PublicScan"
GROUP BY hostname
ON CONFLICT ("hostname") DO NOTHING;
