// Comunicación con el backend (/api)
export const DEFAULT_SETTINGS = {
  tagline: 'Fotografía que guarda lo que importa',
  about: '',
  email: '', whatsapp: '', instagram: '', facebook: '',
  location: '',
  categories: ['Bodas', 'Retratos', 'Familia', 'Eventos', 'Comercial'],
  albums: {}
};

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// Si la API falla, el sitio igual se muestra (sin fotos)
export async function loadData() {
  try {
    const [photos, settings] = await Promise.all([getJSON('/api/photos'), getJSON('/api/settings')]);
    return { photos, settings: { ...DEFAULT_SETTINGS, ...settings } };
  } catch {
    return { photos: [], settings: DEFAULT_SETTINGS };
  }
}

export async function sendContact(body) {
  const r = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'No se pudo enviar. Intenta de nuevo.');
  return j;
}
