function parseAux(text) {
  const history = {};
  const post = {};
  const items = {};

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

  const itemsBlock = /\["items"\]\s*=\s*{([\s\S]*?)\n\s*},/m.exec(text);
  if (itemsBlock) {
    itemsBlock[1].split(/\r?\n/).forEach(line => {
      const m = line.match(/\[(\d+)\]\s*=\s*"([^"]+)"/);
      if (m) {
        const id = m[1];
        const parts = m[2].split('#');
        items[id] = {
          name: parts[0] || '',
          quality: Number(parts[1]) || 0,
          level: Number(parts[2]) || 0,
          class: parts[3] || '',
          subClass: parts[4] || '',
          invType: parts[5] || '',
          stack: Number(parts[6]) || 0,
          icon: parts[7] || ''
        };
      }
    });
  }

  const idsBlock = /\["item_ids"\]\s*=\s*{([\s\S]*?)\n\s*},/m.exec(text);
  if (idsBlock) {
    idsBlock[1].split(/\r?\n/).forEach(line => {
      const m = line.match(/\["([^\"]+)"\]\s*=\s*(\d+)/);
      if (m) {
        const name = m[1];
        const id = m[2];
        if (!items[id]) items[id] = { name };
        else if (!items[id].name) items[id].name = name;
      }
    });
  }

  return { history, post, items };
}

module.exports = { parseAux };
