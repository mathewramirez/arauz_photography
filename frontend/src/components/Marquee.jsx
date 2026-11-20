// Cinta de palabras que se desplaza sola; se detiene al pasar el cursor
export default function Marquee({ words }) {
  const list = words.length ? words : ['Fotografía'];
  const row = [...list, ...list, ...list, ...list];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[0, 1].map(k => (
          <div className="marquee-row" key={k}>
            {row.map((w, i) => (<span key={i}>{w}<b>✦</b></span>))}
          </div>
        ))}
      </div>
    </div>
  );
}
