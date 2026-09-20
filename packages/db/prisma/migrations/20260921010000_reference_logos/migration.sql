-- Referans logoları (2026-09-21): landing şeridi için tek yeni tablo. Yalnızca ekleme;
-- mevcut tablolara DROP/ALTER yoktur. Bu repoda migration'lar elle uygulanır.

-- CreateTable
CREATE TABLE "ReferenceLogo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "siteUrl" TEXT,
    "sector" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceLogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferenceLogo_published_order_idx" ON "ReferenceLogo"("published", "order");
