-- ========================================
-- PROJECT 3 MIGRATION: DEV TO PRODUCTION
-- ========================================
-- This script exports all data for Project 3 (CantyAI Guides)
-- 
-- INSTRUCTIONS:
-- 1. Copy this entire file content
-- 2. Access your production database (deployment environment)
-- 3. Run these INSERT statements in your production database
-- 4. After successful import, guides.canty.ai will redirect to Project 3
--
-- WHAT THIS IMPORTS:
-- ✅ Project 3: "CantyAI Guides" 
-- ✅ 2 Guides: Canton setup guides with complete content
-- ✅ 9 Flow Boxes: Step-by-step installation processes
-- ✅ 25 Steps: Detailed instructions for Windows, macOS, Linux
-- ✅ Project Member: Admin access for user 44848750
-- ✅ Custom Domain: guides.canty.ai → Project 3 white-label
-- 
-- Total records: ~35 records across 5 tables

-- 1. PROJECT
INSERT INTO projects (id, name, description, slug, owner_id, settings, is_active, created_at, updated_at) VALUES
(3, 'CantyAI Guides', 'Canton Community Expert Agent', 'cantyai', '44848750', '{"conversationHistoryEnabled": false}', true, '2025-09-12 02:19:11.674159', '2025-09-12 07:25:18.14');

-- 2. PROJECT MEMBER  
INSERT INTO project_members (id, project_id, user_id, role, joined_at) VALUES
(4, 3, '44848750', 'admin', '2025-09-12 02:19:11.757505');

-- 3. GUIDES
INSERT INTO guides (id, project_id, title, description, slug, global_information, personas, resource_links, resource_attachments, is_active, created_by, created_at, updated_at, is_public) VALUES
(4, 3, 'CantyAI - StandUp Canton Locally (Windows)', 'One canton community member''s way of setting up canton locally', 'cantyai-standup-canton-locally', '', '["Developer", "Designer", "Product Manager", "Customer Success", "Finance", "CxO", "Consultant", "Other", "General"]', '[]', '[]', true, '44848750', '2025-09-12 09:26:50.404681', '2025-09-12 10:30:14.299', true),
(5, 3, 'Send''s Homebrew Formula for Installing Canton', 'https://github.com/0xsend/homebrew-canton

Features
🚀 Latest Pre-release by Default: Automatically installs the latest pre-release from DAML
📦 Version Selection: Install any specific Canton release using versioned formulas
🔄 Multiple Versions: Support for installing and switching between multiple Canton versions
☕ Java Integration: Works with system Java 11+ or Homebrew OpenJDK
📦 Complete Installation: Includes binaries, configs, docs, and examples
🤖 Automated Updates: GitHub Actions tracks and updates Canton releases', 'send-s-homebrew-formula-for-installing-canton', 'Detailed code can be found here https://github.com/0xsend/homebrew-canton', '["Developer", "Designer", "Product Manager", "Customer Success", "Finance", "CxO", "Consultant", "Other", "General"]', '[]', '[]', true, '44848750', '2025-09-12 10:26:42.318178', '2025-09-12 10:29:21.415', true);

-- 4. FLOW BOXES
INSERT INTO flow_boxes (id, guide_id, title, description, agent_instructions, position, is_visible, created_at, updated_at) VALUES
(30, 4, 'Prerequisites Setup *Verify system requirements and tools before installation*', '', '', 1, true, '2025-09-12 09:31:40.516101', '2025-09-12 09:31:40.516101'),
(31, 4, 'PostgreSQL Installation *Install and configure PostgreSQL 17 database server*', '', '', 2, true, '2025-09-12 09:31:40.584972', '2025-09-12 09:31:40.584972'),
(32, 4, 'Database Configuration *Set up the Canton database with proper credentials*', '', '', 3, true, '2025-09-12 09:31:40.699561', '2025-09-12 09:31:40.699561'),
(33, 4, 'What you are Setting Up', 'Quick Summary of what you are setting up', '', 4, true, '2025-09-12 09:51:16.083226', '2025-09-12 09:53:23.064'),
(34, 5, 'Installation Setup *Install Canton via Homebrew with latest or specific versions*', '', '', 1, true, '2025-09-12 10:28:35.570259', '2025-09-12 10:28:35.570259'),
(35, 5, 'Version Management *Switch between different Canton installations and check versions*', '', '', 2, true, '2025-09-12 10:28:35.679952', '2025-09-12 10:28:35.679952'),
(36, 5, 'Usage & Configuration *Run Canton commands and locate configuration files*', '', '', 3, true, '2025-09-12 10:28:35.799619', '2025-09-12 10:28:35.799619'),
(37, 5, 'Java Environment *Set up required Java dependencies for Canton*', '', '', 4, true, '2025-09-12 10:28:35.869237', '2025-09-12 10:28:35.869237'),
(38, 5, 'Development & Troubleshooting *Test formulas, debug issues, and contribute to the project*', '', '', 5, true, '2025-09-12 10:28:35.963644', '2025-09-12 10:28:35.963644');

-- 5. CUSTOM DOMAIN MAPPING
INSERT INTO custom_domain_mappings (id, domain, path_prefix, feature, route_mode, project_id, guide_id, default_guide_slug, theme, seo_settings, is_active, verification_token, verified_at, created_by, created_at, updated_at) VALUES
(5, 'guides.canty.ai', '/', 'both', 'project_guides', 3, null, null, '{"text": "#1f2937", "primary": "#3b82f6", "secondary": "#f3f4f6", "background": "#ffffff"}', '{}', true, null, '2025-09-12 15:18:17.627', '44848750', '2025-09-12 15:18:15.231883', '2025-09-12 15:18:17.627');

-- ========================================
-- STEPS DATA (COMPLETE SET)
-- ========================================

INSERT INTO steps (id, flow_box_id, title, content, persona_variations, position, is_visible, is_critical, attachments, created_at, updated_at) VALUES 
(83, 30, 'Check Operating System Compatibility', 'Before starting, ensure you have:\n- ✅ **Windows 10/11** or **macOS 10.15+** or **Linux** (Ubuntu/Debian/CentOS)\n- ✅ DAML SDK 2.8.0+ installed\n- ✅ Administrator/sudo privileges (for PostgreSQL installation)\n- ✅ 4GB+ available disk space\n- ✅ Internet connection for downloads', '{}', 1, true, false, '[]', '2025-09-12 09:31:40.556548', '2025-09-12 09:31:40.556548'),
(84, 31, 'Windows Installation Process', '**Navigate to PostgreSQL Downloads:**\n- Go to: https://www.postgresql.org/download/windows/\n- Click "Download the installer"\n**Download PostgreSQL 17:**\n- Select the latest PostgreSQL 17.x version\n- Choose "Windows x86-64" architecture\n- Download the installer (approximately 400MB)\n**Run the Installer:**\n```cmd\n# Run the downloaded postgresql_17.exe file as Administrator\n```\n**Installation Settings (CRITICAL - Follow Exactly):**\n- **Installation Directory:** `C:\Program Files\PostgreSQL\17` (default)\n- **Data Directory:** `C:\Program Files\PostgreSQL\17\data` (default)\n- **Password:** Enter a secure password and **REMEMBER IT** (we''ll use `canton123` in this guide)\n- **Port:** `5432` (default)\n- **Locale:** Default locale (default)\n- **Components:** Select all (PostgreSQL Server, pgAdmin 4, Stack Builder, Command Line Tools)\n**Complete Installation:**\n- Click "Next" through all screens\n- Wait for installation to complete (5-10 minutes)\n- **DO NOT** launch Stack Builder when prompted\n- Click "Finish"\n**Verify Installation:**\n```cmd\n# Open Command Prompt as Administrator\n"C:\Program Files\PostgreSQL\17\bin\psql.exe" --version\n# Should output: psql (PostgreSQL) 17.x\n```', '{}', 1, true, false, '[]', '2025-09-12 09:31:40.608016', '2025-09-12 09:31:40.608016'),
(85, 31, 'macOS Installation Options', '**Option A: Using Homebrew (Recommended)**\n**Install Homebrew (if not installed):**\n```bash\n/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"\n```\n**Install PostgreSQL 17:**\n```bash\n# Update Homebrew\nbrew update\n# Install PostgreSQL\nbrew install postgresql@17\n```\n**Start PostgreSQL Service:**\n```bash\n# Start PostgreSQL service\nbrew services start postgresql@17\n# Add PostgreSQL to PATH\necho ''export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"'' >> ~/.zshrc\nsource ~/.zshrc\n```\n**Set Up Database User:**\n```bash\n# Create postgres user with password\ncreateuser -s postgres\npsql postgres -c "ALTER USER postgres PASSWORD ''canton123'';"\n```', '{}', 2, true, false, '[]', '2025-09-12 09:31:40.630194', '2025-09-12 09:31:40.630194'),
(86, 31, 'Linux Installation (Ubuntu/Debian)', '```bash\n# Update package list\nsudo apt update\n# Install PostgreSQL 17\nsudo apt install -y postgresql-17 postgresql-client-17\n# Start PostgreSQL service\nsudo systemctl start postgresql\nsudo systemctl enable postgresql\n# Set password for postgres user\nsudo -u postgres psql -c "ALTER USER postgres PASSWORD ''canton123'';"\n# Verify installation\npsql --version\n```', '{}', 3, true, false, '[]', '2025-09-12 09:31:40.653623', '2025-09-12 09:31:40.653623'),
(87, 31, 'Verification (All Platforms)', 'After installation, verify PostgreSQL is working:\n```bash\n# Test connection (use appropriate path for your OS)\npsql -U postgres -h localhost -p 5432 -c "SELECT version();"\n# Enter password: canton123\n# Should show PostgreSQL version information\n```', '{}', 4, true, false, '[]', '2025-09-12 09:31:40.676127', '2025-09-12 09:31:40.676127'),
(88, 32, 'Windows Database Setup', '**Open Command Prompt as Administrator:**\n```cmd\n# Press Win+R, type "cmd", press Ctrl+Shift+Enter\n```\n**Set Environment Variable:**\n```', '{}', 1, true, false, '[]', '2025-09-12 09:31:40.72478', '2025-09-12 09:31:40.72478'),
(92, 33, 'Step 2', 'Enter step content here...', '{}', 2, true, false, '[]', '2025-09-12 10:08:48.074817', '2025-09-12 10:08:48.074817'),
(93, 34, 'Install Latest Pre-release (Default)', 'The formula automatically fetches and installs the latest pre-release version from DAML:\n```bash\n# Add this tap to Homebrew\nbrew tap 0xsend/homebrew-canton\n# Install latest Canton pre-release\nbrew install canton\n```', '{}', 1, true, false, '[]', '2025-09-12 10:28:35.603178', '2025-09-12 10:28:35.603178'),
(94, 34, 'Install Specific Version', 'You can install a specific DAML release version using versioned formulas:\n```bash\n# Example: Install specific DAML release v3.4.0-snapshot.20250813.1\nbrew tap 0xsend/homebrew-canton\nbrew install canton@3.4.0-snapshot.20250813.1\n# Or create a versioned formula first\nruby scripts/create-versioned-formula.rb 3.4.0-snapshot.20250813.1\nbrew install ./Formula/canton@3.4.0-snapshot.20250813.1.rb\n```', '{}', 2, true, false, '[]', '2025-09-12 10:28:35.631785', '2025-09-12 10:28:35.631785'),
(95, 34, 'Check Available Versions', 'To see available versions:\n```bash\n# Show latest versions from manifest\nbun run scripts/show-latest-versions.ts\n# Show manifest statistics\nbun run scripts/show-manifest-stats.ts\n```', '{}', 3, true, false, '[]', '2025-09-12 10:28:35.655416', '2025-09-12 10:28:35.655416'),
(96, 35, 'Switch Between Versions', 'If you have multiple Canton versions installed:\n```bash\n# Unlink current version\nbrew unlink canton\n# Link a specific version\nbrew link canton@3.4.0-snapshot.20250813.1\n# Check current version\ncanton --version\n```', '{}', 1, true, false, '[]', '2025-09-12 10:28:35.703001', '2025-09-12 10:28:35.703001'),
(97, 35, 'Dynamic Formula Management', 'The main canton formula dynamically fetches the latest pre-release from the DAML repository at install time. This ensures you always get the most recent pre-release version.', '{}', 2, true, false, '[]', '2025-09-12 10:28:35.726558', '2025-09-12 10:28:35.726558'),
(98, 35, 'Generate Version Manifest', 'To improve performance and cache SHA256 hashes, generate a version manifest:\n```bash\n# Generate manifest for top 10 releases\nbun run scripts/generate-version-manifest.ts 10\n# This creates canton-versions.json with cached version information\n```', '{}', 3, true, false, '[]', '2025-09-12 10:28:35.749474', '2025-09-12 10:28:35.749474'),
(99, 36, 'Basic Usage', 'After installation, Canton is available as the canton command:\n```bash\n# Show Canton help\ncanton --help\n# Start Canton with a config\ncanton -c /opt/homebrew/etc/canton/config/simple-topology.conf\n# Check version info\ncat /opt/homebrew/opt/canton/VERSION_INFO.txt\n```', '{}', 1, true, false, '[]', '2025-09-12 10:28:35.822637', '2025-09-12 10:28:35.822637'),
(100, 36, 'Configuration Files Location', 'The formula installs the complete Canton distribution:\n- Binary: `/opt/homebrew/bin/canton`\n- Config files: `/opt/homebrew/etc/canton/config/`\n- Examples: `/opt/homebrew/etc/canton/examples/`\n- Documentation: `/opt/homebrew/etc/canton/docs/`\n- Libraries: `/opt/homebrew/etc/canton/lib/`\n- Version Info: `/opt/homebrew/opt/canton/VERSION_INFO.txt`', '{}', 2, true, false, '[]', '2025-09-12 10:28:35.846016', '2025-09-12 10:28:35.846016'),
(101, 37, 'Java Requirements', 'Canton requires Java 11 or later. The formula recommends OpenJDK 17 but will work with any compatible Java installation.', '{}', 1, true, false, '[]', '2025-09-12 10:28:35.892472', '2025-09-12 10:28:35.892472'),
(102, 37, 'Using Homebrew Java', '```bash\n# Install recommended Java version\nbrew install openjdk@17\n# Set JAVA_HOME (add to your shell profile)\nexport JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"\n```', '{}', 2, true, false, '[]', '2025-09-12 10:28:35.915974', '2025-09-12 10:28:35.915974'),
(103, 37, 'Using System Java', '```bash\n# Verify Java version (must be 11+)\njava -version\n# Set JAVA_HOME if needed\nexport JAVA_HOME=$(/usr/libexec/java_home -v 11)\n```', '{}', 3, true, false, '[]', '2025-09-12 10:28:35.940611', '2025-09-12 10:28:35.940611'),
(104, 38, 'Creating Versioned Formulas', 'To create a formula for a specific DAML release:\n```bash\n# Generate formula for a specific DAML tag\nruby scripts/create-versioned-formula.rb v3.4.0-snapshot.20250813.1\n# The script will:\n# 1. Fetch release information from GitHub\n# 2. Find the Canton asset in the release\n# 3. Calculate or retrieve SHA256 hash from manifest\n# 4. Generate Formula/canton@3.4.0-snapshot.20250813.1.rb\n# Install the generated formula\nbrew install ./Formula/canton@3.4.0-snapshot.20250813.1.rb\n```', '{}', 1, true, false, '[]', '2025-09-12 10:28:35.987971', '2025-09-12 10:28:35.987971'),
(105, 38, 'Testing the Formula', '```bash\n# Test the formula syntax\nbrew audit --formula canton\n# Test installation locally\nbrew install --build-from-source ./Formula/canton.rb\n# Test with verbose output\nbrew install --build-from-source --verbose ./Formula/canton.rb\n```', '{}', 2, true, false, '[]', '2025-09-12 10:28:36.011418', '2025-09-12 10:28:36.011418'),
(106, 38, 'Troubleshooting Java Issues', '```bash\n# Check Java version\njava -version\n# Check JAVA_HOME\necho $JAVA_HOME\n# List available Java versions (macOS)\n/usr/libexec/java_home -V\n```', '{}', 3, true, false, '[]', '2025-09-12 10:28:36.03484', '2025-09-12 10:28:36.03484'),
(107, 38, 'Troubleshooting Canton Issues', '```bash\n# Check Canton installation\ncanton --help\n# Check file permissions\nls -la $(which canton)\n# Verify Canton can find Java\ncanton --version\n# Check version information\ncat /opt/homebrew/opt/canton/VERSION_INFO.txt\n```', '{}', 4, true, false, '[]', '2025-09-12 10:28:36.058393', '2025-09-12 10:28:36.058393');