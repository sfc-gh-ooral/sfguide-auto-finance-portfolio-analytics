-- ============================================================================
-- Auto Finance Portfolio Analytics: cleanup
-- Drops everything sql/setup.sql created. Run top to bottom.
-- ============================================================================
USE ROLE SYSADMIN;
-- The database holds the tables, views, functions, semantic view, and Cortex Agent.
DROP AGENT IF EXISTS AUTO_FINANCE_EXAMPLE.LENDING.AUTO_FINANCE_AGENT;
DROP DATABASE IF EXISTS AUTO_FINANCE_EXAMPLE;
DROP WAREHOUSE IF EXISTS AUTO_FINANCE_WH;

USE ROLE ACCOUNTADMIN;
DROP ROLE IF EXISTS AUTO_FINANCE_DEMO_ROLE;
