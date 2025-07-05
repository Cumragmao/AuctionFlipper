const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const mock = require('./mockData.json');
const cache = new NodeCache({ stdTTL: 300 }); // 5m

async function fetchItem(realm, itemId) {
  const key = `ah:${realm}:${itemId}`;
  if (cache.has(key)) {
    console.log(`Cache hit for ${key}`);
    return cache.get(key);
  }
  if (process.env.OFFLINE) {
    const result = mock.auction[itemId] || { avgPrice: 0, volume: 0, globalMin: null, globalMax: null };
    cache.set(key, result);
    return result;
  }

  const url = `https://www.wowauctions.net/auctionHouse/turtle-wow/${realm}/mergedAh/${itemId}`;
  console.log(`Scraping WowAuctions URL: ${url}`);
  try {
    const { data: html } = await axios.get(url);
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
  } catch (err) {
    console.error(`Failed to fetch WowAuctions for ${itemId}:`, err.message);
    const result = mock.auction[itemId] || { avgPrice: 0, volume: 0, globalMin: null, globalMax: null };
    cache.set(key, result);
    return result;
  }
}

module.exports = { fetchItem };
