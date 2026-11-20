const toast = (t) => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 2600); };

let settings = {}, photos = [], queue = []; // queue: {file, url, blob?, status}

async function api(url, opts = {}) {
  const r = await fetch(url, { headers: opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}, ...opts,
    body: opts.body && !(opts.body instanceof FormData) ? JSON.stringify(opts.body) : opts.body });
  if (r.status === 401 && !url.includes('/api/login')) { showLogin(); throw new Error('Sesión expirada'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Error');
  return j;
}

// ---------- login ----------
function showLogin() { $('#appView').hidden = true; $('#loginView').hidden = false; }
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault(); $('#loginErr').textContent = '';
  try { await api('/api/login', { method: 'POST', body: { password: $('#pw').value } }); init(); }
  catch (err) { $('#loginErr').textContent = err.message; }
});
$('#logout').onclick = async () => { await fetch('/api/logout', { method: 'POST' }); location.reload(); };

async function init() {
  const me = await fetch('/api/me').then(r => r.json());
  if (!me.admin) return showLogin();
  $('#loginView').hidden = true; $('#appView').hidden = false;
  await loadSettings();
  await Promise.all([loadPhotos(), loadMessages()]);
}

// ---------- tabs ----------
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b));
  ['fotos', 'mensajes', 'ajustes'].forEach(t => $('#t-' + t).hidden = t !== b.dataset.t);
});

// ---------- ajustes ----------
async function loadSettings() {
  settings = await api('/api/settings?fresh=' + Date.now());
  const f = $('#setForm');
  for (const k of ['tagline', 'about', 'whatsapp', 'email', 'instagram', 'facebook', 'location']) f.elements[k].value = settings[k] || '';
  f.elements.categories.value = settings.categories.join(', ');
  albumsDraft = { ...(settings.albums || {}) };
  renderAlbums();
  fillCats();
}
// Campos de enlace de álbum, uno por categoría
let albumsDraft = {};
function renderAlbums() {
  const cats = [...new Set($('#setForm').elements.categories.value.split(',').map(c => c.trim()).filter(Boolean))];
  $('#albumFields').innerHTML = cats.map(c =>
    `<div><label class="l">${esc(c)}</label><input type="url" data-cat="${esc(c)}" placeholder="https://drive.google.com/..." value="${esc(albumsDraft[c] || '')}"></div>`).join('');
}
$('#albumFields').addEventListener('input', e => { if (e.target.dataset.cat) albumsDraft[e.target.dataset.cat] = e.target.value; });
$('#setForm').elements.categories.addEventListener('input', renderAlbums);

function fillCats(extra) {
  const list = [...new Set([...settings.categories, ...(extra || [])])];
  const cur = $('#upCat').value;
  $('#upCat').innerHTML = list.map(c => `<option>${esc(c)}</option>`).join('');
  if (cur && list.includes(cur)) $('#upCat').value = cur;
}
$('#setForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target.elements, body = {};
  for (const k of ['tagline', 'about', 'whatsapp', 'email', 'instagram', 'facebook', 'location']) body[k] = f[k].value;
  body.categories = f.categories.value.split(',');
  body.albums = albumsDraft;
  try { settings = await api('/api/settings', { method: 'PUT', body }); fillCats(); drawPhotos(); toast('Ajustes guardados ✓'); } catch (err) { toast(err.message); }
});

// ---------- subida ----------
const drop = $('#drop'), fileIn = $('#file');
drop.onclick = () => fileIn.click();
fileIn.onchange = () => addFiles(fileIn.files);
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));

function addFiles(files) {
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    if (queue.length >= 30) { toast('Máximo 30 fotos por subida'); break; }
    queue.push({ file: f, url: URL.createObjectURL(f), status: '' });
  }
  fileIn.value = ''; drawQueue();
}
function drawQueue() {
  $('#queue').innerHTML = queue.map((q, i) => `<div class="q"><img src="${q.url}" alt=""><button class="rm" data-i="${i}" title="Quitar">×</button>${q.status ? `<div class="st">${q.status}</div>` : ''}</div>`).join('');
  $('#upBtn').disabled = !queue.length;
}
$('#queue').addEventListener('click', e => { const b = e.target.closest('.rm'); if (b) { queue.splice(+b.dataset.i, 1); drawQueue(); } });

// Reduce a máx. 2400px y comprime para quedar bajo ~3.8 MB (límite de Vercel: 4.5 MB por petición)
const MAX_BYTES = 3.8 * 1024 * 1024;
function optimize(file, max = 2400) {
  return new Promise(res => {
    if (file.type === 'image/gif' || file.size < 400 * 1024) return res(file);
    const img = new Image();
    img.onload = async () => {
      let dim = max, q = 0.85, out = null;
      for (let i = 0; i < 8; i++) {
        const s = Math.min(1, dim / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        out = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
        if (!out || out.size <= MAX_BYTES) break;
        if (q > 0.6) q -= 0.1; else dim = Math.round(dim * 0.8);
      }
      if (out && (out.size < file.size || file.size > MAX_BYTES)) res(new File([out], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
      else res(file);
    };
    img.onerror = () => res(file);
    img.src = URL.createObjectURL(file);
  });
}

$('#upBtn').onclick = async () => {
  if (!queue.length) return;
  $('#upBtn').disabled = true;
  const bar = $('#bar'), fill = bar.querySelector('i'); bar.style.display = 'block'; fill.style.width = '0';
  const cat = $('#upCat').value, title = $('#upTitle').value;
  const files = [];
  for (let i = 0; i < queue.length; i++) {
    queue[i].status = 'Optimizando…'; drawQueue();
    files.push(await optimize(queue[i].file));
  }
  // una foto por petición (más fiable y compatible con el límite de Vercel)
  let done = 0, failed = 0;
  for (let i = 0; i < files.length; i++) {
    if (files[i].size > 4.4 * 1024 * 1024) { failed++; toast(`"${files[i].name}" pesa demasiado, prueba con otra`); continue; }
    const fd = new FormData();
    fd.append('category', cat); fd.append('title', title);
    fd.append('photos', files[i]);
    try { await api('/api/photos', { method: 'POST', body: fd }); done++; }
    catch (err) { failed++; toast(err.message); }
    fill.style.width = Math.round(((i + 1) / files.length) * 100) + '%';
  }
  queue = []; drawQueue(); $('#upTitle').value = '';
  setTimeout(() => { bar.style.display = 'none'; }, 600);
  toast(failed ? `Subidas ${done}, fallaron ${failed}` : `${done} foto(s) subidas ✓`);
  loadPhotos();
};

// ---------- galería ----------
async function loadPhotos() { photos = await api('/api/photos?fresh=' + Date.now()); drawPhotos(); }
function drawPhotos() {
  $('#count').textContent = photos.length ? `(${photos.length})` : '';
  const cats = [...new Set([...(settings.categories || []), ...photos.map(p => p.category)])];
  $('#mgrid').innerHTML = photos.length ? photos.map(p => `
    <div class="m" data-id="${p.id}">
      <div class="im"><img loading="lazy" src="${esc(p.url)}" alt=""></div>
      <div class="bd">
        <input class="ti" value="${esc(p.title)}" placeholder="Título" maxlength="120">
        <select class="ca">${cats.map(c => `<option ${c === p.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
        <div class="ac">
          <button class="mini fe ${p.featured ? 'on' : ''}">⭐ Portada</button>
          <button class="mini del">Eliminar</button>
        </div>
      </div>
    </div>`).join('') : '<p style="color:var(--muted)">Aún no hay fotos. ¡Sube las primeras arriba!</p>';
}
$('#mgrid').addEventListener('change', e => {
  const card = e.target.closest('.m'); if (!card) return;
  const body = e.target.classList.contains('ti') ? { title: e.target.value } : { category: e.target.value };
  api('/api/photos/' + card.dataset.id, { method: 'PATCH', body }).then(() => toast('Guardado ✓')).catch(err => toast(err.message));
});
$('#mgrid').addEventListener('click', async e => {
  const card = e.target.closest('.m'); if (!card) return;
  const id = card.dataset.id, p = photos.find(x => x.id === id);
  try {
    if (e.target.closest('.fe')) {
      const r = await api('/api/photos/' + id, { method: 'PATCH', body: { featured: !p.featured } });
      p.featured = r.featured; e.target.closest('.fe').classList.toggle('on', r.featured); toast(r.featured ? 'Añadida a la portada' : 'Quitada de la portada');
    } else if (e.target.closest('.del')) {
      if (!confirm('¿Eliminar esta foto? No se puede deshacer.')) return;
      await api('/api/photos/' + id, { method: 'DELETE' });
      photos = photos.filter(x => x.id !== id); drawPhotos(); toast('Foto eliminada');
    }
  } catch (err) { toast(err.message); }
});

// ---------- mensajes ----------
async function loadMessages() {
  const msgs = await api('/api/messages');
  const unread = msgs.filter(m => !m.read).length;
  $('#badge').hidden = !unread; $('#badge').textContent = unread;
  $('#msgs').innerHTML = msgs.length ? msgs.map(m => `
    <div class="msg ${m.read ? '' : 'new'}" data-id="${m.id}">
      <div class="h"><b>${esc(m.name)}</b><span>${new Date(m.createdAt).toLocaleString('es-CR')}</span></div>
      <div class="h"><span>${esc(m.contact)}</span><span>${esc([m.type, m.date].filter(Boolean).join(' · '))}</span></div>
      <p>${esc(m.message)}</p>
      <button class="mini rd">${m.read ? 'Marcar como nuevo' : 'Marcar como leído'}</button>
      <button class="mini del">Eliminar</button>
    </div>`).join('') : '<p style="color:var(--muted)">Todavía no hay mensajes.</p>';
  $('#msgs').msgs = msgs;
}
$('#msgs').addEventListener('click', async e => {
  const card = e.target.closest('.msg'); if (!card) return;
  const m = $('#msgs').msgs.find(x => x.id === card.dataset.id);
  try {
    if (e.target.closest('.rd')) await api('/api/messages/' + m.id, { method: 'PATCH', body: { read: !m.read } });
    else if (e.target.closest('.del')) { if (!confirm('¿Eliminar este mensaje?')) return; await api('/api/messages/' + m.id, { method: 'DELETE' }); }
    else return;
    loadMessages();
  } catch (err) { toast(err.message); }
});

init();
