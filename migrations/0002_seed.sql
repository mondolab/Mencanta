-- ============================================================
-- M' encanta — Migración 0002: datos de ejemplo (seed)
-- Productos ficticios con imágenes placeholder (picsum.photos).
-- No contiene datos reales de clientes.
-- ============================================================

-- ------------------------------------------------------------
-- Configuración inicial del negocio
-- ------------------------------------------------------------
INSERT INTO settings (key, value) VALUES
  ('business', '{"name":"M\u0027 encanta blanquería y accesorios","tagline":"Detalles que transforman tu hogar.","description":"Blanquería para el hogar y accesorios de acero quirúrgico en Paraná, Entre Ríos. Showroom y envíos a domicilio."}'),
  ('whatsapp', '{"number":"5493434056155","display":"+54 9 3434 05-6155"}'),
  ('contact', '{"email":"hola@mencanta.com.ar","instagram":"https://www.instagram.com/me_encanta01/","map_url":"https://maps.google.com/?q=Paran%C3%A1,+Entre+R%C3%ADos"}'),
  ('address', '{"street":"","city":"Paraná, Entre Ríos","notes":"Showroom físico en Paraná — consultá por WhatsApp la dirección exacta y horarios."}'),
  ('shipping', '{"zones":"Paraná y alrededores","cost_cents":0,"min_order_free_cents":0,"cost_note":"Consultá el costo según tu zona.","delivery_time":"1 a 3 días hábiles","pickup":true}'),
  ('schedule', '{"title":"Horarios de atención","lines":["Lunes a Viernes: 9 a 13 y 16 a 20 hs","Sábados: 9 a 13 hs"]}'),
  ('texts', '{"hero_title":"M\u0027 encanta","hero_subtitle":"Detalles que transforman tu hogar.","hero_text":"Blanquería para el hogar y accesorios de acero quirúrgico.","banner_title":"Envíos a domicilio","banner_text":"Llevamos tus elegidos hasta tu casa en Paraná y alrededores."}'),
  ('hero_image', '{"url":"https://picsum.photos/seed/mencanta-hero/1400/1000"}'),
  ('rules', '{"allow_negative_stock":false}');

-- ------------------------------------------------------------
-- Categorías
-- ------------------------------------------------------------
INSERT INTO categories (name, slug, type, description, image_url, sort_order) VALUES
  ('Sábanas',         'sabanas',         'blanqueria', 'Juegos de sábanas de algodón y premium.', 'https://picsum.photos/seed/mencanta-cat-sabanas/800/800', 1),
  ('Acolchados',      'acolchados',      'blanqueria', 'Acolchados y tapetes para todas las camas.', 'https://picsum.photos/seed/mencanta-cat-acolchados/800/800', 2),
  ('Frazadas',        'frazadas',        'blanqueria', 'Frazadas y mantas cálidas.', 'https://picsum.photos/seed/mencanta-cat-frazadas/800/800', 3),
  ('Toallas',         'toallas',         'blanqueria', 'Toallas de baño de calidad hotelera.', 'https://picsum.photos/seed/mencanta-cat-toallas/800/800', 4),
  ('Toallones',       'toallones',       'blanqueria', 'Toallones rústicos e hipoalergénicos.', 'https://picsum.photos/seed/mencanta-cat-toallones/800/800', 5),
  ('Almohadas',       'almohadas',       'blanqueria', 'Almohadas nórdicas y de descanso.', 'https://picsum.photos/seed/mencanta-cat-almohadas/800/800', 6),
  ('Fundas',          'fundas',          'blanqueria', 'Fundas y protectores.', 'https://picsum.photos/seed/mencanta-cat-fundas/800/800', 7),
  ('Cortinas',        'cortinas',        'blanqueria', 'Cortinas de lino y blackout.', 'https://picsum.photos/seed/mencanta-cat-cortinas/800/800', 8),
  ('Manteles',        'manteles',        'blanqueria', 'Manteles y caminos de mesa.', 'https://picsum.photos/seed/mencanta-cat-manteles/800/800', 9),
  ('Otros',           'otros-blanqueria','blanqueria', 'Accesorios para el hogar.', 'https://picsum.photos/seed/mencanta-cat-otros/800/800', 10),
  ('Aros',            'aros',            'acero',      'Aros de acero quirúrgico hipoalergénicos.', 'https://picsum.photos/seed/mencanta-cat-aros/800/800', 11),
  ('Cadenas',         'cadenas',         'acero',      'Cadenas de acero quirúrgico.', 'https://picsum.photos/seed/mencanta-cat-cadenas/800/800', 12),
  ('Pulseras',        'pulseras',        'acero',      'Pulseras de acero quirúrgico.', 'https://picsum.photos/seed/mencanta-cat-pulseras/800/800', 13),
  ('Anillos',         'anillos',         'acero',      'Anillos de acero quirúrgico 316L.', 'https://picsum.photos/seed/mencanta-cat-anillos/800/800', 14),
  ('Accesorios',      'accesorios',      'acero',      'Dijes, piercings y más.', 'https://picsum.photos/seed/mencanta-cat-accesorios/800/800', 15),
  ('Otros',           'otros-acero',     'acero',      'Otros accesorios de acero.', 'https://picsum.photos/seed/mencanta-cat-otros-acero/800/800', 16);

-- ------------------------------------------------------------
-- Productos (blanquería)
-- ------------------------------------------------------------
INSERT INTO products (name, slug, description, category_id, price_cents, compare_price_cents, cost_cents, stock, min_stock, featured, active, has_variants) VALUES
  ('Acolchado Queen Premium',  'acolchado-queen-premium',  'Acolchado relleno de guata siliconada con tela acolchada súper suave. Ideal para darle un acabado prolijo y elegante a tu cama. Disponible en varios tamaños y colores.', 2, 18500000, 24000000, 9800000, 0, 3, 1, 1, 1),
  ('Juego de Sábanas Queen',   'juego-de-sabanas-queen',  'Juego de sábanas de algodón peinado con trama afelpada. Incluye sábana de abajo, sábana de arriba y dos fundas. Suavidad y durabilidad.', 1, 9500000, 12000000, 5200000, 20, 4, 1, 1, 0),
  ('Frazada Plush King',       'frazada-plush-king',      'Frazada tipo minky extra suave y calentita. Perfec para las noches frías. Medida King.', 3, 12000000, NULL, 6800000, 8, 2, 1, 1, 0),
  ('Toallón Rústico',          'toallon-rustico',         'Toallón de algodón rústico de 80x160 cm, liviano y de secado rápido. Ideal para playa y pileta.', 5, 3800000, NULL, 1900000, 25, 5, 0, 1, 0),
  ('Juego de Toallas Premium', 'juego-de-toallas-premium','Juego de toallas de baño toalla de 50x80, toallón de 70x140 y toalla de mano. Algodón peinado de alta absorción.', 4, 4500000, 5800000, 2500000, 30, 6, 1, 1, 0),
  ('Almohada Nórdica 50x70',   'almohada-nordica-50x70',  'Almohada nórdica con relleno de fibra siliconada ultra suave. Funda de algodón. 50x70 cm.', 6, 2800000, NULL, 1400000, 40, 8, 0, 1, 0),
  ('Funda de Almohada Soft',   'funda-de-almohada-soft',  'Funda de almohada de algodón con terminación francesa. 50x70 cm. Colores suaves.', 7, 2200000, NULL, 1100000, 35, 5, 0, 1, 0),
  ('Cortina Lino Natural',     'cortina-lino-natural',    'Par de cortinas de lino natural con ojalillo, 2x2,20 m. Aportan luz y elegancia al ambiente.', 8, 17800000, 21000000, 9800000, 5, 2, 0, 1, 0),
  ('Mantel Bordado 8 pax',     'mantel-bordado-8-pax',    'Mantel de algodón bordado para 8 personas (2,40 x 1,50 m). Apto lavarropas.', 9, 8900000, NULL, 4700000, 10, 2, 0, 1, 0),
  ('Individual Jute',          'individual-jute',         'Individual de yute texturizado de 33x45 cm. Aporta un toque natural a la mesa.', 10, 1900000, NULL, 900000, 50, 10, 0, 1, 0);

-- ------------------------------------------------------------
-- Productos (acero quirúrgico)
-- ------------------------------------------------------------
INSERT INTO products (name, slug, description, category_id, price_cents, compare_price_cents, cost_cents, stock, min_stock, featured, active, has_variants) VALUES
  ('Aros de Acero Quirúrgico', 'aros-de-acero-quirurgico', 'Par de aros de acero quirúrgico 316L hipoalergénicos. Resistente al agua y al paso del tiempo. Diámetro 12 mm.', 11, 450000, 600000, 180000, 60, 10, 1, 1, 0),
  ('Cadena Cubana 20 cm',      'cadena-cubana-20-cm',      'Cadena cubana de acero quirúrgico de 20 cm. Apta para uso diario, no se oxida ni destiñe.', 12, 780000, NULL, 320000, 40, 8, 0, 1, 0),
  ('Pulsera Tennis',           'pulsera-tennis',           'Pulsera tennis de acero quirúrgico con terminación espejada. 18 cm.', 13, 980000, NULL, 410000, 25, 5, 1, 1, 0),
  ('Anillo Boda 316L',         'anillo-boda-316l',         'Anillo de acero quirúrgico 316L de banda lisa. Talles 15 a 21. Hipolargénico e indeformable.', 14, 1150000, NULL, 520000, 15, 4, 0, 1, 0);

-- ------------------------------------------------------------
-- Imágenes placeholder
-- ------------------------------------------------------------
INSERT INTO product_images (product_id, image_url, alt, sort_order) VALUES
  (1, 'https://picsum.photos/seed/mencanta-acolchado/900/1000', 'Acolchado Queen Premium', 0),
  (2, 'https://picsum.photos/seed/mencanta-sabanas/900/1000',   'Juego de Sábanas Queen', 0),
  (3, 'https://picsum.photos/seed/mencanta-frazada/900/1000',   'Frazada Plush King', 0),
  (4, 'https://picsum.photos/seed/mencanta-toallon/900/1000',   'Toallón Rústico', 0),
  (5, 'https://picsum.photos/seed/mencanta-toallas/900/1000',   'Juego de Toallas Premium', 0),
  (6, 'https://picsum.photos/seed/mencanta-almohada/900/1000',  'Almohada Nórdica 50x70', 0),
  (7, 'https://picsum.photos/seed/mencanta-funda/900/1000',     'Funda de Almohada Soft', 0),
  (8, 'https://picsum.photos/seed/mencanta-cortina/900/1000',   'Cortina Lino Natural', 0),
  (9, 'https://picsum.photos/seed/mencanta-mantel/900/1000',    'Mantel Bordado 8 pax', 0),
  (10, 'https://picsum.photos/seed/mencanta-individual/900/1000','Individual Jute', 0),
  (11, 'https://picsum.photos/seed/mencanta-aros/900/1000',     'Aros de Acero Quirúrgico', 0),
  (12, 'https://picsum.photos/seed/mencanta-cadena/900/1000',   'Cadena Cubana 20 cm', 0),
  (13, 'https://picsum.photos/seed/mencanta-pulsera/900/1000',  'Pulsera Tennis', 0),
  (14, 'https://picsum.photos/seed/mencanta-anillo/900/1000',   'Anillo Boda 316L', 0);

-- ------------------------------------------------------------
-- Variantes del Acolchado Queen (tamaño × color)
-- Cada combinación tiene su propio stock.
-- ------------------------------------------------------------
INSERT INTO product_variants (product_id, name, size, color, stock, active) VALUES
  (1, '2 plazas / Blanco',  '2 plazas', 'Blanco',  4, 1),
  (1, '2 plazas / Gris',    '2 plazas', 'Gris',    3, 1),
  (1, '2 plazas / Beige',   '2 plazas', 'Beige',   5, 1),
  (1, '2 plazas / Rosa',    '2 plazas', 'Rosa',    2, 1),
  (1, '2 plazas / Celeste', '2 plazas', 'Celeste', 2, 1),
  (1, 'Queen / Blanco',     'Queen',    'Blanco',  5, 1),
  (1, 'Queen / Gris',       'Queen',    'Gris',    4, 1),
  (1, 'Queen / Beige',      'Queen',    'Beige',   6, 1),
  (1, 'Queen / Rosa',       'Queen',    'Rosa',    3, 1),
  (1, 'Queen / Celeste',    'Queen',    'Celeste', 3, 1),
  (1, 'King / Blanco',      'King',     'Blanco',  3, 1),
  (1, 'King / Gris',        'King',     'Gris',    3, 1),
  (1, 'King / Beige',       'King',     'Beige',   4, 1),
  (1, 'King / Rosa',        'King',     'Rosa',    2, 1),
  (1, 'King / Celeste',     'King',     'Celeste', 2, 1);

-- Stock agregado del producto con variantes = suma de variantes
UPDATE products SET stock = (SELECT SUM(stock) FROM product_variants WHERE product_id = 1) WHERE id = 1;
UPDATE products SET updated_at = datetime('now');