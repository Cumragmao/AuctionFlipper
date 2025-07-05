#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { fetchItem } = require('./server/services/wowauctions');
const { fetchItemInfo } = require('./server/services/turtleDB');
const luaJson = require('./server/node_modules/lua-json');

function parseAux(text) {
  const tableStr = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const data = luaJson.parse('return ' + tableStr);

  const history = {};
  const post = {};

  const collect = (obj) => {
    if (!obj) return;
    if (obj.post) {
      for (const [id, val] of Object.entries(obj.post)) {
        const parts = String(val).split('#');
        const buyout = parseFloat(parts[2] || parts[1]);
        if (!isNaN(buyout) && buyout > 0) post[id] = buyout;
      }
    }
    if (obj.history) {
      for (const [id, val] of Object.entries(obj.history)) {
        const nums = String(val)
          .split(/[#@;]/)
          .map(Number)
          .filter(n => !isNaN(n) && n < 1e7 && n > 0);
        if (!history[id]) history[id] = [];
        history[id].push(...nums);
      }
    }
  };

  if (data.faction) Object.values(data.faction).forEach(collect);
  if (data.character) Object.values(data.character).forEach(collect);

  return { history, post };
}

async function main() {
  const [,, filePath, realm = 'nordanaar'] = process.argv;
  if (!filePath) {
    console.error('Usage: node cli.js <aux-addon.lua> [realm]');
    process.exit(1);
  }

  const auxText = fs.readFileSync(path.resolve(filePath), 'utf8');
  const { history, post } = parseAux(auxText);
  const ids = Object.keys(post);

  const results = [];
  for (const id of ids) {
    const baseId = id.split(':')[0];
    const hist = history[id] || [];
    const current = post[id];
    if (!current || current <= 0) continue;
    const values = hist.concat(current).filter(n => n > 0);
    const localMin = values.length ? Math.min(...values) : current;
    const localMax = values.length ? Math.max(...values) : current;
    const roiLocal = current > 0 ? ((localMax - current) / current) * 100 : 0;

    let external, metadata;
    try {
      external = await fetchItem(realm, baseId);
      metadata = await fetchItemInfo(baseId);
    } catch (err) {
      console.error(`Fetch failed for item ${id}:`, err.message);
      external = { avgPrice:0, volume:0, globalMin:null, globalMax:null };
      metadata = { name:id, quality:0, icon:null, craftCost:null };
    }

    const roiGlobal = external.globalMax && current > 0
      ? ((external.globalMax - current) / current) * 100
      : 0;

    results.push({
      id,
      name: metadata.name,
      localCurrent: current,
      localMin,
      localMax,
      globalAvg: external.avgPrice,
      globalVol: external.volume,
      roiLocal,
      roiGlobal
    });
  }

  results.sort((a, b) => b.roiGlobal - a.roiGlobal);

  console.log('Item | Local | ROI Local | ROI Global | Global Vol');
  console.log('---------------------------------------------------');
  results.forEach(r => {
    console.log(`${r.name} (${r.id}) | ${r.localCurrent} | ${r.roiLocal.toFixed(2)}% | ${r.roiGlobal.toFixed(2)}% | ${r.globalVol}`);
  });
}

main();
