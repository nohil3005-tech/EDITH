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

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, dialog, session } = require('electron');

// Set user agent globally to standard Chrome to support direct Google logins
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
app.userAgentFallback = USER_AGENT;

// Hide automation flags to bypass bot detections and security gates
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('disable-infobars');

const { spawn, fork } = require('child_process');
const path            = require('path');
const fs              = require('fs');
const https         = require('https');

// ─── Logging Setup ────────────────────────────────────────────
const LOG_DIR = path.join(process.env.APPDATA || app.getPath('userData'), 'EDITH');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
const LOG_FILE = path.join(LOG_DIR, 'edith.log');
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function log(message) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${message}\n`;
  process.stdout.write(line);
  try {
    logStream.write(line);
  } catch (err) {
    // Ignore write errors
  }
}
console.log = log;
console.error = log;


// ─── Paths ────────────────────────────────────────────────────
const isDev         = process.env.NODE_ENV === 'development' || !app.isPackaged;
const ROOT_DIR      = isDev ? path.join(__dirname, '..') : process.resourcesPath;
const BACKEND_ENTRY = path.join(ROOT_DIR, 'backend', 'dist', 'index.js');
const FRONTEND_SERVER_ENTRY = path.join(ROOT_DIR, 'frontend', 'dist', 'server', 'index.mjs');
const ENV_FILE = (() => {
  if (isDev) {
    const desktopEnv = path.join(__dirname, '.env');
    if (fs.existsSync(desktopEnv)) return desktopEnv;
    return path.join(ROOT_DIR, '.env');
  }
  return path.join(process.resourcesPath, '.env');
})();
const ICON_PATH     = path.join(__dirname, 'assets', 'icon.ico');

// ─── State ────────────────────────────────────────────────────
let mainWindow    = null;
let backendProc   = null;
let frontendProc  = null;
let tray          = null;
let backendReady  = false;
let frontendReady = false;
let isQuitting    = false;

// ─── Prevent second instance ──────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
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
    PORT: '3001',
    NODE_ENV: 'production',
    FRONTEND_URL: 'http://localhost:5000',
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

  backendProc = fork(BACKEND_ENTRY, [], {
    execPath: isDev ? 'node' : process.execPath,
    env: backendEnv,
    cwd: path.join(ROOT_DIR, 'backend'),
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    windowsHide: true, // Keep child process hidden
  });

  // Watch stdout for BACKEND_READY signal
  backendProc.stdout.on('data', (data) => {
    const text = data.toString();
    log('[Backend] ' + text.trim());

    if (!backendReady && text.includes('BACKEND_READY')) {
      backendReady = true;
      console.log('[Electron] Backend ready — starting frontend Nitro server...');
      startFrontend();
    }
  });

  backendProc.stderr.on('data', (data) => {
    log('[Backend ERR] ' + data.toString().trim());
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

// ─── Start Frontend Server ────────────────────────────────────
function startFrontend() {
  if (isDev) {
    console.log('[Electron] Running in dev mode, skipping Nitro server spawn.');
    createWindow();
    return;
  }

  if (!fs.existsSync(FRONTEND_SERVER_ENTRY)) {
    dialog.showErrorBox(
      'EDITH — Frontend Server Not Found',
      `Cannot find frontend server at:\n${FRONTEND_SERVER_ENTRY}\n\nPlease build the project before running.`,
    );
    app.quit();
    return;
  }

  console.log('[Electron] Spawning frontend server:', FRONTEND_SERVER_ENTRY);

  frontendProc = fork(FRONTEND_SERVER_ENTRY, [], {
    env: {
      ...process.env,
      PORT: '5000',
      NODE_ENV: 'production',
    },
    cwd: path.join(ROOT_DIR, 'frontend', 'dist'),
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    windowsHide: true,
  });

  // Watch stdout to detect when Nitro starts listening
  frontendProc.stdout.on('data', (data) => {
    const text = data.toString();
    log('[Frontend] ' + text.trim());

    if (!frontendReady && (text.includes('Listening on') || text.includes('http://'))) {
      frontendReady = true;
      console.log('[Electron] Frontend server ready — opening window');
      createWindow();
    }
  });

  frontendProc.stderr.on('data', (data) => {
    log('[Frontend ERR] ' + data.toString().trim());
  });

  frontendProc.on('exit', (code, signal) => {
    console.log(`[Electron] Frontend exited: code=${code} signal=${signal}`);
    if (!isQuitting) {
      dialog.showErrorBox(
        'EDITH — Frontend Server Crashed',
        `The frontend server stopped unexpectedly (code ${code}).`,
      );
      app.quit();
    }
  });

  // Timeout fallback in case stdout doesn't match expected strings
  setTimeout(() => {
    if (!frontendReady) {
      frontendReady = true;
      console.log('[Electron] Frontend ready timeout — opening window');
      createWindow();
    }
  }, 5_000);
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
      webSecurity: false,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    // Remove default menu bar
    autoHideMenuBar: true,
    frame: true,
    show: false, // Don't show until ready-to-show or explicitly opened
  });

  mainWindow.webContents.setUserAgent(USER_AGENT);

  // Bypass X-Frame-Options, Content-Security-Policy, and Cross-Origin policies for direct Google / Upwork logins
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    for (const key of Object.keys(responseHeaders)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'x-frame-options' || 
          lowerKey === 'content-security-policy' || 
          lowerKey === 'cross-origin-opener-policy' || 
          lowerKey === 'cross-origin-embedder-policy') {
        delete responseHeaders[key];
      }
    }
    
    // Add relaxed CORS headers
    responseHeaders['Access-Control-Allow-Origin'] = ['*'];
    responseHeaders['Access-Control-Allow-Headers'] = ['*'];
    responseHeaders['Access-Control-Allow-Methods'] = ['*'];
    
    callback({ cancel: false, responseHeaders });
  });

  // Remove menu bar completely
  mainWindow.setMenu(null);

  // Load the frontend
  if (isDev) {
    // Development: load Vite dev server
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // Production: load locally served Nitro server
    mainWindow.loadURL('http://localhost:5000');
  }

  // Show window once loaded (unless started hidden)
  mainWindow.once('ready-to-show', () => {
    const wasOpenedAtLogin = process.argv.includes('--hidden') || (app.isPackaged ? app.getLoginItemSettings().wasOpenedAtLogin : false);
    if (!wasOpenedAtLogin) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      console.log('[Electron] Started silently in background (hidden)');
    }
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // Open external links in default browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isLocal = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
    const isPlatform = url.includes('upwork.com') || url.includes('fiverr.com') || url.includes('freelancer.com') || url.includes('toptal.com') || url.includes('guru.com') || url.includes('peopleperhour.com') || url.includes('google.com') || url.includes('accounts.google.com');
    
    if (isLocal || isPlatform) {
      return { action: 'allow' };
    }
    
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
    trayIcon = nativeImage.createFromPath(ICON_PATH).resize({ width: 16, height: 16 });
  } else {
    // 1x1 transparent PNG as fallback
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('EDITH — AI Business Hub');

  const openAtLogin = app.isPackaged ? app.getLoginItemSettings().openAtLogin : false;

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
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: openAtLogin,
      click: (menuItem) => {
        if (app.isPackaged) {
          app.setLoginItemSettings({
            openAtLogin: menuItem.checked,
            path: process.execPath,
            args: ['--hidden']
          });
        } else {
          dialog.showMessageBox({
            type: 'info',
            title: 'EDITH Desktop',
            message: 'Auto-startup configuration is only available in packaged production builds.'
          });
          menuItem.checked = false;
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Open Data Folder',
      click: () => {
        const dataDir = path.join(process.env.APPDATA || '', 'EDITH');
        if (fs.existsSync(dataDir)) shell.openPath(dataDir);
      },
    },
    {
      label: 'Edit .env Settings',
      click: () => {
        if (fs.existsSync(ENV_FILE)) shell.openPath(ENV_FILE);
        else dialog.showMessageBox({ message: 'No .env file found at: ' + ENV_FILE });
      },
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

ipcMain.handle('clear-platform-cache', async () => {
  if (session.defaultSession) {
    await session.defaultSession.clearStorageData({
      storages: ['cookies', 'localstorage', 'caches', 'indexdb', 'websql', 'serviceworkers', 'cachestorage']
    });
    console.log('[Electron] Cleared default session storage data (cookies, cache, etc)');
    return true;
  }
  return false;
});

ipcMain.handle('set-platform-cookies', async (event, { url, cookieString }) => {
  if (!session.defaultSession) return false;
  try {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    // Extract base domain e.g. .upwork.com from www.upwork.com
    const domainParts = domain.split('.');
    const baseDomain = domainParts.length > 2 ? `.${domainParts.slice(-2).join('.')}` : `.${domain}`;

    const pairs = cookieString.split(';');
    for (const pair of pairs) {
      const trimmed = pair.trim();
      if (!trimmed) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 1) continue;

      const name = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();

      await session.defaultSession.cookies.set({
        url,
        name,
        value,
        domain: baseDomain,
        path: '/',
        secure: true,
        sameSite: 'no_restriction'
      });
    }
    console.log(`[Electron] Successfully loaded custom cookies for domain: ${baseDomain}`);
    return true;
  } catch (err) {
    console.error('[Electron] Failed to set custom cookies:', err);
    return false;
  }
});

ipcMain.handle('set-user-agent', async (event, userAgent) => {
  if (session.defaultSession && userAgent) {
    session.defaultSession.setUserAgent(userAgent);
    app.userAgentFallback = userAgent;
    console.log('[Electron] Dynamically updated session User-Agent to:', userAgent);
    return true;
  }
  return false;
});

// ─── App lifecycle ────────────────────────────────────────────
app.whenReady().then(() => {
  // Clear service workers and cache storage on startup to avoid cached lock gates
  if (session.defaultSession) {
    session.defaultSession.clearStorageData({
      storages: ['serviceworkers', 'cachestorage']
    }).catch((err) => console.error('[Electron] Failed to clear storage:', err));
  }
  createTray();
  startBackend();
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('session-end', () => {
  isQuitting = true;
  if (backendProc && !backendProc.killed) {
    console.log('[Electron] Windows session ending. Terminating backend gracefully...');
    backendProc.kill('SIGTERM');
  }
  if (frontendProc && !frontendProc.killed) {
    console.log('[Electron] Windows session ending. Terminating frontend server gracefully...');
    frontendProc.kill('SIGTERM');
  }
});

app.on('will-quit', () => {
  // Kill backend and frontend on exit
  if (backendProc && !backendProc.killed) {
    console.log('[Electron] Killing backend...');
    backendProc.kill('SIGTERM');
  }
  if (frontendProc && !frontendProc.killed) {
    console.log('[Electron] Killing frontend...');
    frontendProc.kill('SIGTERM');
  }
  
  // Force kill after 3s if it doesn't exit
  setTimeout(() => {
    if (backendProc && !backendProc.killed) backendProc.kill('SIGKILL');
    if (frontendProc && !frontendProc.killed) frontendProc.kill('SIGKILL');
  }, 3000);
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
