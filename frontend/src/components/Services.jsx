import { motion } from 'framer-motion';
import SplitText from './SplitText.jsx';
import Reveal from './Reveal.jsx';

const DESC = {
  Bodas: 'Cobertura completa de tu día especial, de los preparativos a la última pista de baile.',
  Retratos: 'Sesiones individuales con dirección natural, en estudio o en exteriores.',
  Familia: 'Recuerdos auténticos de quienes más quieres, sin poses forzadas.',
  Eventos: 'Cumpleaños, graduaciones y celebraciones: cada detalle documentado.',
  Comercial: 'Imagen profesional para marcas, productos y equipos.'
};

export default function Services({ categories }) {
  return (
    <section id="servicios" className="section">
      <div className="wrap">
        <div className="center">
          <Reveal><div className="eyebrow">Servicios</div></Reveal>
          <SplitText as="h2" by="word" inView text="Lo que hacemos" />
        </div>
        <div className="services">
          {categories.map((c, i) => (
            <motion.article
              key={c}
              className="svc"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: [0.2, 0.7, 0.2, 1] }}
              whileHover={{ y: -8 }}
            >
              <span className="svc-num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{c}</h3>
              <p>{DESC[c] || 'Cuéntanos tu idea y la hacemos realidad.'}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
