#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parseAux } = require('./parseAux');

const [,, src = 'aux-addon.lua', dest = 'itemLibrary.json'] = process.argv;

const text = fs.readFileSync(path.resolve(src), 'utf8');
const { items } = parseAux(text);
fs.writeFileSync(dest, JSON.stringify(items, null, 2));
console.log(`Wrote ${Object.keys(items).length} items to ${dest}`);

