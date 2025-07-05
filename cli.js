#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { fetchItem } = require('./server/services/wowauctions');
const { fetchItemInfo } = require('./server/services/turtleDB');

function parseAux(text) {
  const history = {};
  const post = {};

  const histBlock = /\["history"\]\s*=\s*{([\s\S]*?)\n\s*},/m.exec(text);
  if (histBlock) {
    histBlock[1].split(/[\r\n,]+/).forEach(line => {
      const m = line.match(/\["(\d+:\d+)"\]\s*=\s*"[^\d]*(\d+)(?:#|$)/);
      if (m) {
        history[m[1]] = history[m[1]] || [];
        history[m[1]].push(Number(m[2]));
      }
    });
  }

  const postBlock = /\["post"\]\s*=\s*{([\s\S]*?)\n\s*},/m.exec(text);
  if (postBlock) {
    postBlock[1].split(/[\r\n,]+/).forEach(line => {
      const m = line.match(/\["(\d+:\d+)"\]\s*=\s*"[^\d]*(?:\d+)#([\d.]+)/);
      if (m) post[m[1]] = Number(m[2]);
    });
  }
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
    const localMin = hist.length ? Math.min(...hist, current) : current;
    const localMax = hist.length ? Math.max(...hist, current) : current;
    const roiLocal = ((localMax - current) / current) * 100;

    let external, metadata;
    try {
      external = await fetchItem(realm, baseId);
      metadata = await fetchItemInfo(baseId);
    } catch (err) {
      console.error(`Fetch failed for item ${id}:`, err.message);
      external = { avgPrice:0, volume:0, globalMin:null, globalMax:null };
      metadata = { name:id, quality:0, icon:null, craftCost:null };
    }

    const roiGlobal = external.globalMax
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
