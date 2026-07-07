// content.js
// Scrapes notifications and alerts from freelance platform DOMs and bridges them to EDITH.

console.log('[EDITH Bridge] Content script loaded.');

// Detect platform name
const isUpwork = window.location.hostname.includes('upwork.com');
const isFiverr = window.location.hostname.includes('fiverr.com');

// ─── Scrapers ──────────────────────────────────────────────────
function getNotificationsCount() {
  try {
    if (isUpwork) {
      // Look for standard Upwork notification badge counters
      const badge = document.querySelector('[data-qa="notification-badge"], .up-nav-badge, [class*="notification-badge"]');
      if (badge) return parseInt(badge.textContent.trim(), 10) || 0;
    } else if (isFiverr) {
      // Fiverr notification counter
      const badge = document.querySelector('.db-badge, .unread-count, [class*="unread-count"]');
      if (badge) return parseInt(badge.textContent.trim(), 10) || 0;
    }
  } catch (err) {
    console.error('[EDITH Bridge] Error scraping notifications:', err);
  }
  return 0;
}

function getMessagesCount() {
  try {
    if (isUpwork) {
      const badge = document.querySelector('[data-qa="navigation-messages-badge"], [class*="messages-badge"]');
      if (badge) return parseInt(badge.textContent.trim(), 10) || 0;
    } else if (isFiverr) {
      const badge = document.querySelector('.message-badge, [class*="message-badge"]');
      if (badge) return parseInt(badge.textContent.trim(), 10) || 0;
    }
  } catch (err) {
    console.error('[EDITH Bridge] Error scraping messages:', err);
  }
  return 0;
}

// Scrape active proposals or notifications
function scanPlatformActivity() {
  const notifs = getNotificationsCount();
  const msgs = getMessagesCount();
  
  const platform = isUpwork ? 'upwork' : 'fiverr';
  
  console.log(`[EDITH Bridge] Synced counts for ${platform}: ${notifs} alerts, ${msgs} messages`);
  
  // Forward to extension background script
  chrome.runtime.sendMessage({
    type: 'SYNC_COUNTS',
    data: {
      platform,
      notificationsCount: notifs,
      messagesCount: msgs,
      url: window.location.href
    }
  });
}

function scrapeVisibleJobs() {
  try {
    if (!isUpwork) return;
    
    const jobTiles = document.querySelectorAll('article.job-tile, [data-test="job-tile-list"] > div, section.card, [class*="job-tile"]');
    if (!jobTiles || jobTiles.length === 0) return;

    const scrapedJobs = [];

    jobTiles.forEach(tile => {
      if (tile.offsetHeight === 0 || tile.offsetWidth === 0) return;

      const titleEl = tile.querySelector('h2.job-tile-title a, h3.job-tile-title a, [data-test="job-title-link"], .job-title a');
      if (!titleEl) return;

      const title = titleEl.textContent.trim();
      const url = titleEl.href || '';
      
      let externalId = '';
      const idMatch = url.match(/_~([a-f0-9]+)/i) || url.match(/\/jobs\/([0-9a-fA-F_~]+)/i);
      if (idMatch && idMatch[1]) {
        externalId = idMatch[1];
      } else {
        externalId = 'up-' + btoa(unescape(encodeURIComponent(title))).slice(0, 12);
      }

      const descEl = tile.querySelector('[data-test="job-description"], .job-description, .up-line-clamp, [class*="description"]');
      const description = descEl ? descEl.textContent.trim() : '';

      const budgetEl = tile.querySelector('[data-test="budget"], [class*="job-tile-budget"], [class*="budget"]');
      const budget = budgetEl ? budgetEl.textContent.trim() : '$500';

      const tagEls = tile.querySelectorAll('a.up-skill-badge, .skills-list a, .up-badge');
      const tags = [];
      tagEls.forEach(badge => {
        const text = badge.textContent.trim();
        if (text) tags.push(text);
      });

      scrapedJobs.push({
        platform: 'upwork',
        externalId,
        title,
        description,
        budget,
        tags,
        url
      });
    });

    if (scrapedJobs.length > 0) {
      console.log(`[EDITH Bridge] Scraped ${scrapedJobs.length} visible jobs from page. Sending to EDITH...`);
      chrome.runtime.sendMessage({
        type: 'SYNC_JOBS',
        data: { jobs: scrapedJobs }
      });
    }
  } catch (err) {
    console.error('[EDITH Bridge] Error scraping visible jobs:', err);
  }
}

// Initial scan and start timer
setTimeout(() => {
  scanPlatformActivity();
  scrapeVisibleJobs();
}, 3000);

setInterval(() => {
  scanPlatformActivity();
  scrapeVisibleJobs();
}, 15000);
