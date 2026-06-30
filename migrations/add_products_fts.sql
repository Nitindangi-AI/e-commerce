-- Full-Text Search: generated TSVECTOR column + GIN index on products
-- Run once against the InsForge Postgres database.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(brand, '') || ' ' ||
      coalesce(description, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_products_fts ON products USING GIN(search_vector);
