const axios = require('axios');
const NodeCache = require('node-cache');
const mock = require('./mockData.json');
const cache = new NodeCache({ stdTTL: 3600 }); // 1h

async function fetchItemInfo(itemId) {
  const key = `item:${itemId}`;
  if (cache.has(key)) {
    console.log(`TurtleDB cache hit for ${key}`);
    return cache.get(key);
  }
  if (process.env.OFFLINE) {
    const metadata = mock.metadata[itemId] || { name: `Item ${itemId}`, quality: 0, icon: null, craftCost: null };
    cache.set(key, metadata);
    return metadata;
  }

  const url = `https://database.turtle-wow.org/?api=model&table=item&id=${itemId}`;
  console.log(`Fetching TurtleDB URL: ${url}`);
  try {
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
  } catch (err) {
    console.error(`Failed to fetch TurtleDB for ${itemId}:`, err.message);
    const metadata = mock.metadata[itemId] || { name: `Item ${itemId}`, quality: 0, icon: null, craftCost: null };
    cache.set(key, metadata);
    return metadata;
  }
}

module.exports = { fetchItemInfo };

