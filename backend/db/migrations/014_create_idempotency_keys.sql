CREATE TABLE IF NOT EXISTS idempotency_keys (
  key UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
