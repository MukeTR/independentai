-- OpenRouter anlık görüntüsüne detay alanları (2026-09-20).
-- Yalnızca EKLEME: iki NULL kabul eden sütun. Mevcut satır olduğu gibi kalır ve
-- okuyan taraf NULL'ı "veri yok" (windowDays için varsayılan 7) olarak yorumlar.
-- Bu repoda migration'lar elle uygulanır; bu yüzden ifadeler tekrar çalıştırılabilir yazıldı.

ALTER TABLE "ModelUsageSnapshot" ADD COLUMN IF NOT EXISTS "apps" JSONB;
ALTER TABLE "ModelUsageSnapshot" ADD COLUMN IF NOT EXISTS "windowDays" INTEGER;
