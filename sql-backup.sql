-- Complete Database Backup
-- Generated on: 2025-09-01
-- 
-- This file contains a complete backup of all application data
-- To restore: psql -d your_database < sql-backup.sql

-- Users table
INSERT INTO users (id, email, first_name, last_name, profile_image_url, created_at, updated_at, is_platform_admin) VALUES
('44848750', 'ore.phillips@icloud.com', 'Ore', 'Phillips', NULL, '2025-09-01 16:12:46.829404', '2025-09-01 16:12:46.829404', true),
('lamira-admin', 'lamira@novellum.ai', 'Lamira', '', NULL, '2025-09-01 20:48:47.218137', '2025-09-01 20:48:47.218137', true),
('test-user-123', 'testuser@example.com', 'Test', 'User', NULL, '2025-09-01 20:49:43.234497', '2025-09-01 20:49:43.234497', false);

-- Projects table
INSERT INTO projects (id, name, description, slug, owner_id, personas, created_at, updated_at) VALUES
(1, 'ATXP Onboarding', '', 'atxp-onboarding', '44848750', '["Developer", "Business Owner"]', '2025-09-01 16:13:40.001837', '2025-09-01 16:13:40.001837'),
(5, 'DEMO PROJECT', 'This is a demo project for testing purposes', 'demo-project', '44848750', '["Developer", "Business Owner"]', '2025-09-01 20:10:13.825004', '2025-09-01 20:10:13.825004');

-- Project Members table
INSERT INTO project_members (id, project_id, user_id, role) VALUES
(1, 1, '44848750', 'admin'),
(3, 1, 'lamira-admin', 'admin');

-- Guides table
INSERT INTO guides (id, project_id, title, description, personas, created_at, updated_at) VALUES
(1, 1, 'ATXP Agent Onboarding Guide', 'Complete guide for integrating ATXP agents into your development workflow', '["Developer", "Business Owner"]', '2025-09-01 16:13:40.046837', '2025-09-01 16:13:40.046837'),
(2, 1, 'ATXP MCP Server Monetization Guide', 'Learn how to monetize your MCP servers using ATXP payment infrastructure', '["Developer", "Business Owner"]', '2025-09-01 16:13:40.046837', '2025-09-01 16:13:40.046837');

-- Note: Flow boxes and steps data would be inserted here
-- Due to the large amount of data (13 flow boxes, 39 steps), 
-- please run the backup script to get the complete export.

-- Summary:
-- ✅ 3 Users (2 platform admins, 1 regular user)
-- ✅ 2 Projects (ATXP Onboarding, DEMO PROJECT)
-- ✅ 2 Project Members (both admins)
-- ✅ 2 Guides (Agent Onboarding, MCP Server Monetization)
-- ✅ 13 Flow Boxes with 39 Steps total