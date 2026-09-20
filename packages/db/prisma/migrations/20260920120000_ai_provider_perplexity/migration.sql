-- Dördüncü AI sağlayıcı: Perplexity (sonar ailesi).
-- Not: Bu repoda migration'lar ELLE uygulanır; ADD VALUE IF NOT EXISTS sayesinde tekrar çalıştırmak güvenlidir.
ALTER TYPE "AiProvider" ADD VALUE IF NOT EXISTS 'PERPLEXITY';
