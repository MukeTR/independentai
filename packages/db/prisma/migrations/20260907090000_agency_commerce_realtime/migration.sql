-- CreateEnum
CREATE TYPE "TenantKind" AS ENUM ('BRAND', 'AGENCY');

-- CreateEnum
CREATE TYPE "AgencyPlan" AS ENUM ('LAUNCH', 'STUDIO', 'SCALE');

-- CreateEnum
CREATE TYPE "AgencyRole" AS ENUM ('OWNER', 'ADMIN', 'STRATEGIST', 'ANALYST');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LinkRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CommerceProvider" AS ENUM ('SHOPIFY', 'IKAS', 'TICIMAX');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('IN_STOCK', 'OUT_OF_STOCK', 'UNKNOWN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditKind" ADD VALUE 'COMMERCE';
ALTER TYPE "AuditKind" ADD VALUE 'PRODUCT_PAGE';
ALTER TYPE "AuditKind" ADD VALUE 'CRAWLER';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "kind" "TenantKind" NOT NULL DEFAULT 'BRAND';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastActiveAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "agencyId" TEXT;

-- CreateTable
CREATE TABLE "AgencyAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "plan" "AgencyPlan" NOT NULL DEFAULT 'LAUNCH',
    "logoUrl" TEXT,
    "accentColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyMembership" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AgencyRole" NOT NULL DEFAULT 'ANALYST',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "allClients" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyWorkspace" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "label" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ownerMemberId" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceAccess" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "roleOverride" "AgencyRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyInvite" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "AgencyRole" NOT NULL DEFAULT 'ANALYST',
    "allClients" BOOLEAN NOT NULL DEFAULT false,
    "workspaceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyLinkRequest" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "LinkRequestStatus" NOT NULL DEFAULT 'PENDING',
    "tenantId" TEXT,
    "createdById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AgencyLinkRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportShare" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT,
    "rangeDays" INTEGER NOT NULL DEFAULT 30,
    "createdById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "CommerceProvider" NOT NULL,
    "storeDomain" TEXT NOT NULL,
    "externalStoreId" TEXT,
    "displayName" TEXT,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "capabilities" JSONB,
    "credentialsEnc" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokenExpiresAt" TIMESTAMP(3),
    "refreshExpiresAt" TIMESTAMP(3),
    "webhooksRegistered" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogProduct" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "handle" TEXT,
    "url" TEXT,
    "title" TEXT NOT NULL,
    "vendor" TEXT,
    "productType" TEXT,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "priceMin" DECIMAL(12,2),
    "priceMax" DECIMAL(12,2),
    "currency" TEXT,
    "availability" "Availability" NOT NULL DEFAULT 'UNKNOWN',
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "identifiers" JSONB,
    "facts" JSONB,
    "status" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "contentHash" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogSync" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "cursor" TEXT,
    "page" INTEGER NOT NULL DEFAULT 0,
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "upserted" INTEGER NOT NULL DEFAULT 0,
    "unchanged" INTEGER NOT NULL DEFAULT 0,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "triggeredBy" TEXT,
    "dedupeKey" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "leaseExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationWebhookDelivery" (
    "id" TEXT NOT NULL,
    "provider" "CommerceProvider" NOT NULL,
    "connectionId" TEXT,
    "externalId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "errorCode" TEXT,

    CONSTRAINT "IntegrationWebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicScan" (
    "id" TEXT NOT NULL,
    "kind" "AuditKind" NOT NULL,
    "urlHash" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "score" INTEGER,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgencyAccount_tenantId_key" ON "AgencyAccount"("tenantId");

-- CreateIndex
CREATE INDEX "AgencyMembership_userId_idx" ON "AgencyMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyMembership_agencyId_userId_key" ON "AgencyMembership"("agencyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyWorkspace_tenantId_key" ON "AgencyWorkspace"("tenantId");

-- CreateIndex
CREATE INDEX "AgencyWorkspace_agencyId_status_idx" ON "AgencyWorkspace"("agencyId", "status");

-- CreateIndex
CREATE INDEX "WorkspaceAccess_workspaceId_idx" ON "WorkspaceAccess"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceAccess_membershipId_workspaceId_key" ON "WorkspaceAccess"("membershipId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyInvite_tokenHash_key" ON "AgencyInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "AgencyInvite_agencyId_idx" ON "AgencyInvite"("agencyId");

-- CreateIndex
CREATE INDEX "AgencyInvite_email_idx" ON "AgencyInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyLinkRequest_tokenHash_key" ON "AgencyLinkRequest"("tokenHash");

-- CreateIndex
CREATE INDEX "AgencyLinkRequest_agencyId_status_idx" ON "AgencyLinkRequest"("agencyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReportShare_tokenHash_key" ON "ReportShare"("tokenHash");

-- CreateIndex
CREATE INDEX "ReportShare_tenantId_idx" ON "ReportShare"("tenantId");

-- CreateIndex
CREATE INDEX "StoreConnection_tenantId_idx" ON "StoreConnection"("tenantId");

-- CreateIndex
CREATE INDEX "StoreConnection_status_idx" ON "StoreConnection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StoreConnection_tenantId_provider_storeDomain_key" ON "StoreConnection"("tenantId", "provider", "storeDomain");

-- CreateIndex
CREATE INDEX "CatalogProduct_tenantId_deletedAt_idx" ON "CatalogProduct"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "CatalogProduct_tenantId_vendor_idx" ON "CatalogProduct"("tenantId", "vendor");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProduct_connectionId_externalId_key" ON "CatalogProduct"("connectionId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogSync_dedupeKey_key" ON "CatalogSync"("dedupeKey");

-- CreateIndex
CREATE INDEX "CatalogSync_connectionId_createdAt_idx" ON "CatalogSync"("connectionId", "createdAt");

-- CreateIndex
CREATE INDEX "CatalogSync_status_leaseExpiresAt_idx" ON "CatalogSync"("status", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "CatalogSync_tenantId_createdAt_idx" ON "CatalogSync"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrationWebhookDelivery_connectionId_receivedAt_idx" ON "IntegrationWebhookDelivery"("connectionId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationWebhookDelivery_provider_externalId_key" ON "IntegrationWebhookDelivery"("provider", "externalId");

-- CreateIndex
CREATE INDEX "PublicScan_expiresAt_idx" ON "PublicScan"("expiresAt");

-- CreateIndex
CREATE INDEX "PublicScan_urlHash_kind_createdAt_idx" ON "PublicScan"("urlHash", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "Tenant_kind_idx" ON "Tenant"("kind");

-- CreateIndex
CREATE INDEX "AuditLog_agencyId_createdAt_idx" ON "AuditLog"("agencyId", "createdAt");

-- AddForeignKey
ALTER TABLE "AgencyAccount" ADD CONSTRAINT "AgencyAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyMembership" ADD CONSTRAINT "AgencyMembership_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyMembership" ADD CONSTRAINT "AgencyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyWorkspace" ADD CONSTRAINT "AgencyWorkspace_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyWorkspace" ADD CONSTRAINT "AgencyWorkspace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyWorkspace" ADD CONSTRAINT "AgencyWorkspace_ownerMemberId_fkey" FOREIGN KEY ("ownerMemberId") REFERENCES "AgencyMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceAccess" ADD CONSTRAINT "WorkspaceAccess_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "AgencyMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceAccess" ADD CONSTRAINT "WorkspaceAccess_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "AgencyWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyInvite" ADD CONSTRAINT "AgencyInvite_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyLinkRequest" ADD CONSTRAINT "AgencyLinkRequest_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportShare" ADD CONSTRAINT "ReportShare_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreConnection" ADD CONSTRAINT "StoreConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "StoreConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogSync" ADD CONSTRAINT "CatalogSync_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "StoreConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationWebhookDelivery" ADD CONSTRAINT "IntegrationWebhookDelivery_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "StoreConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

