import { useEffect, useState } from 'react';
import { loadData, DEFAULT_SETTINGS } from './api.js';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Marquee from './components/Marquee.jsx';
import Gallery from './components/Gallery.jsx';
import About from './components/About.jsx';
import Services from './components/Services.jsx';
import Contact from './components/Contact.jsx';

export default function App() {
  const [data, setData] = useState({ photos: [], settings: DEFAULT_SETTINGS });

  useEffect(() => { loadData().then(setData); }, []);

  const { photos, settings } = data;
  const catCount = new Set(photos.map(p => p.category)).size;

  return (
    <>
      <Nav />
      <main>
        <Hero photos={photos} tagline={settings.tagline || DEFAULT_SETTINGS.tagline} />
        <Marquee words={settings.categories} />
        <Gallery photos={photos} settings={settings} />
        <About settings={settings} photoCount={photos.length} catCount={catCount} />
        <Services categories={settings.categories} />
        <Contact settings={settings} />
      </main>
      <footer className="footer">
        <img src="/img/logo-light.png" alt="" />
        <div>© {new Date().getFullYear()} Arauz Photography · Todos los derechos reservados</div>
      </footer>
    </>
  );
}
