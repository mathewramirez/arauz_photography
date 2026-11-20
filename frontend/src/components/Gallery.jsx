import { useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import SplitText from './SplitText.jsx';
import Reveal from './Reveal.jsx';
import Lightbox from './Lightbox.jsx';

// Tarjeta con inclinación 3D siguiendo el cursor y aparición escalonada
function TiltCard({ photo, index, onOpen }) {
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 220, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 220, damping: 20 });
  const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  const move = (e) => {
    if (!canHover || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  const leave = () => { x.set(0); y.set(0); };

  return (
    <motion.figure
      ref={ref}
      className="card"
      role="button"
      tabIndex={0}
      aria-label={photo.title || `Ver foto de ${photo.category}`}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      onMouseMove={move}
      onMouseLeave={leave}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.7, delay: (index % 6) * 0.07, ease: [0.2, 0.7, 0.2, 1] }}
      whileHover={{ scale: 1.025, zIndex: 2 }}
      whileTap={{ scale: 0.98 }}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
    >
      <img
        src={photo.url}
        alt={photo.title || photo.category}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={loaded ? 'loaded' : ''}
      />
      <figcaption>
        <span>{photo.category}</span>
        {photo.title && <b>{photo.title}</b>}
      </figcaption>
    </motion.figure>
  );
}

export default function Gallery({ photos, settings }) {
  const [current, setCurrent] = useState('Todas');
  const [lb, setLb] = useState(null); // índice abierto en el visor
  const albums = settings.albums || {};

  const used = [...new Set(photos.map(p => p.category))];
  const cats = [
    ...settings.categories.filter(c => used.includes(c) || albums[c]),
    ...used.filter(c => !settings.categories.includes(c))
  ];
  const shown = current === 'Todas' ? photos : photos.filter(p => p.category === current);
  const albumUrl = current !== 'Todas' ? albums[current] : null;

  return (
    <section id="portafolio" className="section">
      <div className="wrap">
        <div className="center">
          <Reveal><div className="eyebrow">Portafolio</div></Reveal>
          <SplitText as="h2" by="word" inView text="Momentos que cuentan historias" />
        </div>

        {cats.length > 1 && (
          <Reveal className="filters">
            {['Todas', ...cats].map(c => (
              <button key={c} className={`chip ${c === current ? 'on' : ''}`} onClick={() => setCurrent(c)}>
                {c === current && <motion.span layoutId="chip-pill" className="chip-pill" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
                <span className="chip-label">{c}</span>
              </button>
            ))}
          </Reveal>
        )}

        <div className="grid" key={current}>
          {shown.map((p, i) => (
            <TiltCard key={p.id} photo={p} index={i} onOpen={() => setLb(i)} />
          ))}
        </div>

        {shown.length === 0 && (
          <Reveal className="empty">Pronto verás aquí nuestro trabajo. ✨</Reveal>
        )}

        {albumUrl && (
          <motion.div className="more" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} key={current + 'more'}>
            <motion.a className="btn green" href={albumUrl} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
              Ver más fotos de {current} →
            </motion.a>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {lb !== null && (
          <Lightbox photos={shown} index={lb} setIndex={setLb} onClose={() => setLb(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}
