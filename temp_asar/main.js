'use strict';

/**
 * EDITH Desktop — Electron Main Process
 *
 * Flow:
 *  1. App starts → spawn backend Node process
 *  2. Watch backend stdout for "BACKEND_READY"
 *  3. Once ready → create BrowserWindow loading frontend/dist/index.html
 *  4. On window close → kill backend process → quit
 */

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, dialog } = require('electron');
const { spawn }     = require('child_process');
const path          = require('path');
const fs            = require('fs');
const https         = require('https');

// ─── Paths ────────────────────────────────────────────────────
const isDev         = process.env.NODE_ENV === 'development' || !app.isPackaged;
const ROOT_DIR      = isDev ? path.join(__dirname, '..') : process.resourcesPath;
const BACKEND_ENTRY = path.join(ROOT_DIR, 'backend', 'dist', 'index.js');
const FRONTEND_DIST = path.join(ROOT_DIR, 'frontend', 'dist', 'index.html');
const APPDATA_DIR   = path.join(
  process.env.APPDATA || 
  (process.platform === 'darwin' 
    ? path.join(process.env.HOME || '', 'Library', 'Application Support') 
    : path.join(process.env.HOME || '', '.config')), 
  'EDITH'
);
const ENV_FILE      = isDev ? path.join(ROOT_DIR, '.env') : path.join(APPDATA_DIR, '.env');
const ICON_PATH     = path.join(__dirname, 'assets', 'icon.ico');

// ─── State ────────────────────────────────────────────────────
let mainWindow   = null;
let backendProc  = null;
let frontendProc = null;
let tray         = null;
let backendReady = false;
let isQuitting   = false;
let isCleanupDone = false;

// Check if launched silently/minimized (startup)
const shouldStartHidden = process.argv.includes('--hidden') || process.argv.includes('--startup');

// Ensure writable AppData directory exists
if (!fs.existsSync(APPDATA_DIR)) {
  try {
    fs.mkdirSync(APPDATA_DIR, { recursive: true });
  } catch (err) {
    console.error('[Electron] Failed to create AppData directory:', err);
  }
}

// Set up logging to %APPDATA%/EDITH/edith.log
const logFilePath = path.join(APPDATA_DIR, 'edith.log');
let logStream = null;
try {
  logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
} catch (err) {
  console.error('[Electron] Failed to create log stream:', err);
}

function writeToLog(level, ...args) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  const logLine = `[${timestamp}] [${level}] ${message}\n`;
  if (logStream) {
    logStream.write(logLine);
  }
  if (process.stdout && typeof process.stdout.write === 'function') {
    process.stdout.write(logLine);
  }
}

// Override console methods
console.log = (...args) => writeToLog('INFO', ...args);
console.error = (...args) => writeToLog('ERROR', ...args);
console.warn = (...args) => writeToLog('WARN', ...args);

console.log('[Electron] EDITH Main Process starting...');
console.log('[Electron] Log file initialized at:', logFilePath);

// Ensure writable .env exists in production
if (!isDev) {
  if (!fs.existsSync(ENV_FILE)) {
    const templateEnv = path.join(process.resourcesPath, '.env');
    const fallbackEnv = path.join(process.resourcesPath, 'app', '.env');
    try {
      if (fs.existsSync(templateEnv)) {
        fs.copyFileSync(templateEnv, ENV_FILE);
        console.log('[Electron] Copied template .env to AppData');
      } else if (fs.existsSync(fallbackEnv)) {
        fs.copyFileSync(fallbackEnv, ENV_FILE);
        console.log('[Electron] Copied fallback template .env to AppData');
      } else {
        console.warn('[Electron] No template .env found to copy');
      }
    } catch (err) {
      console.error('[Electron] Failed to copy template .env:', err);
    }
  }
}

// ─── Prevent second instance ──────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else if (backendReady) {
    createWindow();
  }
});

// ─── Start Backend ────────────────────────────────────────────
function startBackend() {
  if (!fs.existsSync(BACKEND_ENTRY)) {
    dialog.showErrorBox(
      'EDITH — Backend Not Found',
      `Cannot find backend at:\n${BACKEND_ENTRY}\n\nPlease run: cd backend && npm run build`,
    );
    app.quit();
    return;
  }

  // Read .env from root — pass vars to backend via environment
  const backendEnv = {
    ...process.env,
    PORT: '3003',
    NODE_ENV: 'production',
    FRONTEND_URL: 'http://localhost:3002',
    ELECTRON_RUN_AS_NODE: '1', // Ensure Electron runs this as a Node process
  };

  // Load .env file manually if it exists
  if (fs.existsSync(ENV_FILE)) {
    const lines = fs.readFileSync(ENV_FILE, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      // Do not let the .env file override our custom internal ports
      if (key === 'PORT' || key === 'FRONTEND_URL') continue;
      backendEnv[key] = val;
    }
  }

  console.log('[Electron] Spawning backend:', BACKEND_ENTRY);

  backendProc = spawn(process.execPath, [BACKEND_ENTRY], {
    env: backendEnv,
    cwd: path.join(ROOT_DIR, 'backend'),
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true, // Hide backend command prompt window
  });

  // Watch stdout for BACKEND_READY signal
  backendProc.stdout.on('data', (data) => {
    const text = data.toString();
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        console.log('[Backend] ' + trimmed);
      }
    }

    if (!backendReady && text.includes('BACKEND_READY')) {
      backendReady = true;
      console.log('[Electron] Backend ready — starting frontend server...');
      startFrontend();
    }
  });

  backendProc.stderr.on('data', (data) => {
    const text = data.toString();
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        console.error('[Backend ERR] ' + trimmed);
      }
    }
  });

  backendProc.on('exit', (code, signal) => {
    console.log(`[Electron] Backend exited: code=${code} signal=${signal}`);
    if (!isQuitting) {
      dialog.showErrorBox(
        'EDITH — Backend Crashed',
        `The backend process stopped unexpectedly (code ${code}).\n\nCheck the log file in %APPDATA%\\EDITH\\`,
      );
      app.quit();
    }
  });

  // Timeout if backend doesn't start in 30 seconds
  setTimeout(() => {
    if (!backendReady) {
      dialog.showErrorBox(
        'EDITH — Backend Timeout',
        'The backend did not start within 30 seconds.\n\nMake sure your OpenRouter API key is set in the .env file.',
      );
      app.quit();
    }
  }, 30_000);
}

// ─── Start Frontend ───────────────────────────────────────────
function startFrontend() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    // In development, we use Vite dev server which is already running or started manually
    console.log('[Electron] Dev mode: loading Vite dev server directly');
    createWindow();
    return;
  }

  const frontendServer = path.join(ROOT_DIR, 'frontend', 'dist', 'server', 'index.mjs');

  if (!fs.existsSync(frontendServer)) {
    dialog.showErrorBox(
      'EDITH — Frontend Not Found',
      `Cannot find frontend server at:\n${frontendServer}\n\nPlease run: .\\build.ps1`,
    );
    app.quit();
    return;
  }

  const frontendEnv = {
    ...process.env,
    PORT: '3002',
    NODE_ENV: 'production',
    ELECTRON_RUN_AS_NODE: '1',
  };

  console.log('[Electron] Spawning frontend server:', frontendServer);

  frontendProc = spawn(process.execPath, [frontendServer], {
    env: frontendEnv,
    cwd: path.join(ROOT_DIR, 'frontend', 'dist'),
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let frontendReady = false;

  frontendProc.stdout.on('data', (data) => {
    const text = data.toString();
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        console.log('[Frontend] ' + trimmed);
      }
    }

    // Nitro logs address when server starts up (e.g. "Listening on http://localhost:3000")
    if (!frontendReady && text.toLowerCase().includes('listening on')) {
      frontendReady = true;
      console.log('[Electron] Frontend server ready — opening window');
      createWindow();
    }
  });

  frontendProc.stderr.on('data', (data) => {
    const text = data.toString();
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        console.error('[Frontend ERR] ' + trimmed);
      }
    }
  });

  frontendProc.on('exit', (code, signal) => {
    console.log(`[Electron] Frontend server exited: code=${code} signal=${signal}`);
    if (!isQuitting) {
      dialog.showErrorBox(
        'EDITH — Frontend Crashed',
        `The frontend server stopped unexpectedly (code ${code}).`,
      );
      app.quit();
    }
  });

  // Fallback timeout in case Nitro ready log is not caught
  setTimeout(() => {
    if (!frontendReady) {
      frontendReady = true;
      console.log('[Electron] Frontend startup timeout reached — opening window anyway');
      createWindow();
    }
  }, 5000);
}

// ─── Create Main Window ───────────────────────────────────────
function createWindow() {
  const iconExists = fs.existsSync(ICON_PATH);

  mainWindow = new BrowserWindow({
    width:  1400,
    height: 900,
    minWidth:  1024,
    minHeight: 700,
    icon: iconExists ? ICON_PATH : undefined,
    title: 'EDITH — AI Business Hub',
    backgroundColor: '#0f0f1a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    // Remove default menu bar
    autoHideMenuBar: true,
    frame: true,
    show: false, // Don't show until ready-to-show
  });

  // Remove menu bar completely
  mainWindow.setMenu(null);

  // Load the frontend
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadURL('http://localhost:3002');
  }

  // Show window once loaded
  mainWindow.once('ready-to-show', () => {
    if (!shouldStartHidden) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      console.log('[Electron] Started hidden at login — running silently in tray');
    }
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // Open external links in default browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!isQuitting && tray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── System Tray ─────────────────────────────────────────────
function createTray() {
  // Use icon if available, otherwise create a simple placeholder
  let trayIcon;
  if (fs.existsSync(ICON_PATH)) {
    try {
      const img = nativeImage.createFromPath(ICON_PATH);
      if (img && !img.isEmpty()) {
        trayIcon = img.resize({ width: 16, height: 16 });
      } else {
        trayIcon = nativeImage.createEmpty();
      }
    } catch (err) {
      console.error('[Electron] Failed to load/resize tray icon:', err);
      trayIcon = nativeImage.createEmpty();
    }
  } else {
    // 1x1 transparent PNG as fallback
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('EDITH — AI Business Hub');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open EDITH',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Open Data Folder',
      click: () => {
        if (fs.existsSync(APPDATA_DIR)) shell.openPath(APPDATA_DIR);
      },
    },
    {
      label: 'Edit .env Settings',
      click: () => {
        if (fs.existsSync(ENV_FILE)) shell.openPath(ENV_FILE);
        else dialog.showMessageBox({ message: 'No .env file found at: ' + ENV_FILE });
      },
    },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: app.isPackaged ? app.getLoginItemSettings().openAtLogin : false,
      enabled: app.isPackaged,
      click: (menuItem) => {
        if (app.isPackaged) {
          app.setLoginItemSettings({
            openAtLogin: menuItem.checked,
            path: app.getPath('exe'),
            args: ['--hidden']
          });
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit EDITH',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ─── IPC Handlers ─────────────────────────────────────────────
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-data-path', () => path.join(process.env.APPDATA || '', 'EDITH'));
ipcMain.handle('open-data-folder', () => {
  const dir = path.join(process.env.APPDATA || '', 'EDITH');
  if (fs.existsSync(dir)) shell.openPath(dir);
});

// ─── App lifecycle ────────────────────────────────────────────
app.whenReady().then(() => {
  createTray();

  // Configure auto-launch by default on first run of the packaged app
  if (app.isPackaged) {
    const startupFlag = path.join(APPDATA_DIR, '.startup_configured');
    if (!fs.existsSync(startupFlag)) {
      try {
        app.setLoginItemSettings({
          openAtLogin: true,
          path: app.getPath('exe'),
          args: ['--hidden']
        });
        fs.writeFileSync(startupFlag, 'true', 'utf8');
        console.log('[Electron] First-run: Registered with Windows Startup');
      } catch (err) {
        console.error('[Electron] Failed to configure auto-launch:', err);
      }
    }
  }

  startBackend();
});

app.on('before-quit', (e) => {
  if (isCleanupDone) {
    return;
  }

  isQuitting = true;

  // Count active processes to clean up
  let activeProcesses = 0;
  if (backendProc && !backendProc.killed) activeProcesses++;
  if (frontendProc && !frontendProc.killed) activeProcesses++;

  if (activeProcesses > 0) {
    e.preventDefault(); // Stop the exit process temporarily
    console.log('[Electron] Initiating graceful child processes shutdown...');

    let closedCount = 0;
    const checkAllClosed = () => {
      closedCount++;
      if (closedCount >= activeProcesses) {
        console.log('[Electron] All child processes exited cleanly.');
        isCleanupDone = true;
        app.quit();
      }
    };

    if (backendProc && !backendProc.killed) {
      backendProc.kill('SIGTERM');
      backendProc.once('exit', checkAllClosed);
    }
    if (frontendProc && !frontendProc.killed) {
      frontendProc.kill('SIGTERM');
      frontendProc.once('exit', checkAllClosed);
    }

    // Force kill after 5 seconds if they don't exit
    setTimeout(() => {
      if (backendProc && !backendProc.killed) {
        console.log('[Electron] Force killing backend...');
        backendProc.kill('SIGKILL');
      }
      if (frontendProc && !frontendProc.killed) {
        console.log('[Electron] Force killing frontend...');
        frontendProc.kill('SIGKILL');
      }
      isCleanupDone = true;
      app.quit();
    }, 5000);
  } else {
    isCleanupDone = true;
  }
});

app.on('window-all-closed', () => {
  // On Windows, keep running in system tray
  // User must quit via tray menu
  if (process.platform !== 'darwin' && !tray) {
    isQuitting = true;
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
