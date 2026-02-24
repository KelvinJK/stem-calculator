-- Seed: default admin user + sample material library
-- Password for admin@stem.co is: Admin1234!
-- (bcrypt hash generated separately — update before production)

-- Default admin (password: Admin1234!)
INSERT INTO users (name, email, password_hash, role) VALUES
  ('System Admin', 'admin@stem.co',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Sample materials library
INSERT INTO materials (name, unit_type, pack_size, pack_price, category) VALUES
  ('Plastic Cups',           'pcs',  50,   5000,  'Consumables'),
  ('Latex Gloves (box)',     'pcs',  100,  15000, 'Safety'),
  ('Baking Soda',            'g',    500,  3000,  'Chemicals'),
  ('White Vinegar (1L)',     'ml',   1000, 4500,  'Chemicals'),
  ('Food Colouring',         'ml',   50,   2500,  'Consumables'),
  ('Hydrogen Peroxide 3%',   'ml',   500,  6000,  'Chemicals'),
  ('Dish Soap',              'ml',   500,  4000,  'Consumables'),
  ('Yeast (dry)',            'g',    100,  2000,  'Chemicals'),
  ('PVA Glue (500ml)',       'ml',   500,  8000,  'Consumables'),
  ('Borax Powder',           'g',    250,  5000,  'Chemicals'),
  ('Baking Powder',          'g',    100,  1500,  'Consumables'),
  ('Balloons (pack)',        'pcs',  50,   4000,  'Consumables'),
  ('Straw (pack)',           'pcs',  100,  2000,  'Consumables'),
  ('A4 Paper (ream)',        'pcs',  500,  7000,  'Stationery'),
  ('Tape (roll)',            'm',    50,   1500,  'Stationery'),
  ('Marker Pens (set)',      'pcs',  12,   5000,  'Stationery'),
  ('Scissors',               'pcs',  1,    3000,  'Equipment'),
  ('Measuring Cups',         'pcs',  1,    2000,  'Equipment'),
  ('Funnel',                 'pcs',  1,    1500,  'Equipment'),
  ('Facilitator (per hour)', 'hrs',  1,    25000, 'Labour')
ON CONFLICT DO NOTHING;
