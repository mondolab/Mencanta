-- ============================================================
-- M' encanta — Migración 0003: comprobantes de venta
-- Agrega CUIT del cliente a las ventas y configuración del
-- comprobante (CUIT del local + pie de comprobante).
-- ============================================================

ALTER TABLE sales ADD COLUMN customer_cuit TEXT NOT NULL DEFAULT '';

INSERT INTO settings (key, value) VALUES
  ('invoice', '{"tax_id":"","footer":"Gracias por tu compra."}')
  ON CONFLICT(key) DO NOTHING;