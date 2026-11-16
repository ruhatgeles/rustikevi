-- Şemayı 0001 sonrası eklenen değişikliklerle eşitler: atolye rolü, atölye kilidi,
-- otomatik giriş linkleri, ürün görselleri ve ürün kategorileri.
-- Idempotent yazıldı: db:push veya elle SQL ile bu değişiklikleri almış veritabanlarında da hata vermez.
ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'atolye';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auto_login_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"max_uses" integer DEFAULT 1000 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auto_login_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "is_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "is_ready_in_workshop" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "images" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
DO $$ BEGIN
	-- Production'da aynı FK farklı adla (auto_login_tokens_user_id_fkey) zaten var; ikinci kez ekleme
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conrelid = 'public.auto_login_tokens'::regclass AND contype = 'f'
	) THEN
		ALTER TABLE "auto_login_tokens" ADD CONSTRAINT "auto_login_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
-- Mevcut ürün kategorilerini yeni tabloya aktar
INSERT INTO "product_categories" ("name", "sort_order")
SELECT DISTINCT "category", 0 FROM "products"
WHERE "category" IS NOT NULL AND "category" <> ''
ON CONFLICT ("name") DO NOTHING;
