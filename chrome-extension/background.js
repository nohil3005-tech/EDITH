// background.js
// Handles communication between the scrapers on Upwork/Fiverr and the local EDITH backend.

console.log('[EDITH Bridge] Service worker initialized.');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_COUNTS') {
    const { platform, notificationsCount, messagesCount, url } = message.data;
    
    // Push updates directly to EDITH's backend server
    fetch('http://localhost:3001/api/v1/platforms/sync-extension', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'edith-desktop-key'
      },
      body: JSON.stringify({
        platform,
        notificationsCount,
        messagesCount,
        url
      })
    })
    .then(res => res.json())
    .then(data => {
      console.log('[EDITH Bridge] Backend sync successful:', data);
    })
    .catch(err => {
      console.warn('[EDITH Bridge] Connection to EDITH app failed. Make sure EDITH desktop app is running on port 3001.');
    });
  }

  if (message.type === 'SYNC_JOBS') {
    fetch('http://localhost:3001/api/v1/platforms/sync-jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'edith-desktop-key'
      },
      body: JSON.stringify({ jobs: message.data.jobs })
    })
    .then(res => res.json())
    .then(data => {
      console.log('[EDITH Bridge] Backend job sync complete:', data);
    })
    .catch(err => {
      console.warn('[EDITH Bridge] Job sync connection to EDITH failed.');
    });
  }
  
  return true;
});
