require('dotenv/config');
const { getDatabase } = require('./dist/config/database');
const { JobDiscoveryService } = require('./dist/services/freelance/JobDiscoveryService');

async function run() {
  console.log('Initializing JobDiscoveryService...');
  try {
    const discovery = new JobDiscoveryService();
    console.log('Running scan...');
    const result = await discovery.scan({ platforms: ['upwork', 'fiverr'] });
    console.log('Scan complete!');
    console.log('Result:', {
      scanned: result.scanned,
      newJobs: result.newJobs,
      duplicates: result.duplicates,
      errors: result.errors,
      jobsCount: result.jobs?.length
    });
  } catch (err) {
    console.error('Scan crashed with error:', err);
  }
}

run();
