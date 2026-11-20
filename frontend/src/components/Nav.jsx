import { useState } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';

const LINKS = [
  ['Portafolio', '#portafolio'],
  ['Nosotros', '#nosotros'],
  ['Servicios', '#servicios']
];

export default function Nav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (y) => setSolid(y > 40));

  return (
    <motion.header
      className={`nav ${solid ? 'solid' : ''}`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <div className="wrap nav-in">
        <a href="#inicio" className="brand" onClick={() => setOpen(false)}>
          <img src={solid || open ? '/img/logo.png' : '/img/logo-light.png'} alt="" />
          <span>Arauz Photography</span>
        </a>

        <nav className="links">
          {LINKS.map(([label, href]) => (
            <a key={href} href={href} className="link">{label}</a>
          ))}
          <a href="#contacto" className="btn-sm">Reservar</a>
        </nav>

        <button className={`burger ${open ? 'open' : ''}`} aria-label="Menú" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          <i /><i /><i />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            className="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {[...LINKS, ['Reservar', '#contacto']].map(([label, href], i) => (
              <motion.a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                {label}
              </motion.a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
