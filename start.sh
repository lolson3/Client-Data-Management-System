#!/usr/bin/env bash
# Always run from the folder this script lives in, regardless of where
# it was launched from.
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" || exit 1

fail() {
    echo
    exit 1
}

APP_VERSION="$(node -p "require('./package.json').version" 2>/dev/null)"
APP_VERSION="${APP_VERSION:-unknown}"

echo "============================================"
echo " Client Data Management System"
echo " Version: $APP_VERSION"
echo "============================================"
echo

if [ ! -f "package.json" ]; then
    echo "ERROR: package.json not found in $(pwd)."
    echo "This script must live in the project root."
    fail
fi

if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: Node.js was not found on PATH. Install Node.js and try again."
    fail
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "ERROR: npm was not found on PATH. Install Node.js and try again."
    fail
fi

if [ ! -f ".env" ]; then
    echo "ERROR: .env not found in $(pwd)."
    echo "Copy .env.example to .env and configure it before starting the server."
    fail
fi

if [ ! -d "node_modules" ]; then
    echo "node_modules not found - running npm install..."
    if ! npm install; then
        echo "ERROR: npm install failed. See output above."
        fail
    fi
    echo
fi

echo "Building..."
if ! npm run build; then
    echo "ERROR: Build failed. See output above."
    fail
fi

# next.config.js sets "output: standalone" (for the Electron/installer
# packaging pipeline), so plain "next start" / "npm run start" does not
# correctly serve this build - Next.js will warn and refuse. The real
# entry point is .next/standalone/server.js, and unlike a normal build,
# standalone output does not include public/ or .next/static/ - those
# have to be copied in after every build.
if [ ! -f ".next/standalone/server.js" ]; then
    echo "ERROR: .next/standalone/server.js not found after build."
    echo "Check that next.config.js still sets \"output: standalone\"."
    fail
fi

echo "Copying static assets into the standalone build..."
mkdir -p ".next/standalone/public" && cp -R "public/." ".next/standalone/public/"
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to copy public/ into the standalone build."
    fail
fi
mkdir -p ".next/standalone/.next/static" && cp -R ".next/static/." ".next/standalone/.next/static/"
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to copy .next/static into the standalone build."
    fail
fi

# .next/standalone/server.js reads its port straight from the PORT env
# var (defaulting to 3000) and does not load .env itself, so it must be
# set here explicitly - "next start -p 6030" (npm run start) does not
# apply to this entry point.
export PORT="${PORT:-6030}"

echo
echo "Starting server, version $APP_VERSION..."
echo "Open your browser to: http://localhost:$PORT"
echo "Press Ctrl+C to stop the server."
echo
npm run start:standalone

echo
echo "Server stopped."
exit 0
