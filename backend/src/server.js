// Punto de entrada: arranca el servidor
const app = require('./app');
const cfg = require('./config');

if (cfg.usingDefaultPassword) {
  console.warn('⚠️  ADMIN_PASSWORD no está definida. Usando contraseña temporal "arauz2026". Cámbiala antes de publicar.');
}

const server = app.listen(cfg.PORT, () => {
  console.log(`Arauz Photography → http://localhost:${cfg.PORT}`);
  console.log(`Panel admin       → http://localhost:${cfg.PORT}/admin`);
  console.log(cfg.USE_BLOB ? "Almacenamiento: Vercel Blob" : `Almacenamiento: disco (${cfg.DATA_DIR})`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ El puerto ${cfg.PORT} ya está en uso por otro programa.`);
    console.error('   Usa otro puerto. En PowerShell:  $env:PORT=3001; npm start');
    console.error(`   O cierra el proceso que lo usa:  netstat -ano | findstr :${cfg.PORT}   y luego   taskkill /PID <número> /F\n`);
    process.exit(1);
  }
  throw err;
});
