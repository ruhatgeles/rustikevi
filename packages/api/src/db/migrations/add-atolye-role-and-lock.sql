-- Atölye modülü için veritabanı değişiklikleri
-- Bu dosyayı PostgreSQL veritabanında çalıştırın

-- 1. user_role enum'una 'atolye' değerini ekle
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'atolye';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. order_items tablosuna is_locked sütunu ekle
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

-- 3. order_items tablosuna is_ready_in_workshop sütunu ekle
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_ready_in_workshop BOOLEAN NOT NULL DEFAULT false;

-- Migration tamamlandı
SELECT 'Atölye modülü migration tamamlandı' AS status;
