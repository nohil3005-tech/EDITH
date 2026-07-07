const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('https://remoteok.com/api', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    // RemoteOK returns an array where the first element is legal info, others are jobs
    console.log('Success! Found items:', res.data.length, 'First job:', res.data[1]);
  } catch (err) {
    console.error('Error fetching RemoteOK:', err.message);
  }
}

test();
