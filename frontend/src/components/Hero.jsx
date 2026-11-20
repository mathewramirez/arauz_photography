import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import SplitText from './SplitText.jsx';

// Portada: fondo con parallax y fotos que se alternan, texto animado
export default function Hero({ photos, tagline }) {
  const featured = photos.filter(p => p.featured);
  const pool = (featured.length ? featured : photos).slice(0, 6);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (pool.length < 2) return;
    const t = setInterval(() => setI(n => n + 1), 6500);
    return () => clearInterval(t);
  }, [pool.length]);

  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 900], [0, 280]);
  const bgScale = useTransform(scrollY, [0, 900], [1.05, 1.25]);
  const textY = useTransform(scrollY, [0, 700], [0, 140]);
  const fade = useTransform(scrollY, [0, 520], [1, 0]);
  const current = pool.length ? pool[i % pool.length] : null;

  return (
    <section className="hero" id="inicio">
      <motion.div className="hero-bgwrap" style={{ y: bgY, scale: bgScale }}>
        <AnimatePresence>
          {current && (
            <motion.div
              key={current.url}
              className="hero-bg"
              style={{ backgroundImage: `url("${current.url}")` }}
              initial={{ opacity: 0, scale: 1.14 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
      </motion.div>
      <div className="hero-shade" />

      <motion.div className="hero-in" style={{ y: textY, opacity: fade }}>
        <motion.img
          src="/img/logo-light.png"
          alt="Logo Arauz Photography"
          className="hero-logo"
          initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}
          whileHover={{ rotate: 8, scale: 1.06 }}
        />
        <SplitText as="h1" className="hero-title" text="Arauz Photography" delay={0.35} />
        <SplitText as="p" className="hero-tag" by="word" text={tagline} delay={1.1} stagger={0.07} />
        <motion.div
          className="hero-cta"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7, duration: 0.7 }}
        >
          <motion.a href="#portafolio" className="btn" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>Ver portafolio</motion.a>
          <motion.a href="#contacto" className="btn ghost" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>Reservar sesión</motion.a>
        </motion.div>
      </motion.div>

      <motion.a
        href="#portafolio"
        className="scroll-hint"
        aria-label="Desliza hacia abajo"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8, y: [0, 8, 0] }}
        transition={{ opacity: { delay: 2.2 }, y: { delay: 2.2, duration: 1.8, repeat: Infinity } }}
      >
        Desliza ↓
      </motion.a>
    </section>
  );
}
