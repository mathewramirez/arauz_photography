
let photos = [], settings = {}, current = 'Todas', shown = [], lbIndex = 0;

async function load() {
  [photos, settings] = await Promise.all([
    fetch('/api/photos').then(r => r.json()),
    fetch('/api/settings').then(r => r.json())
  ]);
  render();
}

function render() {
  $('#tagline').textContent = settings.tagline || '';
  $('#about').textContent = settings.about || '';
  $('#yr').textContent = new Date().getFullYear();

  // filtros
  const used = [...new Set(photos.map(p => p.category))];
  const cats = [...settings.categories.filter(c => used.includes(c)), ...used.filter(c => !settings.categories.includes(c))];
  $('#statPhotos').textContent = photos.length;
  $('#statCats').textContent = cats.length;
  $('#filters').innerHTML = ['Todas', ...cats].map(c => `<button class="chip ${c === current ? 'on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
  $('#filters').hidden = cats.length < 2;
  drawGrid();

  // servicios (a partir de categorías configuradas)
  const desc = {
    Bodas: 'Cobertura completa de tu día especial, de los preparativos a la última pista de baile.',
    Retratos: 'Sesiones individuales con dirección natural, en estudio o en exteriores.',
    Familia: 'Recuerdos auténticos de quienes más quieres, sin poses forzadas.',
    Eventos: 'Cumpleaños, graduaciones y celebraciones: cada detalle documentado.',
    Comercial: 'Imagen profesional para marcas, productos y equipos.'
  };
  $('#services').innerHTML = settings.categories.map(c =>
    `<div class="svc reveal"><h3>${esc(c)}</h3><p>${esc(desc[c] || 'Cuéntanos tu idea y la hacemos realidad.')}</p></div>`).join('');
  $('#typeSel').innerHTML = '<option value="">Tipo de sesión</option>' + settings.categories.map(c => `<option>${esc(c)}</option>`).join('') + '<option>Otro</option>';

  // contacto
  const info = [];
  if (settings.location) info.push(['Ubicación', esc(settings.location)]);
  if (settings.whatsapp) info.push(['WhatsApp', `<a href="https://wa.me/${settings.whatsapp.replace(/\D/g, '')}" target="_blank" rel="noopener">${esc(settings.whatsapp)}</a>`]);
  if (settings.email) info.push(['Correo', `<a href="mailto:${esc(settings.email)}">${esc(settings.email)}</a>`]);
  if (settings.instagram) info.push(['Instagram', `<a href="https://instagram.com/${esc(settings.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener">@${esc(settings.instagram.replace(/^@/, ''))}</a>`]);
  if (settings.facebook) info.push(['Facebook', `<a href="${esc(settings.facebook)}" target="_blank" rel="noopener">${esc(settings.facebook)}</a>`]);
  $('#info').innerHTML = info.map(([k, v]) => `<li><div><small>${k}</small>${v}</div></li>`).join('');

  startHero();
  observe();
}

function drawGrid() {
  shown = current === 'Todas' ? photos : photos.filter(p => p.category === current);
  $('#grid').innerHTML = shown.map((p, i) =>
    `<div class="card" data-i="${i}"><img loading="lazy" src="${esc(p.url)}" alt="${esc(p.title || p.category)}">${p.title ? `<div class="cap">${esc(p.title)}</div>` : ''}</div>`).join('');
  $('#empty').hidden = shown.length > 0;
}

$('#filters').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  current = b.dataset.c;
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
  drawGrid();
});

// Hero con fotos destacadas (o las más recientes)
let heroTimer;
function startHero() {
  clearInterval(heroTimer);
  let pool = photos.filter(p => p.featured);
  if (!pool.length) pool = photos.slice(0, 5);
  if (!pool.length) return;
  const els = [$('#heroA'), $('#heroB')]; let i = 0, which = 0;
  const show = () => {
    const el = els[which];
    el.style.backgroundImage = `url("${pool[i % pool.length].url}")`;
    el.classList.add('on'); els[1 - which].classList.remove('on');
    which = 1 - which; i++;
  };
  show();
  if (pool.length > 1) heroTimer = setInterval(show, 6000);
}

// Lightbox
function openLb(i) {
  lbIndex = (i + shown.length) % shown.length;
  const p = shown[lbIndex];
  $('#lbImg').src = p.url; $('#lbImg').alt = p.title || '';
  $('#lbT').textContent = [p.title, p.category].filter(Boolean).join(' · ');
  $('#lb').classList.add('on');
}
$('#grid').addEventListener('click', e => { const c = e.target.closest('.card'); if (c) openLb(+c.dataset.i); });
$('#lb .x').onclick = () => $('#lb').classList.remove('on');
$('#lb .p').onclick = () => openLb(lbIndex - 1);
$('#lb .n').onclick = () => openLb(lbIndex + 1);
$('#lb').addEventListener('click', e => { if (e.target.id === 'lb') $('#lb').classList.remove('on'); });
document.addEventListener('keydown', e => {
  if (!$('#lb').classList.contains('on')) return;
  if (e.key === 'Escape') $('#lb').classList.remove('on');
  if (e.key === 'ArrowLeft') openLb(lbIndex - 1);
  if (e.key === 'ArrowRight') openLb(lbIndex + 1);
});

// Nav
const nav = $('#nav');
const onScroll = () => {
  const solid = scrollY > 40;
  nav.classList.toggle('solid', solid);
  $('#navLogo').src = solid ? '/img/logo.png' : '/img/logo-light.png';
};
addEventListener('scroll', onScroll, { passive: true }); onScroll();
$('#burger').onclick = () => $('#links').classList.toggle('open');
$('#links').addEventListener('click', e => { if (e.target.tagName === 'A') $('#links').classList.remove('open'); });

// Reveal
function observe() {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
}

// Formulario
$('#cf').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button'); btn.disabled = true;
  const body = Object.fromEntries(new FormData(e.target));
  try {
    const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    e.target.reset();
    $('#cfMsg').innerHTML = '<div class="msg-ok">¡Gracias! Recibimos tu mensaje y te responderemos pronto.</div>';
  } catch (err) {
    $('#cfMsg').innerHTML = `<div class="msg-ok">⚠️ ${esc(err.message || 'No se pudo enviar. Intenta de nuevo.')}</div>`;
  }
  btn.disabled = false;
});

load();
