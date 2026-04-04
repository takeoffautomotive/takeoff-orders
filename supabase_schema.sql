-- Enable RLS
ALTER DATABASE postgres SET timezone TO 'America/Toronto';

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  amazon_order_id TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  destination_country TEXT NOT NULL DEFAULT 'US',
  asin TEXT NOT NULL,
  part_number TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  amazon_price DECIMAL(10,2) NOT NULL,
  referral_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  selected_vendor TEXT,
  selected_vendor_cost DECIMAL(10,2),
  profit DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order vendors table
CREATE TABLE IF NOT EXISTS order_vendors (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  product_cost DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  has_stock BOOLEAN NOT NULL DEFAULT true,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  ships_usa BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(order_id, vendor_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_amazon_order_id ON orders(amazon_order_id);
CREATE INDEX IF NOT EXISTS idx_order_vendors_order_id ON order_vendors(order_id);

-- Row Level Security (allow all for authenticated users)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can do everything on orders"
  ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on order_vendors"
  ON order_vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sample data for testing
INSERT INTO orders (amazon_order_id, customer_name, customer_address, destination_country, asin, part_number, product_name, quantity, amazon_price, referral_fee, status)
VALUES 
  ('AMZ-114-9283744', 'James Carter', '482 Elm St, Dallas, TX 75201', 'US', 'B00DC4FMSG', 'V10817263', 'Valvoline Full Synthetic Motor Oil 5W-30 5QT', 2, 89.99, 21.60, 'pending'),
  ('AMZ-114-8827651', 'Maria Lopez', '91 Oak Ave, Miami, FL 33101', 'US', 'B07B11ZPRY', 'V1070124', 'Valvoline High Mileage 10W-30 5QT', 1, 54.99, 6.60, 'pending'),
  ('AMZ-114-7761203', 'Derek Hughes', '220 Maple Rd, Chicago, IL 60601', 'US', 'B08KCF3NWQ', 'LUC10278', 'Lucas Oil Stabilizer 1 Gallon', 3, 34.50, 12.42, 'approved')
ON CONFLICT (amazon_order_id) DO NOTHING;

-- Get the order IDs for vendor inserts
DO $$
DECLARE
  o1 BIGINT;
  o2 BIGINT;
  o3 BIGINT;
BEGIN
  SELECT id INTO o1 FROM orders WHERE amazon_order_id = 'AMZ-114-9283744';
  SELECT id INTO o2 FROM orders WHERE amazon_order_id = 'AMZ-114-8827651';
  SELECT id INTO o3 FROM orders WHERE amazon_order_id = 'AMZ-114-7761203';

  INSERT INTO order_vendors (order_id, vendor_name, product_cost, shipping_cost, total_cost, has_stock, stock_qty, ships_usa)
  VALUES
    (o1, 'Keystone', 58.00, 12.50, 70.50, true, 40, true),
    (o1, 'Meyer',    52.00, 22.00, 74.00, true, 15, false),
    (o1, 'CLTW',    65.00, 25.00, 90.00, false, 0, true),
    (o2, 'Keystone', 32.00, 14.00, 46.00, false, 0, true),
    (o2, 'Meyer',    29.50, 11.50, 41.00, true, 88, false),
    (o2, 'CLTW',    30.00, 25.00, 55.00, true, 23, true),
    (o3, 'Keystone', 18.00, 8.50, 26.50, true, 200, true),
    (o3, 'Meyer',    21.00, 6.00, 27.00, true, 50, false),
    (o3, 'CLTW',    19.50, 25.00, 44.50, false, 0, true)
  ON CONFLICT (order_id, vendor_name) DO NOTHING;
END $$;
