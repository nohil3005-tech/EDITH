const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  try {
    const res = await axios.get('https://weworkremotely.com/remote-jobs.rss', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const $ = cheerio.load(res.data, { xmlMode: true });
    const items = [];
    $('item').each((i, el) => {
      if (i < 3) {
        items.push({
          title: $(el).find('title').text(),
          pubDate: $(el).find('pubDate').text(),
        });
      }
    });
    console.log('Success! Found items:', items);
  } catch (err) {
    console.error('Error fetching RSS:', err.message);
  }
}

test();
