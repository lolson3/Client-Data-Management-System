/**
 * Server Installer Builder
 *
 * Creates an NSIS installer for the standalone server with bundled Node.js.
 * This allows deployment without requiring Node.js to be pre-installed.
 *
 * Run with: npm run server:installer
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// Configuration
// Bundle the same Node version that is running this build: native modules
// (better-sqlite3) were compiled/downloaded for THIS Node's ABI during
// `npm install`, and a bundled runtime with a different major version
// refuses to load them. Override with BUNDLED_NODE_VERSION to pin one —
// but then run the build itself with that same Node version.
const NODE_VERSION = process.env.BUNDLED_NODE_VERSION || process.version.slice(1);
const NODE_ARCH = 'win-x64';
const NODE_FILENAME = `node-v${NODE_VERSION}-${NODE_ARCH}`;
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_FILENAME}.zip`;
const SERVER_PORT = 6030;
const MAX_REDIRECTS = 5;

const ROOT_DIR = path.join(__dirname, '..');
const DIST_SERVER_DIR = path.join(ROOT_DIR, 'dist-server');
const BUILD_DIR = path.join(ROOT_DIR, 'build');
const TEMP_DIR = path.join(ROOT_DIR, 'temp-server-build');
const NODE_CACHE_DIR = path.join(ROOT_DIR, '.node-portable');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist-electron');

function getVersion() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  return packageJson.version;
}

function downloadFile(url, destPath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      return reject(new Error(`Too many redirects (>${MAX_REDIRECTS})`));
    }

    if (redirectCount === 0) {
      console.log(`Downloading: ${url}`);
    }

    const client = url.startsWith('https') ? https : http;

    client.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume(); // Drain the response
        downloadFile(response.headers.location, destPath, redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`Download failed: HTTP ${response.statusCode}`));
      }

      const file = fs.createWriteStream(destPath);
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize) {
          const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
          process.stdout.write(`\rDownloading: ${percent}%`);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('\nDownload complete.');
        resolve();
      });

      file.on('error', (err) => {
        file.close();
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

function extractZip(zipPath, destDir) {
  console.log(`Extracting: ${zipPath}`);
  execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`, {
    stdio: 'inherit'
  });
}

// Windows reserves these base names (with or without extension) — they cause NSIS build failures
const RESERVED_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

function isReservedName(filename) {
  const baseName = filename.toLowerCase().replace(/\.[^.]*$/, '');
  return RESERVED_NAMES.has(baseName);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (isReservedName(entry.name)) {
      console.log(`  Skipping reserved name: ${entry.name}`);
      continue;
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function findMakensis() {
  const nsisLocations = [
    'C:\\Program Files (x86)\\NSIS\\makensis.exe',
    'C:\\Program Files\\NSIS\\makensis.exe',
    path.join(ROOT_DIR, 'node_modules', 'electron-builder', 'node_modules', 'app-builder-bin', 'win', 'x64', 'nsis', 'makensis.exe'),
  ];

  for (const loc of nsisLocations) {
    if (fs.existsSync(loc)) {
      return loc;
    }
  }

  try {
    return execSync('where makensis', { encoding: 'utf8' }).trim().split('\n')[0];
  } catch {
    return null;
  }
}

async function build() {
  const version = getVersion();

  console.log('');
  console.log('========================================');
  console.log('  Server Installer Builder');
  console.log('========================================');
  console.log(`  Version: ${version}`);
  console.log('========================================');
  console.log('');

  if (!fs.existsSync(DIST_SERVER_DIR)) {
    console.error('Error: dist-server not found. Run "npm run build:standalone" first.');
    process.exit(1);
  }

  // Fail fast if NSIS is not available before doing expensive copy work
  const makensisPath = findMakensis();
  if (!makensisPath) {
    console.error('');
    console.error('Error: NSIS (makensis) not found.');
    console.error('Please install NSIS from: https://nsis.sourceforge.io/Download');
    console.error('Or run: winget install NSIS.NSIS');
    process.exit(1);
  }

  console.log('Preparing build directory...');
  cleanDir(TEMP_DIR);

  try {
    // Download Node.js if not cached
    const nodeZipPath = path.join(NODE_CACHE_DIR, `${NODE_FILENAME}.zip`);
    const nodeExtractPath = path.join(NODE_CACHE_DIR, NODE_FILENAME);

    if (!fs.existsSync(nodeExtractPath)) {
      fs.mkdirSync(NODE_CACHE_DIR, { recursive: true });

      if (!fs.existsSync(nodeZipPath)) {
        await downloadFile(NODE_URL, nodeZipPath);
      }

      extractZip(nodeZipPath, NODE_CACHE_DIR);
    } else {
      console.log('Using cached Node.js...');
    }

    console.log('Copying server files...');
    const serverDestDir = path.join(TEMP_DIR, 'server');
    copyDir(DIST_SERVER_DIR, serverDestDir);

    console.log('Copying Node.js runtime...');
    const nodeDestDir = path.join(TEMP_DIR, 'node');
    copyDir(nodeExtractPath, nodeDestDir);

    console.log('Creating launcher...');
    const launcherContent = `@echo off
title Client Data Management Server v${version}
cd /d "%~dp0server"
echo.
echo ========================================
echo   Client Data Management Server
echo   Version: ${version}
echo ========================================
echo.
echo Starting server...
echo Configuration loaded from .env file
echo.
echo Open your browser to: http://localhost:${SERVER_PORT}
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

"%~dp0node\\node.exe" start.js

pause
`;
    fs.writeFileSync(path.join(TEMP_DIR, 'Start Server.bat'), launcherContent);

    console.log('Creating installer script...');
    const installerName = `ClientDataManagement_Server_Setup_${version}`;
    const iconPath = path.join(BUILD_DIR, 'icon.ico');
    const hasIcon = fs.existsSync(iconPath);

    if (!hasIcon) {
      console.log('Note: No icon.ico found in build/ folder. Using default icon.');
    }

    const iconLines = hasIcon ? `
!define MUI_ICON "${BUILD_DIR}\\icon.ico"
!define MUI_UNICON "${BUILD_DIR}\\icon.ico"` : '';

    const nsisScript = `
; NSIS Installer Script for Client Data Management Server
; Generated by build-server-installer.js

!include "MUI2.nsh"

; General
Name "Client Data Management Server ${version}"
OutFile "${OUTPUT_DIR}\\${installerName}.exe"
; Install to C:\\ClientDataServer by default (not Program Files) to avoid permission issues with SQLite database
InstallDir "C:\\ClientDataServer"
InstallDirRegKey HKCU "Software\\ClientDataServer" "InstallDir"
; Use user level to avoid needing admin rights
RequestExecutionLevel user

; Interface Settings
!define MUI_ABORTWARNING${iconLines}

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages
!insertmacro MUI_LANGUAGE "English"

; Installer Section
Section "Install"
  ; Remove old server and node files before installing fresh copies
  RMDir /r "$INSTDIR\\server"
  RMDir /r "$INSTDIR\\node"
  Delete "$INSTDIR\\Start Server.bat"

  SetOutPath "$INSTDIR"

  ; Copy all files
  File /r "${TEMP_DIR}\\*.*"

  ; Create databases directory
  CreateDirectory "$INSTDIR\\server\\databases"

  ; Store installation folder
  WriteRegStr HKCU "Software\\ClientDataServer" "InstallDir" "$INSTDIR"

  ; Create uninstaller
  WriteUninstaller "$INSTDIR\\Uninstall.exe"

  ; Create Start Menu shortcuts
  CreateDirectory "$SMPROGRAMS\\Client Data Management Server"
  CreateShortcut "$SMPROGRAMS\\Client Data Management Server\\Start Server.lnk" "$INSTDIR\\Start Server.bat" "" "$INSTDIR\\node\\node.exe"
  CreateShortcut "$SMPROGRAMS\\Client Data Management Server\\Uninstall.lnk" "$INSTDIR\\Uninstall.exe"

  ; Create Desktop shortcut
  CreateShortcut "$DESKTOP\\Client Data Management Server.lnk" "$INSTDIR\\Start Server.bat" "" "$INSTDIR\\node\\node.exe"

SectionEnd

; Uninstaller Section
Section "Uninstall"
  ; Remove files
  RMDir /r "$INSTDIR\\server"
  RMDir /r "$INSTDIR\\node"
  Delete "$INSTDIR\\Start Server.bat"
  Delete "$INSTDIR\\Uninstall.exe"
  RMDir "$INSTDIR"

  ; Remove shortcuts
  Delete "$SMPROGRAMS\\Client Data Management Server\\Start Server.lnk"
  Delete "$SMPROGRAMS\\Client Data Management Server\\Uninstall.lnk"
  RMDir "$SMPROGRAMS\\Client Data Management Server"
  Delete "$DESKTOP\\Client Data Management Server.lnk"

  ; Remove registry keys
  DeleteRegKey HKCU "Software\\ClientDataServer"

SectionEnd
`;

    const nsisScriptPath = path.join(TEMP_DIR, 'installer.nsi');
    fs.writeFileSync(nsisScriptPath, nsisScript);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log('Building installer...');
    execSync(`"${makensisPath}" "${nsisScriptPath}"`, { stdio: 'inherit' });

    console.log('');
    console.log('========================================');
    console.log('  Installer created successfully!');
    console.log('========================================');
    console.log(`  Version: ${version}`);
    console.log(`  Output: ${OUTPUT_DIR}\\${installerName}.exe`);
    console.log('========================================');
    console.log('');

  } finally {
    // Always clean up temp directory, even on failure
    if (fs.existsSync(TEMP_DIR)) {
      console.log('Cleaning up...');
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
