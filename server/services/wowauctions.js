const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5m

async function fetchItem(realm, itemId) {
  const key = `ah:${realm}:${itemId}`;
  if (cache.has(key)) {
    console.log(`Cache hit for ${key}`);
    return cache.get(key);
  }
  const url = `https://www.wowauctions.net/auctionHouse/turtle-wow/${realm}/mergedAh/${itemId}`;
  console.log(`Scraping WowAuctions URL: ${url}`);

  // Some pages redirect to a slugged URL (e.g. .../item-name-<id>) which
  // axios fails to follow correctly in this environment. Perform the first
  // request with redirects disabled so we can manually follow the provided
  // location header.
  let html;
  try {
    const resp = await axios.get(url, {
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400
    });
    if (resp.status >= 300 && resp.headers.location) {
      const next = resp.headers.location.startsWith('http')
        ? resp.headers.location
        : `https://www.wowauctions.net${resp.headers.location}`;
      console.log(`Following redirect to ${next}`);
      html = (await axios.get(next)).data;
    } else {
      html = resp.data;
    }
  } catch (err) {
    console.error(`Request failed for ${itemId}:`, err.message);
    throw err;
  }
  const $ = cheerio.load(html);
  const avgPrice = parseFloat($('.average-price').text().replace(/\D/g, '')) || 0;
  const listings = $('.listing-row .price')
    .map((i, el) => parseFloat($(el).text().replace(/\D/g, '')))
    .get();
  const volume = listings.length;
  const globalMin = volume ? Math.min(...listings) : null;
  const globalMax = volume ? Math.max(...listings) : null;
  const result = { avgPrice, volume, globalMin, globalMax };
  console.log(`Scraped stats for ${itemId}:`, result);
  cache.set(key, result);
  return result;
}

module.exports = { fetchItem };