const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast = (t) => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 2600); };

let settings = {}, photos = [], queue = []; // queue: {file, url, blob?, status}

async function api(url, opts = {}) {
  const r = await fetch(url, { headers: opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}, ...opts,
    body: opts.body && !(opts.body instanceof FormData) ? JSON.stringify(opts.body) : opts.body });
  if (r.status === 401) { showLogin(); throw new Error('Sesión expirada'); }
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
  await Promise.all([loadSettings(), loadPhotos(), loadMessages()]);
}

// ---------- tabs ----------
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b));
  ['fotos', 'mensajes', 'ajustes'].forEach(t => $('#t-' + t).hidden = t !== b.dataset.t);
});

// ---------- ajustes ----------
async function loadSettings() {
  settings = await api('/api/settings');
  const f = $('#setForm');
  for (const k of ['tagline', 'about', 'whatsapp', 'email', 'instagram', 'facebook', 'location']) f.elements[k].value = settings[k] || '';
  f.elements.categories.value = settings.categories.join(', ');
  fillCats();
}
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

// Reduce a máx. 2400px y calidad 0.85 para ahorrar espacio y acelerar la carga
function optimize(file, max = 2400) {
  return new Promise(res => {
    if (file.type === 'image/gif' || file.size < 400 * 1024) return res(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => res(b && b.size < file.size ? new File([b], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file), 'image/jpeg', 0.85);
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
  // subir por lotes de 5 para no saturar
  let done = 0, failed = 0;
  for (let i = 0; i < files.length; i += 5) {
    const fd = new FormData();
    fd.append('category', cat); fd.append('title', title);
    files.slice(i, i + 5).forEach(f => fd.append('photos', f));
    try { await api('/api/photos', { method: 'POST', body: fd }); done += Math.min(5, files.length - i); }
    catch (err) { failed += Math.min(5, files.length - i); toast(err.message); }
    fill.style.width = Math.round(((i + 5) / files.length) * 100) + '%';
  }
  queue = []; drawQueue(); $('#upTitle').value = '';
  setTimeout(() => { bar.style.display = 'none'; }, 600);
  toast(failed ? `Subidas ${done}, fallaron ${failed}` : `${done} foto(s) subidas ✓`);
  loadPhotos();
};

// ---------- galería ----------
async function loadPhotos() { photos = await api('/api/photos'); drawPhotos(); }
function drawPhotos() {
  $('#count').textContent = photos.length ? `(${photos.length})` : '';
  const cats = [...new Set([...settings.categories, ...photos.map(p => p.category)])];
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
