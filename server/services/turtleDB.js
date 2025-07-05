const axios = require('axios');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 }); // 1h

async function fetchItemInfo(itemId) {
  const key = `item:${itemId}`;
  if (cache.has(key)) {
    console.log(`TurtleDB cache hit for ${key}`);
    return cache.get(key);
  }
  const url = `https://database.turtle-wow.org/?api=model&table=item&id=${itemId}`;
  console.log(`Fetching TurtleDB URL: ${url}`);
  const { data } = await axios.get(url);
  const item = data.model || {};
  const metadata = {
    name: item.name || 'Unknown',
    quality: item.quality || 0,
    icon: item.icon || null,
    craftCost: null // TODO
  };
  console.log(`Fetched metadata for ${itemId}:`, metadata);
  cache.set(key, metadata);
  return metadata;
}

module.exports = { fetchItemInfo };