-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('LAUNCH', 'STARTER', 'GROWTH');

-- CreateEnum
CREATE TYPE "RunOrigin" AS ENUM ('MANUAL', 'INITIAL', 'CRON');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'ERROR');

-- CreateEnum
CREATE TYPE "AuthTokenKind" AS ENUM ('PASSWORD_RESET', 'EMAIL_VERIFY');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "plan" "PlanTier" NOT NULL DEFAULT 'LAUNCH';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ModelRun" ADD COLUMN     "attempt" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "dedupeKey" TEXT,
ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "groundingMode" TEXT,
ADD COLUMN     "inputTokens" INTEGER,
ADD COLUMN     "leaseExpiresAt" TIMESTAMP(3),
ADD COLUMN     "locale" TEXT,
ADD COLUMN     "origin" "RunOrigin" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "outputTokens" INTEGER,
ADD COLUMN     "promptVersion" INTEGER,
ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ADD COLUMN     "status" "RunStatus" NOT NULL DEFAULT 'SUCCESS',
ADD COLUMN     "webSearchCount" INTEGER;

-- AlterTable
ALTER TABLE "AlertConfig" ADD COLUMN     "slackWebhookEncrypted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ApiToken" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "scopes" TEXT[] DEFAULT ARRAY['read:visibility']::TEXT[];

-- CreateTable
CREATE TABLE "TeamInvite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AuthTokenKind" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunBatch" (
    "id" TEXT NOT NULL,
    "origin" "RunOrigin" NOT NULL,
    "hop" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "enqueued" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "remaining" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "triggeredBy" TEXT,

    CONSTRAINT "RunBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "kind" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recipient" TEXT,
    "providerMessageId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvite_tokenHash_key" ON "TeamInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "TeamInvite_tenantId_idx" ON "TeamInvite"("tenantId");

-- CreateIndex
CREATE INDEX "TeamInvite_email_idx" ON "TeamInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_userId_kind_idx" ON "AuthToken"("userId", "kind");

-- CreateIndex
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "RunBatch_startedAt_idx" ON "RunBatch"("startedAt");

-- CreateIndex
CREATE INDEX "NotificationLog_tenantId_createdAt_idx" ON "NotificationLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationLog_kind_createdAt_idx" ON "NotificationLog"("kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ModelRun_dedupeKey_key" ON "ModelRun"("dedupeKey");

-- CreateIndex
CREATE INDEX "ModelRun_status_scheduledFor_idx" ON "ModelRun"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "ModelRun_promptId_provider_runDate_idx" ON "ModelRun"("promptId", "provider", "runDate");

-- AddForeignKey
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── Veri backfill (idempotent) ──
-- Eski hata kayıtları: errorMessage dolu olanlar ERROR statüsüne alınır.
UPDATE "ModelRun" SET "status" = 'ERROR' WHERE "errorMessage" IS NOT NULL AND "status" = 'SUCCESS';
UPDATE "ModelRun" SET "completedAt" = "runDate" WHERE "completedAt" IS NULL;
-- Metin içi link çıkarımı ile üretilmiş eski run'lar: grounding modu "text".
UPDATE "ModelRun" SET "groundingMode" = 'text' WHERE "groundingMode" IS NULL AND "isMocked" = false AND "errorMessage" IS NULL;
-- Zaten marka + prompt eklemiş tenant'lar onboarding'i tamamlamış sayılır.
UPDATE "Tenant" t SET "onboardingCompletedAt" = t."createdAt"
WHERE t."onboardingCompletedAt" IS NULL
  AND EXISTS (SELECT 1 FROM "Brand" b WHERE b."tenantId" = t."id" AND b."isOwn" = true)
  AND EXISTS (SELECT 1 FROM "Prompt" p WHERE p."tenantId" = t."id");
-- OAuth (Google/LinkedIn OIDC) ile açılmış hesapların e-postası sağlayıcı tarafından doğrulanmıştır.
UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL AND "oauthProvider" IS NOT NULL;
-- Mention sorguları için ek indeks (own-brand filtresi).
CREATE INDEX IF NOT EXISTS "BrandMention_modelRunId_isOwnBrand_idx" ON "BrandMention"("modelRunId", "isOwnBrand");
