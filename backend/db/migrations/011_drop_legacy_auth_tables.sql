-- ============================================
-- Migration 011: Drop Legacy Auth Tables
-- ============================================

DROP TABLE IF EXISTS otp_verifications CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS login_audit_log CASCADE;
