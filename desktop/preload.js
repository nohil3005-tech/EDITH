'use strict';

/**
 * EDITH Desktop — Preload Script
 * Runs in the renderer context but has access to Node APIs.
 * Exposes a safe, limited API to the frontend via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

contextBridge.exposeInMainWorld('edithDesktop', {
  // App info
  getVersion:     () => ipcRenderer.invoke('get-app-version'),
  getDataPath:    () => ipcRenderer.invoke('get-data-path'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),

  // Platform info
  platform: process.platform,
  isDesktop: true,

  // Clear cache and session storage
  clearCache:     () => ipcRenderer.invoke('clear-platform-cache'),
  setPlatformCookies: (args) => ipcRenderer.invoke('set-platform-cookies', args),
  setUserAgent:   (userAgent) => ipcRenderer.invoke('set-user-agent', userAgent),
  
  // Stealth preload script path
  stealthPath:    `file://${path.join(__dirname, 'stealth.js').replace(/\\/g, '/')}`,

  // Backend URL — always localhost:3001 in desktop mode
  apiBaseUrl: 'http://localhost:3001',
  apiKey: 'edith-desktop-key',
});
