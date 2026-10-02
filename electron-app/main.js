const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const Store = require('electron-store');

const store = new Store({
  defaults: {
    serverUrl: config.server.host
  }
});

let mainWindow;
let settingsWindow;
let serverProcess;

// Get version from package.json
function getVersion() {
  try {
    const packagePath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch {
    return '1.0.0';
  }
}

function startServer(serverUrl) {
  const isDev = !app.isPackaged;
  const serverPath = isDev
    ? path.join(__dirname, '..', '.next', 'standalone', 'client-data-management-system', 'server.js')
    : path.join(process.resourcesPath, 'server', 'client-data-management-system', 'server.js');
  const serverDir = path.dirname(serverPath);

  // Extract port from serverUrl
  const url = new URL(serverUrl);
  const port = url.port || '6030';
  const hostname = url.hostname || '0.0.0.0';

  const version = getVersion();
  console.log('');
  console.log('========================================');
  console.log('  Client Data Management System');
  console.log(`  Version: ${version}`);
  console.log('========================================');
  console.log('');
  console.log('Starting server from:', serverPath);
  console.log('Server will listen on:', `${hostname}:${port}`);

  serverProcess = spawn('node', [serverPath], {
    cwd: serverDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: port,
      HOSTNAME: hostname
    }
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 700,
    height: 650,
    title: 'Settings - Client Data Management',
    parent: mainWindow,
    modal: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));
  settingsWindow.setMenu(null);

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createWindow() {
  const version = getVersion();

  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'server', 'public', 'smaller_logo.png')
    : path.join(__dirname, '..', 'public', 'smaller_logo.png');

  mainWindow = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    title: `${config.window.title} v${version}`,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Create application menu with Settings option
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => createSettingsWindow()
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'toggleDevTools' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Handle new window requests (e.g. Guac button) - add navigation toolbar
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const child = new BrowserWindow({
      width: 1200,
      height: 900,
      icon: iconPath,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Create a simple navigation bar using HTML injected before the page
    child.webContents.on('did-finish-load', () => {
      child.webContents.executeJavaScript(`
        if (!document.getElementById('electron-nav-bar')) {
          const nav = document.createElement('div');
          nav.id = 'electron-nav-bar';
          nav.style.cssText = 'position:fixed;top:0;left:0;right:0;height:36px;background:#2d2d2d;display:flex;align-items:center;padding:0 8px;gap:6px;z-index:999999;font-family:system-ui,sans-serif;';
          nav.innerHTML = \`
            <button id="nav-back" style="background:#444;color:#fff;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:14px;" title="Back">&#9664; Back</button>
            <button id="nav-forward" style="background:#444;color:#fff;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:14px;" title="Forward">Forward &#9654;</button>
            <button id="nav-reload" style="background:#444;color:#fff;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:14px;" title="Reload">&#8635;</button>
            <span id="nav-url" style="color:#aaa;font-size:12px;margin-left:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;"></span>
          \`;
          document.body.style.paddingTop = '36px';
          document.body.prepend(nav);
          document.getElementById('nav-back').addEventListener('click', () => history.back());
          document.getElementById('nav-forward').addEventListener('click', () => history.forward());
          document.getElementById('nav-reload').addEventListener('click', () => location.reload());
          document.getElementById('nav-url').textContent = location.href;
        }
      `);
    });

    // Update URL display on navigation
    child.webContents.on('did-navigate', () => {
      child.webContents.executeJavaScript(`
        const urlEl = document.getElementById('nav-url');
        if (urlEl) urlEl.textContent = location.href;
      `).catch(() => {});
    });

    child.webContents.on('did-navigate-in-page', () => {
      child.webContents.executeJavaScript(`
        const urlEl = document.getElementById('nav-url');
        if (urlEl) urlEl.textContent = location.href;
      `).catch(() => {});
    });

    child.loadURL(url);
    return { action: 'deny' }; // We handle it manually
  });

  // Get server URL from store
  const serverUrl = store.get('serverUrl');

  // Wait a moment for server to start, then load the app
  setTimeout(() => {
    console.log('Connecting to:', serverUrl);
    mainWindow.loadURL(serverUrl);
  }, config.server.startupDelay);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// IPC handlers
ipcMain.handle('get-server-url', () => {
  return store.get('serverUrl');
});

ipcMain.handle('set-server-url', (event, url) => {
  store.set('serverUrl', url);
  return true;
});

ipcMain.handle('get-version', () => {
  return getVersion();
});

ipcMain.on('open-settings', () => {
  createSettingsWindow();
});

ipcMain.on('close-settings', () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});

ipcMain.on('restart-app', () => {
  console.log('Restart requested - relaunching application...');

  // Kill the server process first
  if (serverProcess) {
    console.log('Killing server process...');
    serverProcess.kill();
  }

  // Close all windows
  BrowserWindow.getAllWindows().forEach(window => {
    window.close();
  });

  // Relaunch with current arguments
  app.relaunch({ args: process.argv.slice(1).concat(['--relaunch']) });

  // Force quit
  setTimeout(() => {
    app.exit(0);
  }, 100);
});

app.whenReady().then(() => {
  const version = getVersion();
  console.log('');
  console.log('========================================');
  console.log('  Client Data Management System');
  console.log(`  Version: ${version}`);
  console.log('========================================');
  console.log('');

  // Get server URL from store
  const serverUrl = store.get('serverUrl');

  // Determine if we should start the bundled server
  let shouldStartServer = config.server.startBundledServer;

  // Auto-detect if not explicitly set
  if (shouldStartServer === null || shouldStartServer === undefined) {
    const url = new URL(serverUrl);
    shouldStartServer = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  }

  if (shouldStartServer) {
    console.log('Starting bundled server...');
    startServer(serverUrl);
  } else {
    console.log('Connecting to remote server at:', serverUrl);
  }

  createWindow();
});

app.on('window-all-closed', function () {
  // Kill the server process
  if (serverProcess) {
    serverProcess.kill();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
