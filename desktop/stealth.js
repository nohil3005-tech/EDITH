// stealth.js
// This script runs in the guest webview context before any other scripts run.

try {
  // 1. Hide webdriver flag
  Object.defineProperty(navigator, 'webdriver', {
    get: () => false,
    configurable: true
  });

  // 2. Mock chrome object
  window.chrome = {
    runtime: {},
    loadTimes: () => {},
    csi: () => {},
    app: {},
  };

  // 3. Mock standard plugins (so Turnstile sees standard Chrome plugins)
  const mockPlugins = [
    { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
  ];
  
  Object.defineProperty(navigator, 'plugins', {
    get: () => mockPlugins,
    configurable: true
  });

  // 4. Overwrite standard languages
  Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en'],
    configurable: true
  });

  console.log('[EDITH Stealth] Automation protection and browser signatures spoofed.');
} catch (err) {
  console.error('[EDITH Stealth] Failed to apply spoof signatures:', err);
}
