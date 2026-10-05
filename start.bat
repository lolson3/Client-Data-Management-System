@echo off
setlocal

rem Always run from the folder this script lives in, regardless of where
rem it was launched from (double-click, shortcut, Task Scheduler, etc.).
cd /d "%~dp0"

set APP_VERSION=unknown
for /f "delims=" %%v in ('node -p "require('./package.json').version" 2^>nul') do set APP_VERSION=%%v

echo ============================================
echo  Client Data Management System
echo  Version: %APP_VERSION%
echo ============================================
echo.

if not exist "package.json" (
    echo ERROR: package.json not found in %cd%.
    echo This script must live in the project root.
    goto :fail
)

where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js was not found on PATH. Install Node.js and try again.
    goto :fail
)

where npm >nul 2>nul
if errorlevel 1 (
    echo ERROR: npm was not found on PATH. Install Node.js and try again.
    goto :fail
)

if not exist ".env" (
    echo ERROR: .env not found in %cd%.
    echo Copy .env.example to .env and configure it before starting the server.
    goto :fail
)

if not exist "node_modules" (
    echo node_modules not found - running npm install...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed. See output above.
        goto :fail
    )
    echo.
)

echo Building...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed. See output above.
    goto :fail
)

rem next.config.js sets "output: standalone" (for the Electron/installer
rem packaging pipeline), so plain "next start" / "npm run start" does not
rem correctly serve this build - Next.js will warn and refuse. The real
rem entry point is .next\standalone\server.js, and unlike a normal build,
rem standalone output does not include public\ or .next\static\ - those
rem have to be copied in after every build.
if not exist ".next\standalone\server.js" (
    echo ERROR: .next\standalone\server.js not found after build.
    echo Check that next.config.js still sets "output: standalone".
    goto :fail
)

echo Copying static assets into the standalone build...
xcopy "public" ".next\standalone\public\" /E /I /Y /Q >nul
if errorlevel 1 (
    echo ERROR: Failed to copy public\ into the standalone build.
    goto :fail
)
xcopy ".next\static" ".next\standalone\.next\static\" /E /I /Y /Q >nul
if errorlevel 1 (
    echo ERROR: Failed to copy .next\static into the standalone build.
    goto :fail
)

rem .next\standalone\server.js reads its port straight from the PORT env
rem var (defaulting to 3000) and does not load .env itself, so it must be
rem set here explicitly - "next start -p 6030" (npm run start) does not
rem apply to this entry point.
if not defined PORT set PORT=6030

echo.
echo Starting server, version %APP_VERSION%...
echo Open your browser to: http://localhost:%PORT%
echo Press Ctrl+C to stop the server.
echo.
call npm run start:standalone

echo.
echo Server stopped.
pause
exit /b 0

:fail
echo.
pause
exit /b 1
