-- Sipariş numarası için atomik sayaç. MAX()+1 eşzamanlı isteklerde aynı numarayı
-- üretip unique hatasına (500) yol açıyordu.
CREATE SEQUENCE IF NOT EXISTS "order_number_seq" START WITH 1;--> statement-breakpoint
SELECT setval(
  'order_number_seq',
  COALESCE((SELECT MAX(CAST(SUBSTRING("order_number" FROM 5) AS INTEGER)) FROM "orders" WHERE "order_number" ~ '^RVE-[0-9]+$'), 0) + 1,
  false
);
