-- ============================================================
-- OPA — Migración inicial: esquema de la base de datos D1
-- Convenciones:
--   * Montos en enteros (centavos)  -> *_cents
--   * Fechas en UTC como texto ISO   (datetime('now'))
--   * Moneda: Peso argentino (ARS)
-- ============================================================

-- ------------------------------------------------------------
-- Usuarios administradores
-- ------------------------------------------------------------
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL DEFAULT 'Administrador',
  password_hash TEXT NOT NULL,               -- pbkdf2:iteraciones:salt_hex:hash_hex
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- Sesiones (cookie HttpOnly)
-- ------------------------------------------------------------
CREATE TABLE sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,           -- sha256 del token aleatorio
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);

-- ------------------------------------------------------------
-- Configuración del negocio (pares clave/valor, valor JSON)
-- ------------------------------------------------------------
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- ------------------------------------------------------------
-- Categorías
-- ------------------------------------------------------------
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL DEFAULT 'blanqueria', -- blanqueria | acero | otros
  description TEXT NOT NULL DEFAULT '',
  image_key   TEXT,
  image_url   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_active ON categories(active);

-- ------------------------------------------------------------
-- Productos
-- ------------------------------------------------------------
CREATE TABLE products (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  name               TEXT NOT NULL,
  slug               TEXT NOT NULL UNIQUE,
  description        TEXT NOT NULL DEFAULT '',
  category_id        INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  price_cents        INTEGER NOT NULL DEFAULT 0,
  compare_price_cents INTEGER,               -- precio "antes" (ofertas)
  cost_cents         INTEGER NOT NULL DEFAULT 0,
  stock              INTEGER NOT NULL DEFAULT 0,  -- agregado total (incluye variantes)
  min_stock          INTEGER NOT NULL DEFAULT 0,
  featured           INTEGER NOT NULL DEFAULT 0,
  active             INTEGER NOT NULL DEFAULT 1,
  has_variants       INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_featured ON products(featured);

-- ------------------------------------------------------------
-- Imágenes de productos (R2 o URL externa)
-- ------------------------------------------------------------
CREATE TABLE product_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_key  TEXT,
  image_url  TEXT,
  alt        TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ------------------------------------------------------------
-- Variantes (tamaño / color / combinación)
-- ------------------------------------------------------------
CREATE TABLE product_variants (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id          INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,          -- ej: "Queen / Blanco"
  size                TEXT NOT NULL DEFAULT '',
  color               TEXT NOT NULL DEFAULT '',
  price_cents         INTEGER,
  compare_price_cents INTEGER,
  cost_cents          INTEGER,
  stock               INTEGER NOT NULL DEFAULT 0,
  active              INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);

-- ------------------------------------------------------------
-- Clientes
-- ------------------------------------------------------------
CREATE TABLE customers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  address    TEXT NOT NULL DEFAULT '',
  city       TEXT NOT NULL DEFAULT '',
  notes      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_customers_name ON customers(name);

-- ------------------------------------------------------------
-- Movimientos de stock (auditoría)
-- ------------------------------------------------------------
CREATE TABLE stock_movements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,                -- entrada | venta | ajuste | perdida | devolucion
  quantity   INTEGER NOT NULL,             -- con signo (+/-)
  stock_after INTEGER NOT NULL,
  reference  TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at);

-- ------------------------------------------------------------
-- Cajas
-- ------------------------------------------------------------
CREATE TABLE cash_registers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  date           TEXT NOT NULL,            -- DD-MM-YYYY (local)
  opened_at      TEXT NOT NULL,
  closed_at      TEXT,
  opening_cents  INTEGER NOT NULL DEFAULT 0,
  expected_cents INTEGER NOT NULL DEFAULT 0,
  counted_cents  INTEGER,
  difference_cents INTEGER,
  status         TEXT NOT NULL DEFAULT 'abierta', -- abierta | cerrada
  observations   TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_cash_registers_date ON cash_registers(date);
CREATE INDEX idx_cash_registers_status ON cash_registers(status);

-- ------------------------------------------------------------
-- Movimientos de caja
-- ------------------------------------------------------------
CREATE TABLE cash_movements (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  cash_register_id  INTEGER NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,   -- venta_efectivo | ingreso | gasto | retiro | ajuste
  description       TEXT NOT NULL DEFAULT '',
  amount_cents      INTEGER NOT NULL DEFAULT 0,
  direction         TEXT NOT NULL DEFAULT 'in',  -- in | out  (impacto en efectivo físico)
  payment_method    TEXT NOT NULL DEFAULT 'efectivo',
  reference         TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_cash_movements_register ON cash_movements(cash_register_id);
CREATE INDEX idx_cash_movements_created ON cash_movements(created_at);

-- ------------------------------------------------------------
-- Gastos
-- ------------------------------------------------------------
CREATE TABLE expenses (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  concept          TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  amount_cents     INTEGER NOT NULL DEFAULT 0,
  payment_method   TEXT NOT NULL DEFAULT 'efectivo',
  category         TEXT NOT NULL DEFAULT 'otros',
  notes            TEXT NOT NULL DEFAULT '',
  date             TEXT NOT NULL DEFAULT (datetime('now')),
  cash_movement_id INTEGER REFERENCES cash_movements(id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- ------------------------------------------------------------
-- Ventas
-- ------------------------------------------------------------
CREATE TABLE sales (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  number           TEXT NOT NULL UNIQUE,   -- V-YYYYMMDD-####
  subtotal_cents   INTEGER NOT NULL DEFAULT 0,
  discount_cents   INTEGER NOT NULL DEFAULT 0,
  total_cents      INTEGER NOT NULL DEFAULT 0,
  payment_method   TEXT NOT NULL DEFAULT 'efectivo',
  cash_register_id INTEGER REFERENCES cash_registers(id) ON DELETE SET NULL,
  customer_name    TEXT NOT NULL DEFAULT '',
  customer_id      INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  order_id         INTEGER,                -- referencia al pedido (sin FK: ciclo con orders)
  source           TEXT NOT NULL DEFAULT 'showroom', -- showroom | pedido
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sales_created ON sales(created_at);
CREATE INDEX idx_sales_register ON sales(cash_register_id);
CREATE INDEX idx_sales_payment ON sales(payment_method);

-- ------------------------------------------------------------
-- Detalle de ventas
-- ------------------------------------------------------------
CREATE TABLE sale_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id          INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id       INTEGER REFERENCES products(id) ON DELETE SET NULL,
  variant_id       INTEGER,
  product_name     TEXT NOT NULL,
  variant_name     TEXT NOT NULL DEFAULT '',
  quantity         INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  unit_cost_cents  INTEGER NOT NULL DEFAULT 0,
  subtotal_cents   INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);

-- ------------------------------------------------------------
-- Pedidos online
-- ------------------------------------------------------------
CREATE TABLE orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  number          TEXT NOT NULL UNIQUE,   -- P-YYYYMMDD-####
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL DEFAULT '',
  delivery_type   TEXT NOT NULL DEFAULT 'envio', -- envio | retiro
  subtotal_cents  INTEGER NOT NULL DEFAULT 0,
  shipping_cents  INTEGER NOT NULL DEFAULT 0,
  total_cents     INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | confirmado | preparando | listo | entregado | cancelado
  observations    TEXT NOT NULL DEFAULT '',
  sale_id         INTEGER REFERENCES sales(id) ON DELETE SET NULL,
  source          TEXT NOT NULL DEFAULT 'web',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);

-- ------------------------------------------------------------
-- Detalle de pedidos
-- ------------------------------------------------------------
CREATE TABLE order_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       INTEGER REFERENCES products(id) ON DELETE SET NULL,
  variant_id       INTEGER,
  product_name     TEXT NOT NULL,
  variant_name     TEXT NOT NULL DEFAULT '',
  quantity         INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  subtotal_cents   INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ------------------------------------------------------------
-- Reportes de productos más vendidos se obtienen por consulta
-- sobre sale_items (sin tabla extra).
-- ------------------------------------------------------------