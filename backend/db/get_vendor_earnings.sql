CREATE OR REPLACE FUNCTION get_vendor_earnings(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_gross INT;
  v_comm NUMERIC;
  v_net NUMERIC;
  v_comm_rate NUMERIC;
BEGIN
  -- Get vendor's commission rate
  SELECT commission_rate INTO v_comm_rate FROM vendors WHERE user_id = p_user_id;
  IF v_comm_rate IS NULL THEN
    v_comm_rate := 10.00;
  END IF;

  -- Calculate gross revenue from Delivered orders containing vendor's products
  SELECT COALESCE(SUM(oi.price * oi.quantity), 0) INTO v_gross
  FROM order_items oi
  JOIN products p ON oi.product_id = p.id
  JOIN orders o ON oi.order_id = o.id
  WHERE p.seller_id = p_user_id AND o.order_status = 'Delivered';

  v_comm := ROUND((v_gross * v_comm_rate) / 100.00, 2);
  v_net := v_gross - v_comm;

  RETURN json_build_object(
    'grossRevenue', v_gross,
    'commission', v_comm,
    'netRevenue', v_net
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
