// popup.js
// Handles manual triggers and tests inside the extension window.

document.getElementById('btn-sync').addEventListener('click', async () => {
  try {
    const res = await fetch('http://localhost:3001/api/v1/platforms/sync-extension', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'edith-desktop-key'
      },
      body: JSON.stringify({
        platform: 'upwork',
        notificationsCount: 3,
        messagesCount: 2,
        url: 'https://www.upwork.com/ab/find-work/'
      })
    });
    
    if (res.ok) {
      alert('Upwork platform sync successfully triggered!');
    } else {
      alert('Failed to sync. Backend returned error.');
    }
  } catch (err) {
    alert('Error connecting to EDITH backend. Make sure the EDITH desktop app is running.');
  }
});

document.getElementById('btn-mock').addEventListener('click', async () => {
  try {
    const res = await fetch('http://localhost:3001/api/v1/platforms/sync-extension', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'edith-desktop-key'
      },
      body: JSON.stringify({
        platform: 'upwork',
        notificationsCount: 1,
        messagesCount: 1,
        url: 'https://www.upwork.com',
        simulateProposalAcceptance: true
      })
    });
    
    if (res.ok) {
      alert('Mock proposal acceptance notification sent to EDITH! Go to your notifications to review.');
    } else {
      alert('Failed to send mock notification.');
    }
  } catch (err) {
    alert('Error connecting to EDITH. Make sure the EDITH app is running.');
  }
});

document.getElementById('btn-mock-jobs').addEventListener('click', async () => {
  try {
    const res = await fetch('http://localhost:3001/api/v1/platforms/sync-jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'edith-desktop-key'
      },
      body: JSON.stringify({
        jobs: [
          {
            platform: 'upwork',
            externalId: 'mock-ext-1',
            title: 'React Sidebar Sub-Panel Layout developer needed',
            description: 'Looking for a senior developer to build custom React dashboards with collapsible panels, custom scrollbars, and standard Chrome User-Agent configurations inside Electron container wrappers.',
            budget: '$1,200',
            tags: ['React', 'TypeScript', 'Electron', 'TailwindCSS'],
            url: 'https://www.upwork.com/jobs/mock-ext-1'
          },
          {
            platform: 'upwork',
            externalId: 'mock-ext-2',
            title: 'AI Dropshipping Products Search Scraper Integrator',
            description: 'Need a developer to wire up Drizzle SQLite models for AliExpress and TikTok trending feeds with standard CORS headers, local file storage icons, and background worker poll intervals.',
            budget: '$850',
            tags: ['SQLite', 'Express', 'Drizzle ORM', 'Node.js'],
            url: 'https://www.upwork.com/jobs/mock-ext-2'
          }
        ]
      })
    });
    
    if (res.ok) {
      alert('2 Mock Freelance Jobs successfully pushed to EDITH Discover Job Feed! Go to Freelance Studio to view them.');
    } else {
      alert('Failed to push mock jobs.');
    }
  } catch (err) {
    alert('Error connecting to EDITH. Make sure the EDITH app is running.');
  }
});
