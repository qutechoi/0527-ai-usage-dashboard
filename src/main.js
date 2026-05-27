const { app, BrowserWindow, shell, ipcMain, Menu } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'usage-sources.json');
const DEFAULT_REFRESH_MS = 60_000;
const childWindows = new Map();

function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.sources) || parsed.sources.length === 0) {
    throw new Error('usage-sources.json must include at least one source');
  }
  return {
    refreshIntervalMs: Number(parsed.refreshIntervalMs) || DEFAULT_REFRESH_MS,
    window: parsed.window || {},
    sources: parsed.sources.map((source) => ({
      id: String(source.id),
      label: String(source.label || source.id),
      url: String(source.url),
      accent: String(source.accent || '#7dd3fc'),
      patterns: Array.isArray(source.patterns) ? source.patterns.map(String) : [],
    })),
  };
}

function createMainWindow() {
  const config = loadConfig();
  const win = new BrowserWindow({
    width: Number(config.window.width) || 380,
    height: Number(config.window.height) || 620,
    minWidth: 330,
    minHeight: 440,
    alwaysOnTop: config.window.alwaysOnTop !== false,
    title: 'AI Usage Monitor',
    backgroundColor: '#0c1017',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer.html'));
  return win;
}

function sourceById(id) {
  return loadConfig().sources.find((source) => source.id === id);
}

function createUsageWindow(source) {
  const existing = childWindows.get(source.id);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return existing;
  }

  const win = new BrowserWindow({
    width: 1120,
    height: 820,
    title: `${source.label} Usage`,
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'persist:ai-usage-monitor',
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('closed', () => childWindows.delete(source.id));
  childWindows.set(source.id, win);
  win.loadURL(source.url);
  return win;
}

function normalizeWhitespace(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function extractMatches(text, patterns) {
  const normalized = normalizeWhitespace(text);
  const snippets = [];
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern, 'ig');
      const matches = normalized.match(regex) || [];
      for (const match of matches.slice(0, 4)) {
        const clean = normalizeWhitespace(match);
        if (clean && !snippets.includes(clean)) snippets.push(clean);
      }
    } catch (error) {
      snippets.push(`Invalid pattern: ${pattern}`);
    }
  }
  return snippets.slice(0, 8);
}

async function snapshotSource(id) {
  const source = sourceById(id);
  if (!source) throw new Error(`Unknown source: ${id}`);

  const win = createUsageWindow(source);
  if (win.webContents.isLoading()) {
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 8000);
      win.webContents.once('did-finish-load', () => {
        clearTimeout(timer);
        resolve();
      });
      win.webContents.once('did-fail-load', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  const pageState = await win.webContents.executeJavaScript(`(() => {
    const body = document.body ? document.body.innerText : '';
    return {
      title: document.title,
      url: location.href,
      bodyText: body.slice(0, 30000),
      loginLikely: /sign in|log in|로그인|계속하려면|continue/i.test(body),
      capturedAt: new Date().toISOString()
    };
  })()`, true);

  return {
    id: source.id,
    label: source.label,
    url: pageState.url || source.url,
    title: pageState.title || source.label,
    capturedAt: pageState.capturedAt,
    loginLikely: Boolean(pageState.loginLikely),
    snippets: extractMatches(pageState.bodyText, source.patterns),
    visibleTextPreview: normalizeWhitespace(pageState.bodyText).slice(0, 260),
  };
}

ipcMain.handle('config:get', () => loadConfig());
ipcMain.handle('source:open', (_event, id) => {
  const source = sourceById(id);
  if (!source) throw new Error(`Unknown source: ${id}`);
  createUsageWindow(source);
  return true;
});
ipcMain.handle('source:snapshot', (_event, id) => snapshotSource(id));
ipcMain.handle('source:snapshotAll', async () => {
  const { sources } = loadConfig();
  const results = [];
  for (const source of sources) {
    try {
      results.push({ ok: true, data: await snapshotSource(source.id) });
    } catch (error) {
      results.push({ ok: false, id: source.id, error: error.message });
    }
  }
  return results;
});
ipcMain.handle('app:toggleAlwaysOnTop', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const next = !win.isAlwaysOnTop();
  win.setAlwaysOnTop(next);
  return next;
});
ipcMain.handle('app:openConfig', () => shell.openPath(CONFIG_PATH));

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
