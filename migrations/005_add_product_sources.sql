-- Migration: Add product_sources table for product discovery system
-- This table stores individual sources found for each discovered product

CREATE TABLE IF NOT EXISTS product_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Source name (e.g., "Amazon", "eBay")
  url TEXT NOT NULL, -- Direct URL to the product on this source
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  availability TEXT NOT NULL DEFAULT 'unknown', -- in-stock, out-of-stock, limited, unknown
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}', -- Additional data like shipping, rating, review count
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_sources_product_id ON product_sources(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sources_price ON product_sources(price);
CREATE INDEX IF NOT EXISTS idx_product_sources_availability ON product_sources(availability);
CREATE INDEX IF NOT EXISTS idx_product_sources_last_checked ON product_sources(last_checked);

-- Add RLS policies
ALTER TABLE product_sources ENABLE ROW LEVEL SECURITY;

-- Users can only see sources for their own products
CREATE POLICY "Users can view their own product sources" ON product_sources
  FOR SELECT USING (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

-- Users can insert sources for their own products
CREATE POLICY "Users can insert sources for their own products" ON product_sources
  FOR INSERT WITH CHECK (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

-- Users can update sources for their own products
CREATE POLICY "Users can update their own product sources" ON product_sources
  FOR UPDATE USING (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

-- Users can delete sources for their own products
CREATE POLICY "Users can delete their own product sources" ON product_sources
  FOR DELETE USING (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_product_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_sources_updated_at
  BEFORE UPDATE ON product_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_product_sources_updated_at();

-- Update sources table to include outdoor gear category
INSERT INTO sources (name, base_url, category, selector_config, is_active, created_at, updated_at)
VALUES 
  ('REI', 'https://www.rei.com', 'outdoor-gear', '{"price": ".price", "availability": ".availability"}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Patagonia', 'https://www.patagonia.com', 'outdoor-gear', '{"price": ".price", "availability": ".stock-status"}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Backcountry', 'https://www.backcountry.com', 'outdoor-gear', '{"price": ".price", "availability": ".availability"}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Moosejaw', 'https://www.moosejaw.com', 'outdoor-gear', '{"price": ".price", "availability": ".availability"}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Outdoor Gear Lab', 'https://www.outdoorgearlab.com', 'outdoor-gear', '{"price": ".price", "availability": ".stock"}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name, base_url) DO NOTHING;