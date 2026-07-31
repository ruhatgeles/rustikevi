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

-- 3. Mevcut atelier durumundaki kalemlerin is_locked değerini false yap (zaten default bu)
UPDATE order_items SET is_locked = false WHERE item_status = 'atelier' AND is_locked IS NULL;

-- Migration tamamlandı
SELECT 'Atölye modülü migration tamamlandı' AS status;
