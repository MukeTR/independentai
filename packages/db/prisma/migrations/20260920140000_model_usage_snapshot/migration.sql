-- OpenRouter model kullanım sıralaması anlık görüntüleri (2026-09-20).
-- Yalnızca yeni tablo; mevcut tablolarda DROP/ALTER yok. Bu repoda migration'lar elle uygulanır.

CREATE TABLE "ModelUsageSnapshot" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "dataDate" TEXT NOT NULL,
    "totalTokens" TEXT NOT NULL,
    "models" JSONB NOT NULL,
    "authors" JSONB NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelUsageSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ModelUsageSnapshot_source_dataDate_key" ON "ModelUsageSnapshot"("source", "dataDate");
CREATE INDEX "ModelUsageSnapshot_source_fetchedAt_idx" ON "ModelUsageSnapshot"("source", "fetchedAt");
