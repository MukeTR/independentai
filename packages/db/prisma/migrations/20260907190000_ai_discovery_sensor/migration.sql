-- CreateEnum
CREATE TYPE "TrackedSiteStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'REVOKED');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('SIGN_UP', 'LEAD', 'DEMO', 'CONTACT', 'BOOKING', 'APPLICATION', 'SUBSCRIBE', 'PURCHASE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GoalMatch" AS ENUM ('EVENT', 'PATH', 'DATA_ATTRIBUTE');

-- CreateEnum
CREATE TYPE "SourceClass" AS ENUM ('AI_REFERRAL', 'DIRECT', 'ORGANIC', 'OTHER');

-- CreateEnum
CREATE TYPE "SiteEventType" AS ENUM ('PAGE_VIEW', 'CONTENT_VIEW', 'CTA_CLICK', 'FORM_START', 'FORM_SUBMIT', 'SIGN_UP', 'DEMO_REQUEST', 'PHONE_CLICK', 'BOOKING', 'APPLICATION', 'SUBSCRIBE', 'PRODUCT_VIEW', 'ADD_TO_CART', 'PURCHASE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AttributionSource" AS ENUM ('USER_REPORTED', 'INFERRED', 'SYNTHETIC');

-- CreateEnum
CREATE TYPE "BotPurpose" AS ENUM ('TRAINING', 'SEARCH', 'ASSISTANT', 'AGENT', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationLevel" AS ENUM ('VERIFIED', 'PROBABLE', 'UNVERIFIED');

-- CreateTable
CREATE TABLE "TrackedSite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "normalizedOrigin" TEXT NOT NULL,
    "allowedOrigins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "TrackedSiteStatus" NOT NULL DEFAULT 'PENDING',
    "publicKeyHash" TEXT NOT NULL,
    "publicKeyPrefix" TEXT NOT NULL,
    "ingestSecretEnc" TEXT,
    "ingestSecretPrefix" TEXT,
    "installMethod" TEXT,
    "siteKind" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "lastBrowserEventAt" TIMESTAMP(3),
    "lastServerEventAt" TIMESTAMP(3),
    "lastSdkVersion" TEXT,
    "retentionDays" INTEGER NOT NULL DEFAULT 90,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteGoal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trackedSiteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GoalType" NOT NULL,
    "matchMethod" "GoalMatch" NOT NULL,
    "pathPattern" TEXT,
    "eventName" TEXT,
    "attributeValue" TEXT,
    "defaultValue" DECIMAL(12,2),
    "currency" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAcquisitionSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trackedSiteId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "sourceClass" "SourceClass" NOT NULL DEFAULT 'OTHER',
    "provider" TEXT,
    "referrerHost" TEXT,
    "landingPath" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt" TIMESTAMP(3),
    "goalId" TEXT,
    "value" DECIMAL(12,2),
    "currency" TEXT,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAcquisitionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiJourneyEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trackedSiteId" TEXT NOT NULL,
    "sessionId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "type" "SiteEventType" NOT NULL,
    "path" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "entityLabel" TEXT,
    "goalId" TEXT,
    "value" DECIMAL(12,2),
    "currency" TEXT,
    "sdkVersion" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiJourneyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptAttribution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trackedSiteId" TEXT,
    "sessionId" TEXT,
    "promptId" TEXT,
    "source" "AttributionSource" NOT NULL,
    "intent" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "evidence" JSONB,
    "reportedText" TEXT,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiBotIdentity" (
    "id" TEXT NOT NULL,
    "canonicalId" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "purpose" "BotPurpose" NOT NULL DEFAULT 'OTHER',
    "userAgents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verificationMethod" TEXT NOT NULL DEFAULT 'none',
    "reverseDnsSuffixes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "docsUrl" TEXT,
    "registryVersion" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiBotIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCrawlerEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trackedSiteId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "botId" TEXT,
    "operator" TEXT,
    "canonicalBotId" TEXT,
    "purpose" "BotPurpose" NOT NULL DEFAULT 'OTHER',
    "verification" "VerificationLevel" NOT NULL DEFAULT 'UNVERIFIED',
    "verificationMethod" TEXT,
    "path" TEXT NOT NULL,
    "status" INTEGER,
    "contentType" TEXT,
    "source" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCrawlerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTrafficRollup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trackedSiteId" TEXT NOT NULL,
    "granularity" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "dimKey" TEXT NOT NULL,
    "dims" JSONB NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiTrafficRollup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackedSite_publicKeyHash_key" ON "TrackedSite"("publicKeyHash");

-- CreateIndex
CREATE INDEX "TrackedSite_tenantId_status_idx" ON "TrackedSite"("tenantId", "status");

-- CreateIndex
CREATE INDEX "TrackedSite_status_lastBrowserEventAt_idx" ON "TrackedSite"("status", "lastBrowserEventAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedSite_tenantId_domain_key" ON "TrackedSite"("tenantId", "domain");

-- CreateIndex
CREATE INDEX "SiteGoal_trackedSiteId_isActive_idx" ON "SiteGoal"("trackedSiteId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SiteGoal_trackedSiteId_name_key" ON "SiteGoal"("trackedSiteId", "name");

-- CreateIndex
CREATE INDEX "AiAcquisitionSession_tenantId_firstSeenAt_idx" ON "AiAcquisitionSession"("tenantId", "firstSeenAt");

-- CreateIndex
CREATE INDEX "AiAcquisitionSession_trackedSiteId_sourceClass_firstSeenAt_idx" ON "AiAcquisitionSession"("trackedSiteId", "sourceClass", "firstSeenAt");

-- CreateIndex
CREATE INDEX "AiAcquisitionSession_expiresAt_idx" ON "AiAcquisitionSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiAcquisitionSession_trackedSiteId_sessionKey_key" ON "AiAcquisitionSession"("trackedSiteId", "sessionKey");

-- CreateIndex
CREATE UNIQUE INDEX "AiJourneyEvent_dedupeKey_key" ON "AiJourneyEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "AiJourneyEvent_tenantId_occurredAt_idx" ON "AiJourneyEvent"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "AiJourneyEvent_trackedSiteId_type_occurredAt_idx" ON "AiJourneyEvent"("trackedSiteId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "AiJourneyEvent_sessionId_idx" ON "AiJourneyEvent"("sessionId");

-- CreateIndex
CREATE INDEX "AiJourneyEvent_expiresAt_idx" ON "AiJourneyEvent"("expiresAt");

-- CreateIndex
CREATE INDEX "PromptAttribution_tenantId_createdAt_idx" ON "PromptAttribution"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "PromptAttribution_trackedSiteId_source_createdAt_idx" ON "PromptAttribution"("trackedSiteId", "source", "createdAt");

-- CreateIndex
CREATE INDEX "PromptAttribution_sessionId_idx" ON "PromptAttribution"("sessionId");

-- CreateIndex
CREATE INDEX "PromptAttribution_promptId_idx" ON "PromptAttribution"("promptId");

-- CreateIndex
CREATE UNIQUE INDEX "AiBotIdentity_canonicalId_key" ON "AiBotIdentity"("canonicalId");

-- CreateIndex
CREATE INDEX "AiBotIdentity_isActive_idx" ON "AiBotIdentity"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AiCrawlerEvent_dedupeKey_key" ON "AiCrawlerEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "AiCrawlerEvent_tenantId_occurredAt_idx" ON "AiCrawlerEvent"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "AiCrawlerEvent_trackedSiteId_verification_occurredAt_idx" ON "AiCrawlerEvent"("trackedSiteId", "verification", "occurredAt");

-- CreateIndex
CREATE INDEX "AiCrawlerEvent_trackedSiteId_canonicalBotId_occurredAt_idx" ON "AiCrawlerEvent"("trackedSiteId", "canonicalBotId", "occurredAt");

-- CreateIndex
CREATE INDEX "AiCrawlerEvent_expiresAt_idx" ON "AiCrawlerEvent"("expiresAt");

-- CreateIndex
CREATE INDEX "AiTrafficRollup_tenantId_granularity_bucketStart_idx" ON "AiTrafficRollup"("tenantId", "granularity", "bucketStart");

-- CreateIndex
CREATE INDEX "AiTrafficRollup_trackedSiteId_kind_bucketStart_idx" ON "AiTrafficRollup"("trackedSiteId", "kind", "bucketStart");

-- CreateIndex
CREATE UNIQUE INDEX "AiTrafficRollup_trackedSiteId_granularity_bucketStart_kind__key" ON "AiTrafficRollup"("trackedSiteId", "granularity", "bucketStart", "kind", "dimKey");

-- AddForeignKey
ALTER TABLE "TrackedSite" ADD CONSTRAINT "TrackedSite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteGoal" ADD CONSTRAINT "SiteGoal_trackedSiteId_fkey" FOREIGN KEY ("trackedSiteId") REFERENCES "TrackedSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAcquisitionSession" ADD CONSTRAINT "AiAcquisitionSession_trackedSiteId_fkey" FOREIGN KEY ("trackedSiteId") REFERENCES "TrackedSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAcquisitionSession" ADD CONSTRAINT "AiAcquisitionSession_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "SiteGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJourneyEvent" ADD CONSTRAINT "AiJourneyEvent_trackedSiteId_fkey" FOREIGN KEY ("trackedSiteId") REFERENCES "TrackedSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJourneyEvent" ADD CONSTRAINT "AiJourneyEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AiAcquisitionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJourneyEvent" ADD CONSTRAINT "AiJourneyEvent_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "SiteGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptAttribution" ADD CONSTRAINT "PromptAttribution_trackedSiteId_fkey" FOREIGN KEY ("trackedSiteId") REFERENCES "TrackedSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptAttribution" ADD CONSTRAINT "PromptAttribution_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AiAcquisitionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptAttribution" ADD CONSTRAINT "PromptAttribution_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCrawlerEvent" ADD CONSTRAINT "AiCrawlerEvent_trackedSiteId_fkey" FOREIGN KEY ("trackedSiteId") REFERENCES "TrackedSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCrawlerEvent" ADD CONSTRAINT "AiCrawlerEvent_botId_fkey" FOREIGN KEY ("botId") REFERENCES "AiBotIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTrafficRollup" ADD CONSTRAINT "AiTrafficRollup_trackedSiteId_fkey" FOREIGN KEY ("trackedSiteId") REFERENCES "TrackedSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

