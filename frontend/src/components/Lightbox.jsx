import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const variants = {
  enter: (d) => ({ x: d > 0 ? 140 : -140, opacity: 0, scale: 0.94 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (d) => ({ x: d > 0 ? -140 : 140, opacity: 0, scale: 0.94 })
};

// Visor a pantalla completa: flechas, teclado, deslizar con el dedo y miniaturas
export default function Lightbox({ photos, index, setIndex, onClose }) {
  const [dir, setDir] = useState(0);
  const thumbs = useRef(null);
  const n = photos.length;

  const go = useCallback((d) => {
    setDir(d);
    setIndex(i => (i + d + n) % n);
  }, [n, setIndex]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [go, onClose]);

  // Precarga la foto anterior y la siguiente
  useEffect(() => {
    [1, -1].forEach(d => { const p = photos[(index + d + n) % n]; if (p) { const im = new Image(); im.src = p.url; } });
    const el = thumbs.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [index, photos, n]);

  const p = photos[index];
  if (!p) return null;

  return (
    <motion.div
      className="lb"
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
    >
      <button className="lb-btn lb-x" aria-label="Cerrar" onClick={onClose}>×</button>
      {n > 1 && <button className="lb-btn lb-p" aria-label="Anterior" onClick={(e) => { e.stopPropagation(); go(-1); }}>‹</button>}
      {n > 1 && <button className="lb-btn lb-n" aria-label="Siguiente" onClick={(e) => { e.stopPropagation(); go(1); }}>›</button>}

      <div className="lb-stage">
        <AnimatePresence custom={dir} mode="popLayout" initial={false}>
          <motion.img
            key={p.id}
            src={p.url}
            alt={p.title || p.category}
            className="lb-img"
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onClick={(e) => e.stopPropagation()}
            onDragEnd={(_, { offset, velocity }) => {
              if (offset.x < -80 || velocity.x < -500) go(1);
              else if (offset.x > 80 || velocity.x > 500) go(-1);
            }}
          />
        </AnimatePresence>
      </div>

      <div className="lb-info" onClick={(e) => e.stopPropagation()}>
        <div className="lb-cap">{[p.title, p.category].filter(Boolean).join(' · ')}</div>
        {n > 1 && <div className="lb-count">{index + 1} / {n}</div>}
        {n > 1 && (
          <div className="lb-thumbs" ref={thumbs}>
            {photos.map((t, k) => (
              <button
                key={t.id}
                data-active={k === index}
                className={k === index ? 'on' : ''}
                aria-label={`Foto ${k + 1}`}
                onClick={() => { setDir(k > index ? 1 : -1); setIndex(k); }}
              >
                <img src={t.url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
