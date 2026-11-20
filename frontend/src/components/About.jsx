import { useEffect, useRef, useState } from 'react';
import { motion, animate, useInView } from 'framer-motion';
import SplitText from './SplitText.jsx';
import Reveal from './Reveal.jsx';

function CountUp({ to }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.6, ease: 'easeOut', onUpdate: (l) => setV(Math.round(l)) });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>{v}</span>;
}

export default function About({ settings, photoCount, catCount }) {
  const about = settings.about || 'Somos un estudio de fotografía dedicado a capturar momentos reales: bodas, retratos, familias y eventos. Cada sesión es una colaboración para que te veas y te sientas tú.';
  return (
    <section id="nosotros" className="section about">
      <div className="wrap about-grid">
        <Reveal className="about-logo">
          <motion.img
            src="/img/logo.png"
            alt="Arauz Photography"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={{ rotate: -6, scale: 1.05 }}
          />
        </Reveal>
        <div>
          <Reveal><div className="eyebrow">Sobre nosotros</div></Reveal>
          <SplitText as="h2" by="word" inView text="Detrás de la cámara" />
          <Reveal delay={0.1}><p className="about-text">{about}</p></Reveal>
          <Reveal delay={0.2} className="stats">
            <div><b><CountUp to={photoCount} /></b><span>Fotos</span></div>
            <div><b><CountUp to={catCount} /></b><span>Categorías</span></div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
