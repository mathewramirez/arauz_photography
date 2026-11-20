import { motion } from 'framer-motion';

// Texto que aparece letra por letra (by="char") o palabra por palabra (by="word").
// Con inView=true se anima al llegar a la pantalla al hacer scroll.
export default function SplitText({ text, as = 'span', className = '', by = 'char', delay = 0, stagger, inView = false }) {
  const Tag = motion[as];
  const step = stagger ?? (by === 'char' ? 0.035 : 0.09);
  const words = text.split(' ');

  const container = { hidden: {}, show: { transition: { staggerChildren: step, delayChildren: delay } } };
  const item = { hidden: { y: '115%', opacity: 0 }, show: { y: '0%', opacity: 1, transition: { duration: 0.75, ease: [0.2, 0.7, 0.2, 1] } } };

  const trigger = inView
    ? { whileInView: 'show', viewport: { once: true, amount: 0.6 } }
    : { animate: 'show' };

  return (
    <Tag className={className} variants={container} initial="hidden" aria-label={text} {...trigger}>
      {words.map((word, wi) => (
        <span className="split-word" key={wi} aria-hidden="true">
          {(by === 'char' ? Array.from(word) : [word]).map((part, ci) => (
            <span className="split-mask" key={ci}>
              <motion.span className="split-item" variants={item}>{part}</motion.span>
            </span>
          ))}
          {wi < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}
