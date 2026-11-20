import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SplitText from './SplitText.jsx';
import Reveal from './Reveal.jsx';
import { sendContact } from '../api.js';

export default function Contact({ settings }) {
  const [status, setStatus] = useState('idle'); // idle | sending | ok | error
  const [error, setError] = useState('');
  const ig = (settings.instagram || '').replace(/^@/, '');

  const info = [
    settings.location && ['Ubicación', settings.location],
    settings.whatsapp && ['WhatsApp', <a key="w" href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">{settings.whatsapp}</a>],
    settings.email && ['Correo', <a key="e" href={`mailto:${settings.email}`}>{settings.email}</a>],
    ig && ['Instagram', <a key="i" href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer">@{ig}</a>],
    settings.facebook && ['Facebook', <a key="f" href={settings.facebook} target="_blank" rel="noopener noreferrer">{settings.facebook}</a>]
  ].filter(Boolean);

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus('sending'); setError('');
    try {
      await sendContact(Object.fromEntries(new FormData(form)));
      form.reset();
      setStatus('ok');
    } catch (err) {
      setError(err.message); setStatus('error');
    }
  }

  return (
    <section id="contacto" className="section contact">
      <div className="wrap contact-grid">
        <div>
          <Reveal><div className="eyebrow">Contacto</div></Reveal>
          <SplitText as="h2" by="word" inView text="Reservemos tu sesión" />
          <Reveal delay={0.1}><p>Cuéntanos qué tienes en mente y te respondemos lo antes posible.</p></Reveal>
          <ul className="info">
            {info.map(([k, v], i) => (
              <Reveal as="li" key={k} delay={0.1 + i * 0.07} y={16}>
                <small>{k}</small>{v}
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal delay={0.1}>
          <form className="cf" onSubmit={onSubmit}>
            <div className="row">
              <input name="name" placeholder="Tu nombre" required maxLength={100} />
              <input name="contact" placeholder="Correo o WhatsApp" required maxLength={120} />
            </div>
            <div className="row">
              <select name="type" defaultValue="">
                <option value="">Tipo de sesión</option>
                {settings.categories.map(c => <option key={c}>{c}</option>)}
                <option>Otro</option>
              </select>
              <input name="date" placeholder="Fecha aproximada (opcional)" maxLength={40} />
            </div>
            <textarea name="message" rows={5} placeholder="Cuéntanos sobre tu sesión o evento" required maxLength={3000} />
            <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <motion.button className="btn" type="submit" disabled={status === 'sending'} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              {status === 'sending' ? 'Enviando…' : 'Enviar mensaje'}
            </motion.button>
            <AnimatePresence mode="wait">
              {status === 'ok' && (
                <motion.div key="ok" className="msg-ok" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  ✓ ¡Gracias! Recibimos tu mensaje y te responderemos pronto.
                </motion.div>
              )}
              {status === 'error' && (
                <motion.div key="err" className="msg-ok" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  ⚠️ {error}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
