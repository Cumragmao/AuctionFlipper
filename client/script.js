(async () => {
  const fileInput = document.getElementById('fileInput');
  const refreshBtn = document.getElementById('refreshBtn');
  const convertBtn = document.getElementById('convertBtn');
  const formatSelect = document.getElementById('formatSelect');
  const logWindow = document.getElementById('logWindow');
  const lastUpdated = document.getElementById('lastUpdated');
  const tbody = document.querySelector('#results tbody');
  let auxText = '';
  let dataMetrics = [];

  function log(msg) {
    logWindow.textContent += msg + '\n';
  }

  fileInput.addEventListener('change', async e => {
    logWindow.textContent = '';
    auxText = await e.target.files[0].text();
    console.info('Aux file loaded, size:', auxText.length);
    log('File loaded.');
    refreshBtn.disabled = false;
    convertBtn.disabled = false;
    await loadData();
  });

  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Updating...';
    await loadData();
    refreshBtn.textContent = 'Refresh Data';
    refreshBtn.disabled = false;
  });

  convertBtn.addEventListener('click', () => {
    if (!auxText) {
      log('No file loaded.');
      return;
    }
    try {
      const { history, post } = parseAux(auxText);
      const format = formatSelect.value;
      log(`Converting to ${format.toUpperCase()}...`);
      let out = '';
      if (format === 'csv') {
        out += 'item_id,current_price,history\n';
        Object.keys(post).forEach(id => {
          const hist = (history[id] || []).join(';');
          out += `${id},${post[id]},"${hist}"\n`;
        });
      } else {
        Object.keys(post).forEach(id => {
          const hist = (history[id] || []).join(';');
          out += `INSERT INTO items (item_id,current_price,history) VALUES ('${id}',${post[id]},'${hist}');\n`;
        });
      }
      const blob = new Blob([out], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aux-data.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      log('Download started.');
    } catch (err) {
      console.error(err);
      log('Conversion failed: ' + err.message);
    }
  });

  async function loadData() {
    console.group('Data Load');
    console.log('Starting data load...');
    log('Parsing file...');
    const { history, post } = parseAux(auxText);
    log(`History entries: ${Object.keys(history).length}`);
    log(`Post entries: ${Object.keys(post).length}`);

    const ids = Object.keys(post);
    const realm = 'nordanaar';
    log('Fetching external data...');

    dataMetrics = await Promise.all(
      ids.map(async id => {
        const hist = history[id] || [];
        const current = post[id];
        const localMin = hist.length ? Math.min(...hist, current) : current;
        const localMax = hist.length ? Math.max(...hist, current) : current;
        const roiLocal = ((localMax - current) / current) * 100;

        let external, metadata;
        try {
          const resp = await fetch(`/api/ah/item/${id}?realm=${realm}`);
          if (!resp.ok) throw new Error(`Status ${resp.status}`);
          ({ external, metadata } = await resp.json());
        } catch (err) {
          console.error(`Fetch failed for item ${id}:`, err.message);
          log(`Item ${id} failed: ${err.message}`);
          external = { avgPrice:0, volume:0, globalMin:null, globalMax:null };
          metadata = { name:id, quality:0, icon:null, craftCost:null };
        }

        const roiGlobal = external.globalMax
          ? ((external.globalMax - current) / current) * 100
          : 0;
        const craftMargin = metadata.craftCost
          ? current - metadata.craftCost
          : null;

        return {
          id,
          name: metadata.name,
          localCurrent: current,
          localMin,
          localMax,
          globalAvg: external.avgPrice,
          globalVol: external.volume,
          roiLocal,
          roiGlobal,
          craftMargin
        };
      })
    );

    console.log('Completed metric calculations.');
    console.groupEnd();
    renderTable();
    lastUpdated.textContent = `Last updated: ${new Date().toLocaleString()}`;
    console.info('Table updated.');
    log('Table updated.');
  }

  function renderTable() {
    const roiTh = parseFloat(document.getElementById('roiThreshold').value);
    const minVol = parseInt(document.getElementById('minVolume').value, 10);
    tbody.innerHTML = '';

    dataMetrics
      .filter(d => d.roiGlobal - d.roiLocal >= roiTh && d.globalVol >= minVol)
      .forEach(d => {
        const tr = document.createElement('tr');
        [
          d.name,
          d.localCurrent,
          d.localMin,
          d.localMax,
          d.globalAvg,
          d.globalVol,
          d.roiLocal.toFixed(2),
          d.roiGlobal.toFixed(2),
          d.craftMargin != null ? d.craftMargin.toFixed(2) : '-'
        ].forEach(val => {
          const td = document.createElement('td');
          td.textContent = val;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
  }

  function parseAux(text) {
    console.group('Parsing Aux');
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
      console.log(`Found history block (${Object.keys(history).length} items)`);
    } else {
      console.warn('No ["history"] block found');
    }

    const postBlock = /\["post"\]\s*=\s*{([\s\S]*?)\n\s*},/m.exec(text);
    if (postBlock) {
      postBlock[1].split(/[\r\n,]+/).forEach(line => {
        const m = line.match(/\["(\d+:\d+)"\]\s*=\s*"[^\d]*(?:\d+)#([\d.]+)/);
        if (m) post[m[1]] = Number(m[2]);
      });
      console.log(`Found post block (${Object.keys(post).length} items)`);
    } else {
      console.warn('No ["post"] block found');
    }

    console.groupEnd();
    return { history, post };
  }
})();