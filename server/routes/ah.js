// server/routes/ah.js
const express = require('express');
const router = express.Router();
const wowauctions = require('../services/wowauctions');
const turtleDB    = require('../services/turtleDB');

router.get('/item/:itemId', async (req, res) => {
  // raw ID includes the suffix, e.g. "19710:0"
  const rawId = req.params.itemId;
  // take only the number before any colon
  const itemId = rawId.split(':')[0];             
  const realm  = req.query.realm || 'nordanaar';

  console.log(`→ Request for item ${rawId} (using base ${itemId}) on realm ${realm}`);
  try {
    const external = await wowauctions.fetchItem(realm, itemId);
    const metadata = await turtleDB.fetchItemInfo(itemId);
    res.json({ external, metadata });
  } catch (err) {
    console.error(`! Error fetching ${itemId}:`, err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
