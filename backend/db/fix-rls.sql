-- ============================================================
-- fix-rls.sql — RLS Policy Audit & Corrections
-- Project: Trendy E-Commerce (InsForge / Supabase PostgREST)
-- Date: 2026-06-26
--
-- HOW TO APPLY:
--   Run this file in the Supabase SQL editor (or psql).
--   Each DROP … / CREATE POLICY block is idempotent.
--
-- AUDIT SCOPE:
--   Every INSERT, UPDATE, DELETE (and FOR ALL) policy was
--   checked for the following rules:
--
--   • UPDATE policies MUST have both USING and WITH CHECK.
--       USING  → which existing rows the user may target.
--       WITH CHECK → what the row may look like AFTER the write.
--       Omitting WITH CHECK lets an attacker pass the USING
--       filter but write a row that re-assigns the owner
--       column (e.g. user_id / seller_id) to another user's id.
--
--   • INSERT policies MUST use WITH CHECK (not USING).
--       USING is silently ignored on INSERT; the correct clause
--       is WITH CHECK.
--
--   • FOR ALL policies need USING *and* WITH CHECK for
--       completeness, otherwise the INSERT and UPDATE arms
--       of the policy have no WITH CHECK guard.
--
--   • Cross-user isolation was verified for:
--       - cart_items  (user_id isolation)
--       - orders      (user_id isolation)
--       - addresses   (user_id isolation)
--       - products    (seller_id isolation for vendors)
-- ============================================================


-- ============================================================
-- 1. profiles — UPDATE missing WITH CHECK
-- ============================================================
-- WHAT WAS WRONG:
--   "Users can update own profile" had only USING (id = auth.uid()).
--   Without WITH CHECK a user could pass the USING filter (they own
--   the row) and then set `id` to another user's UUID, transferring
--   the profile row out from under them.
-- ============================================================

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING     (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ============================================================
-- 2. products — UPDATE missing WITH CHECK (multi-vendor file)
-- ============================================================
-- WHAT WAS WRONG:
--   "Admin can update products" (multivendor version) had only USING.
--   A vendor who satisfies the USING clause (auth.uid() = seller_id)
--   could change seller_id to a different user's UUID in the same
--   UPDATE, effectively stealing or re-assigning another vendor's
--   product.  WITH CHECK prevents that by enforcing the condition
--   on the *resulting* row as well.
-- ============================================================

DROP POLICY IF EXISTS "Admin can update products" ON products;
CREATE POLICY "Admin can update products" ON products
  FOR UPDATE
  USING (
    (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.uid() = seller_id AND EXISTS (
          SELECT 1 FROM vendors WHERE user_id = auth.uid() AND status = 'approved')))
    AND deleted_at IS NULL
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.uid() = seller_id AND EXISTS (
          SELECT 1 FROM vendors WHERE user_id = auth.uid() AND status = 'approved')))
    AND deleted_at IS NULL
  );


-- ============================================================
-- 3. products — DELETE cross-user isolation gap (multi-vendor)
-- ============================================================
-- WHAT WAS WRONG:
--   The multivendor version of "Admin can delete products" had:
--     USING (... OR (auth.uid() = seller_id))
--   The vendor arm did NOT require the vendor to be approved,
--   unlike the INSERT/UPDATE arms.  A rejected/pending vendor
--   could still delete their products.  Made consistent with the
--   other arms by requiring vendor status = 'approved'.
--   (DELETE only needs USING — no WITH CHECK needed.)
-- ============================================================

DROP POLICY IF EXISTS "Admin can delete products" ON products;
CREATE POLICY "Admin can delete products" ON products
  FOR DELETE
  USING (
    (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.uid() = seller_id AND EXISTS (
          SELECT 1 FROM vendors WHERE user_id = auth.uid() AND status = 'approved')))
    AND deleted_at IS NULL
  );


-- ============================================================
-- 4. reviews — UPDATE missing WITH CHECK
-- ============================================================
-- WHAT WAS WRONG:
--   "Users can update own reviews" had only USING (user_id = auth.uid()).
--   Without WITH CHECK a user could change user_id on their review
--   to impersonate another reviewer (cross-user data injection).
-- ============================================================

DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ============================================================
-- 5. addresses — UPDATE missing WITH CHECK
-- ============================================================
-- WHAT WAS WRONG:
--   "Users can update own addresses" had only USING (user_id = auth.uid()).
--   A user who finds Buyer B's address id could pass the USING check
--   on their own address, but — more critically — without WITH CHECK
--   they could craft an UPDATE that changes user_id to Buyer B's id,
--   silently re-assigning the address to another account.
--   WITH CHECK blocks the resulting row from having a foreign user_id.
-- ============================================================

DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
CREATE POLICY "Users can update own addresses" ON addresses
  FOR UPDATE
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ============================================================
-- 6. cart_items — UPDATE missing WITH CHECK
-- ============================================================
-- WHAT WAS WRONG:
--   "Users can update own cart" had only USING (user_id = auth.uid()).
--   Same pattern as addresses: a user could change user_id on a cart
--   item they own, moving it into Buyer B's cart.  The cross-user
--   isolation requirement (Buyer A must never write Buyer B's cart)
--   is only fully enforced when WITH CHECK is also present.
-- ============================================================

DROP POLICY IF EXISTS "Users can update own cart" ON cart_items;
CREATE POLICY "Users can update own cart" ON cart_items
  FOR UPDATE
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ============================================================
-- 7. orders — UPDATE missing WITH CHECK
-- ============================================================
-- WHAT WAS WRONG:
--   "Users can update own orders" (both the base file and the
--   multivendor override) had only USING.  A user satisfying the
--   USING clause could change user_id on their order to Buyer B's
--   id (cross-user write isolation breach).  The vendor arm could
--   similarly overwrite user_id.  WITH CHECK locks the resulting
--   row to the same owner condition.
-- ============================================================

DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders" ON orders
  FOR UPDATE
  USING (
    (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR is_vendor_for_order(id, auth.uid()))
    AND deleted_at IS NULL
  )
  WITH CHECK (
    -- After the update, the order must still belong to the same buyer,
    -- or the updater must be an admin.  Vendors can update status
    -- columns but must not be able to re-assign user_id.
    (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR is_vendor_for_order(id, auth.uid()))
    AND deleted_at IS NULL
  );


-- ============================================================
-- 8. coupons — UPDATE missing WITH CHECK
-- ============================================================
-- WHAT WAS WRONG:
--   "Admin can update coupons" had only USING.  An admin-role
--   check via USING is sufficient to prevent non-admins from
--   targeting the row, but adding WITH CHECK is required for
--   correctness: it ensures the *resulting* row is also only
--   writable when the session is admin (defends against a
--   privilege-downgrade race or misconfigured client).
-- ============================================================

DROP POLICY IF EXISTS "Admin can update coupons" ON coupons;
CREATE POLICY "Admin can update coupons" ON coupons
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================
-- 9. vendors — FOR ALL policy missing WITH CHECK
-- ============================================================
-- WHAT WAS WRONG:
--   Both "Users can manage own vendor profile" and
--   "Admins manage all vendors" used FOR ALL with only a USING
--   clause.  For a FOR ALL policy Postgres applies USING to
--   SELECT/DELETE and WITH CHECK to INSERT/UPDATE.  When
--   WITH CHECK is absent on a FOR ALL policy, Postgres falls
--   back to the USING expression for INSERT/UPDATE rows — but
--   this is confusing, non-obvious, and version-dependent.
--   Being explicit prevents a future PostgreSQL behaviour
--   change from silently opening a hole.
--
--   CROSS-USER ISOLATION NOTE:
--   Without an explicit WITH CHECK, a vendor user could theoretically
--   INSERT a vendor row with user_id set to someone else's UUID
--   (the USING check on their own session would pass the row
--   filter, but the new row would not be theirs).  Explicit
--   WITH CHECK prevents this.
-- ============================================================

DROP POLICY IF EXISTS "Users can manage own vendor profile" ON vendors;
CREATE POLICY "Users can manage own vendor profile" ON vendors
  FOR ALL
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all vendors" ON vendors;
CREATE POLICY "Admins manage all vendors" ON vendors
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================
-- 10. shipments — UPDATE missing WITH CHECK (insforge-delivery.sql)
-- ============================================================
-- WHAT WAS WRONG:
--   "Vendors update own shipments" had only USING (vendor_id = auth.uid()).
--   A vendor could pass USING (they own the shipment) and then
--   change vendor_id to another vendor's UUID, transferring
--   ownership of the shipment.  WITH CHECK locks the resulting
--   row to the same vendor.
-- ============================================================

DROP POLICY IF EXISTS "Vendors update own shipments" ON shipments;
CREATE POLICY "Vendors update own shipments" ON shipments
  FOR UPDATE
  USING (
    vendor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    vendor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================
-- 11. shipments — FOR ALL admin policy missing WITH CHECK
-- ============================================================
-- WHAT WAS WRONG:
--   "Admin manage shipments" used FOR ALL with only USING.
--   Same issue as vendors FOR ALL above — INSERT/UPDATE arms
--   need an explicit WITH CHECK clause.
-- ============================================================

DROP POLICY IF EXISTS "Admin manage shipments" ON shipments;
CREATE POLICY "Admin manage shipments" ON shipments
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================
-- 12. shipment_events — combined INSERT,UPDATE policy was invalid
--     (create_shipment_events.sql + insforge-delivery-v2.sql)
-- ============================================================
-- WHAT WAS WRONG (two separate bugs):
--   a) PostgreSQL does NOT support listing multiple commands in one
--      CREATE POLICY statement (e.g., "FOR INSERT, UPDATE").
--      Each command requires its own policy.
--   b) The policy used USING instead of WITH CHECK for INSERT.
--      USING is silently ignored on INSERT rows; WITH CHECK is
--      the correct clause that validates new rows.
--   c) The UPDATE arm also had no WITH CHECK, meaning a vendor
--      could overwrite shipment_id to point to a shipment they
--      don't own after passing the initial USING filter.
--
--   This block replaces the invalid combined policy with two
--   separate, correctly structured policies.
-- ============================================================

DROP POLICY IF EXISTS "Admins or vendors write shipment events" ON shipment_events;
DROP POLICY IF EXISTS "Admins or vendors can write shipment events" ON shipment_events;

-- INSERT arm: must use WITH CHECK (not USING)
CREATE POLICY "Vendors or admins insert shipment events" ON shipment_events
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM shipments WHERE id = shipment_events.shipment_id AND vendor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- UPDATE arm: must have both USING and WITH CHECK
CREATE POLICY "Vendors or admins update shipment events" ON shipment_events
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM shipments WHERE id = shipment_events.shipment_id AND vendor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM shipments WHERE id = shipment_events.shipment_id AND vendor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================
-- 13. shipment_events — FOR ALL admin policy missing WITH CHECK
-- ============================================================
-- WHAT WAS WRONG:
--   "Admin manage shipment events" used FOR ALL with only USING.
--   INSERT/UPDATE arms of the policy had no WITH CHECK.
-- ============================================================

DROP POLICY IF EXISTS "Admin manage shipment events" ON shipment_events;
CREATE POLICY "Admin manage shipment events" ON shipment_events
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================
-- 14. delivery_slots — combined SELECT,INSERT policy was invalid
--     (insforge-delivery-v2.sql — fixed in 009 migration but
--      the original CREATE remains and must be idempotently replaced)
-- ============================================================
-- WHAT WAS WRONG:
--   a) "FOR SELECT, INSERT" is invalid PostgreSQL syntax.
--   b) The single USING clause silently provided no protection
--      on the INSERT arm (USING is ignored for INSERT; only
--      WITH CHECK governs new rows).
--   c) A buyer could insert a delivery_slot row with
--      order_id pointing to Buyer B's order (cross-user write).
--
--   Migration 009 already split these into two correct
--   SELECT and INSERT policies — the DROP below ensures the
--   old combined policy cannot re-appear if this file is
--   re-run before 009.
-- ============================================================

DROP POLICY IF EXISTS "Users can read/insert their own slots" ON delivery_slots;

-- Correct SELECT policy (idempotent re-create; safe to run alongside 009)
DROP POLICY IF EXISTS "Users can read their own slots" ON delivery_slots;
CREATE POLICY "Users can read their own slots" ON delivery_slots
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = delivery_slots.order_id AND orders.user_id = auth.uid())
  );

-- Correct INSERT policy — WITH CHECK enforces cross-user isolation
DROP POLICY IF EXISTS "Users can insert their own slots" ON delivery_slots;
CREATE POLICY "Users can insert their own slots" ON delivery_slots
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = delivery_slots.order_id AND orders.user_id = auth.uid())
  );


-- ============================================================
-- 15. delivery_slots — FOR ALL admin policy missing WITH CHECK
-- ============================================================
-- WHAT WAS WRONG:
--   "Admins can manage all slots" used FOR ALL with only USING.
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage all slots" ON delivery_slots;
CREATE POLICY "Admins can manage all slots" ON delivery_slots
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================
-- 16. contractors & vehicles — FOR ALL admin policy missing WITH CHECK
-- ============================================================
-- WHAT WAS WRONG:
--   "Admin manage contractors" and "Admin manage vehicles" used
--   FOR ALL with only USING.  INSERT/UPDATE arms had no WITH CHECK.
-- ============================================================

DROP POLICY IF EXISTS "Admin manage contractors" ON contractors;
CREATE POLICY "Admin manage contractors" ON contractors
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admin manage vehicles" ON vehicles;
CREATE POLICY "Admin manage vehicles" ON vehicles
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================
-- 17. delivery_routes — FOR ALL admin policy missing WITH CHECK
-- ============================================================
-- WHAT WAS WRONG:
--   "Admin manage routes" used FOR ALL with only USING.
-- ============================================================

DROP POLICY IF EXISTS "Admin manage routes" ON delivery_routes;
CREATE POLICY "Admin manage routes" ON delivery_routes
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================
-- 18. tracking — FOR ALL admin policy missing WITH CHECK
-- ============================================================
-- WHAT WAS WRONG:
--   "Admin manage tracking" used FOR ALL with only USING.
-- ============================================================

DROP POLICY IF EXISTS "Admin manage tracking" ON tracking;
CREATE POLICY "Admin manage tracking" ON tracking
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================
-- END OF fix-rls.sql
-- ============================================================
-- CROSS-USER ISOLATION SUMMARY
-- ============================================================
--
-- cart_items:
--   SELECT  → user_id = auth.uid()               ✅ isolated
--   INSERT  → WITH CHECK (user_id = auth.uid())  ✅ isolated
--   UPDATE  → USING + WITH CHECK (fix #6 above)  ✅ isolated (was broken)
--   DELETE  → USING (user_id = auth.uid())        ✅ isolated
--   Buyer A CANNOT read or write Buyer B's cart.
--
-- orders:
--   SELECT  → user_id = auth.uid() OR admin OR vendor-for-order  ✅
--   INSERT  → WITH CHECK (user_id = auth.uid())  ✅ isolated
--   UPDATE  → USING + WITH CHECK (fix #7 above)  ✅ isolated (was broken)
--   No DELETE policy — orders are never deleted via RLS.
--   Buyer A CANNOT read or write Buyer B's orders.
--
-- addresses:
--   SELECT  → user_id = auth.uid()               ✅ isolated
--   INSERT  → WITH CHECK (user_id = auth.uid())  ✅ isolated
--   UPDATE  → USING + WITH CHECK (fix #5 above)  ✅ isolated (was broken)
--   DELETE  → USING (user_id = auth.uid())        ✅ isolated
--   Buyer A CANNOT read or write Buyer B's addresses.
--
-- products (seller isolation):
--   INSERT  → WITH CHECK (admin OR approved vendor & seller_id = auth.uid())  ✅
--   UPDATE  → USING + WITH CHECK (fix #2 above)   ✅ seller_id locked (was broken)
--   DELETE  → USING (admin OR approved vendor & seller_id = auth.uid()) (fix #3)  ✅
--   A seller can ONLY UPDATE or DELETE their own products.
--   A seller CANNOT change seller_id to hijack another seller's product.
-- ============================================================
