(async () => {
  const fileInput = document.getElementById('fileInput');
  const refreshBtn = document.getElementById('refreshBtn');
  const lastUpdated = document.getElementById('lastUpdated');
  const tbody = document.querySelector('#results tbody');
  let auxText = '';
  let dataMetrics = [];

  fileInput.addEventListener('change', async e => {
    auxText = await e.target.files[0].text();
    console.info('Aux file loaded, size:', auxText.length);
    refreshBtn.disabled = false;
    await loadData();
  });

  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Updating...';
    await loadData();
    refreshBtn.textContent = 'Refresh Data';
    refreshBtn.disabled = false;
  });

  async function loadData() {
    console.group('Data Load');
    console.log('Starting data load...');
    const { history, post } = parseAux(auxText);
    console.log(`History entries: ${Object.keys(history).length}`);
    console.log(`Post entries: ${Object.keys(post).length}`);

    const ids = Object.keys(post);
    const realm = 'nordanaar';

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