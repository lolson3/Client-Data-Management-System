/**
 * Package Standalone Server
 *
 * Packages the Next.js standalone build for distribution.
 * Creates a dist-server folder with all necessary files.
 *
 * Run with: npm run build:standalone
 */

const fs = require('fs');
const path = require('path');

// Get version from package.json
function getVersion() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

const version = getVersion();

console.log('');
console.log('========================================');
console.log('  Package Standalone Server');
console.log(`  Version: ${version}`);
console.log('========================================');
console.log('');
console.log('Packaging standalone server for distribution...');

const distDir = path.join(__dirname, '..', 'dist-server');
// Next.js standalone output is at .next/standalone/ (server.js at root, not in a project-name subdirectory)
const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
const publicDir = path.join(__dirname, '..', 'public');
const staticDir = path.join(__dirname, '..', '.next', 'static');

// Folders to exclude when copying (build artifacts that shouldn't be included)
// Note: Do NOT exclude .next - the standalone server needs its .next folder for BUILD_ID, manifests, etc.
const EXCLUDE_FOLDERS = [
  'dist-electron',
  'dist-server',
  '.node-portable',
  'temp-server-build',
  'distribute',        // Contains built client exe files - must not be copied into new builds
  'distribute_server', // Contains built server exe files - must not be copied into new builds
  'electron-app',
  '.git',
];

// Files to exclude when copying (Windows reserved names cause NSIS build failures)
const EXCLUDE_FILES = [
  'nul',   // Windows reserved device name
  'con',   // Windows reserved device name
  'prn',   // Windows reserved device name
  'aux',   // Windows reserved device name
];

// Create dist-server directory if it doesn't exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
} else {
  // Clean existing dist-server
  console.log('Cleaning existing dist-server...');
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy standalone directory (excluding build artifacts)
console.log('Copying standalone server...');
copyDir(standaloneDir, distDir, EXCLUDE_FOLDERS);

// Stamp the build so a deployed dist-server can always be identified
fs.writeFileSync(
  path.join(distDir, 'BUILD_INFO.json'),
  JSON.stringify(
    {
      version,
      builtOn: `${process.platform}-${process.arch}`,
      node: process.version,
      builtAt: new Date().toISOString(),
      note: 'Native modules (better-sqlite3) only work on hosts matching builtOn.',
    },
    null,
    2
  )
);

// Copy better-sqlite3 (and its runtime deps) to standalone node_modules
// (it's marked as external in next.config.js)
//
// IMPORTANT: better-sqlite3 is a native module — its compiled binary only
// runs on the OS/arch it was installed on. A dist-server packaged on Linux
// will NOT have a working database on Windows (and vice versa). Build the
// Windows deliverables on the Windows server.
console.log('Copying better-sqlite3 for SQLite support...');
console.log(`  NOTE: packaging on ${process.platform}-${process.arch} — this dist-server's`);
console.log(`  database (better-sqlite3) will only work on ${process.platform}-${process.arch} hosts.`);
for (const pkg of ['better-sqlite3', 'bindings', 'file-uri-to-path']) {
  const srcDir = path.join(__dirname, '..', 'node_modules', pkg);
  const destDir = path.join(distDir, 'node_modules', pkg);
  if (fs.existsSync(srcDir)) {
    copyDir(srcDir, destDir);
    console.log(`  ${pkg} copied successfully`);
  } else {
    console.warn(`  Warning: ${pkg} not found in node_modules`);
  }
}

// Copy static files
console.log('Copying static files...');
const distStaticDir = path.join(distDir, '.next', 'static');
if (!fs.existsSync(distStaticDir)) {
  fs.mkdirSync(distStaticDir, { recursive: true });
}
copyDir(staticDir, distStaticDir);

// Copy public folder
console.log('Copying public folder...');
if (fs.existsSync(publicDir)) {
  const distPublicDir = path.join(distDir, 'public');
  if (fs.existsSync(distPublicDir)) {
    fs.rmSync(distPublicDir, { recursive: true, force: true });
  }
  copyDir(publicDir, distPublicDir);
}

// Create databases directory
console.log('Creating databases directory...');
const distDatabasesDir = path.join(distDir, 'databases');
if (!fs.existsSync(distDatabasesDir)) {
  fs.mkdirSync(distDatabasesDir, { recursive: true });
}

// Create data directory for auth.db
console.log('Creating data directory...');
const distDataDir = path.join(distDir, 'data');
if (!fs.existsSync(distDataDir)) {
  fs.mkdirSync(distDataDir, { recursive: true });
}

// Copy Examples folder if it exists (for testing)
const examplesDir = path.join(__dirname, '..', 'Examples');
const distExamplesDir = path.join(distDir, 'Examples');
if (fs.existsSync(examplesDir)) {
  console.log('Copying Examples folder...');
  copyDir(examplesDir, distExamplesDir);
}

// Copy data folder (auth.db) if it exists
const dataDir = path.join(__dirname, '..', 'data');
if (fs.existsSync(dataDir)) {
  console.log('Copying data folder (auth database)...');
  copyDir(dataDir, distDataDir);
}

// Copy .env file from root if it exists, otherwise create a minimal one
console.log('Copying .env file...');
const rootEnvFile = path.join(__dirname, '..', '.env');
const distEnvFile = path.join(distDir, '.env');

if (fs.existsSync(rootEnvFile)) {
  // Copy the root .env file directly
  fs.copyFileSync(rootEnvFile, distEnvFile);
  console.log('  Copied .env from project root');
} else {
  // Create minimal .env if root doesn't have one
  console.log('  No root .env found, creating minimal .env...');
  const envContent = `# ============================================
# CLIENT DATA MANAGEMENT SERVER CONFIGURATION
# ============================================
# Copy this from your development .env file or configure manually
# ============================================

# Server Configuration
PORT=6030
HOSTNAME=0.0.0.0

# Disable authentication (set to "true" to skip login)
DISABLE_AUTH=false

# Node Environment
NODE_ENV=production

# Authentication Database Path
AUTH_DB_PATH=./data/auth.db

# REQUIRED when authentication is enabled. Generate at least 32 random
# characters, for example: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=

# ============================================
# EXCEL DATA PATHS - CONFIGURE THESE!
# ============================================
EXCEL_BASE_PATH=S:/PBIData/NetDoc/Manual
COMPANIES_FILE_PATH=S:/PBIData/Biztech/companies.xlsx
# ============================================
`;
  fs.writeFileSync(distEnvFile, envContent);
}

// Create server wrapper that loads .env (no external dependencies)
console.log('Creating server wrapper...');
const serverWrapper = `// Server wrapper - loads .env file before starting Next.js server
// This script parses .env manually to avoid requiring dotenv package
const fs = require('fs');
const path = require('path');

// Load .env file manually
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\\n').forEach(line => {
    // Skip empty lines and comments
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    // Parse KEY=VALUE (handle quoted values)
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // Only set if not already set in environment
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Set defaults if not in .env
process.env.PORT = process.env.PORT || '6030';
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

const jwtSecret = (process.env.JWT_SECRET || '').trim();
if (
  process.env.DISABLE_AUTH !== 'true' &&
  (jwtSecret.length < 32 || jwtSecret === 'change-this-secret-in-production')
) {
  throw new Error('JWT_SECRET must be set to a non-default value of at least 32 characters before starting CDMS in production.');
}

console.log('Starting server on port ' + process.env.PORT + '...');

// Start the Next.js server
require('./server.js');
`;
fs.writeFileSync(path.join(distDir, 'start.js'), serverWrapper);

// Create start script
console.log('Creating start script...');
const startScript = `@echo off
title Client Data Management Server v${version}
echo.
echo ========================================
echo   Client Data Management Server
echo   Version: ${version}
echo ========================================
echo.
echo Starting server on port 6030...
echo Open your browser to: http://localhost:6030
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

node start.js

pause
`;

fs.writeFileSync(path.join(distDir, 'start-server.bat'), startScript);

// Create README
console.log('Creating README...');
const readmeContent = `# Client Data Management Server - Standalone Distribution
Version: ${version}

## Prerequisites

This standalone server requires **Node.js 18 or later** to be installed on your system.

Download Node.js from: https://nodejs.org/

## Contents

This directory contains a standalone version of the Client Data Management application.

### Files and Folders:
- \`start-server.bat\` - Easy start script (recommended)
- \`server.js\` - Main server file
- \`.next/\` - Next.js build output
- \`public/\` - Static assets
- \`databases/\` - Database files (created automatically on first run)
- \`node_modules/\` - Required dependencies

## How to Run

### Quick Start
1. Double-click \`start-server.bat\`
2. The server will start and show connection information
3. Open your browser and navigate to http://localhost:6030

### Command Line
\`\`\`
node server.js
\`\`\`

## Configuration

Edit the \`.env\` file to configure:
- PORT - Server port (default: 6030)
- DISABLE_AUTH - Set to "true" to skip login (for single-user deployments)
- JWT_SECRET - Required 32+ character random secret when authentication is enabled
- EXCEL_BASE_PATH - Path to Excel data files
- COMPANIES_FILE_PATH - Path to companies Excel file

## Database

The database will be created automatically in the \`databases/\` folder on first run.

To reset the database:
1. Stop the server (Ctrl+C)
2. Delete the files in \`databases/\` folder
3. Restart the server

## Port Configuration

To change the port, edit the \`.env\` file or set the PORT environment variable:

Windows:
\`\`\`
set PORT=8080
node server.js
\`\`\`

## Troubleshooting

### Server won't start
- Make sure Node.js is installed: \`node --version\`
- Make sure no other application is using port 6030
- Check that all files and folders are present

### Can't connect
- Make sure the server is running (check the console window)
- Try accessing http://localhost:6030 directly
- Check your firewall settings

## System Requirements

- **Node.js:** Version 18 or later
- **Operating System:** Windows 10/11, macOS, or Linux
- **RAM:** Minimum 2GB
- **Disk Space:** 500MB minimum

## Support

For issues and support, please contact your system administrator.
`;

fs.writeFileSync(path.join(distDir, 'README.txt'), readmeContent);

console.log('');
console.log('========================================');
console.log('  Server package created successfully!');
console.log('========================================');
console.log(`  Version: ${version}`);
console.log(`  Output: dist-server/`);
console.log('========================================');
console.log('');
console.log('IMPORTANT: This package requires Node.js to run.');
console.log('Users need to install Node.js 18+ from https://nodejs.org/');
console.log('');
console.log('To test: cd dist-server && start-server.bat');
console.log('');

// Helper function to recursively copy directory with optional exclusions
function copyDir(src, dest, excludeFolders = []) {
  if (!fs.existsSync(src)) {
    console.warn(`Warning: Source directory not found: ${src}`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Materialize symbolic links (junctions on Windows) as real copies.
    // Turbopack's standalone output aliases serverExternalPackages through
    // symlinks (e.g. .next/node_modules/better-sqlite3-<hash> -> better-sqlite3);
    // skipping them ships a build whose externals cannot resolve. Copying the
    // resolved content creates no symlinks, so no EPERM risk on Windows.
    if (entry.isSymbolicLink()) {
      try {
        const target = fs.realpathSync(srcPath);
        if (fs.statSync(target).isDirectory()) {
          console.log(`  Materializing symlinked folder: ${entry.name}`);
          copyDir(target, destPath, excludeFolders);
        } else {
          fs.copyFileSync(target, destPath);
        }
      } catch (err) {
        console.warn(`  Skipping broken symlink: ${entry.name} (${err.message})`);
      }
      continue;
    }

    // Skip excluded folders
    if (entry.isDirectory() && excludeFolders.includes(entry.name)) {
      console.log(`  Skipping excluded folder: ${entry.name}`);
      continue;
    }

    // Skip excluded files (Windows reserved names)
    if (!entry.isDirectory() && EXCLUDE_FILES.includes(entry.name.toLowerCase())) {
      console.log(`  Skipping excluded file: ${entry.name}`);
      continue;
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, excludeFolders);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
