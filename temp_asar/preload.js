'use strict';

/**
 * EDITH Desktop — Preload Script
 * Runs in the renderer context but has access to Node APIs.
 * Exposes a safe, limited API to the frontend via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('edithDesktop', {
  // App info
  getVersion:     () => ipcRenderer.invoke('get-app-version'),
  getDataPath:    () => ipcRenderer.invoke('get-data-path'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),

  // Platform info
  platform: process.platform,
  isDesktop: true,

  // Backend URL — always localhost:3003 in desktop mode
  apiBaseUrl: 'http://localhost:3003',
  apiKey: 'edith-desktop-key',
});
