import fs from 'node:fs';
import path from 'node:path';
import { ROOT_DIR, shop } from './src/config.js';

const envFile = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const { createApp } = await import('./src/app.js');
const { app, env, secrets, seeded, close } = createApp();

const server = app.listen(env.port, env.host, () => {
  const url = env.siteUrl || `http://localhost:${env.port}`;
  console.log(`\n🍰 ${shop.fullName} rulează la ${url}`);
  console.log(`   Panoul de administrare: ${url}/admin`);
  if (seeded) console.log('   Am încărcat catalogul inițial de produse.');
  const info = secrets.passwordInfo;
  if (!info.fromEnv) {
    if (info.created) console.log(`   Parola de administrare (generată acum): ${secrets.adminPassword}`);
    console.log(`   Parola este salvată în ${info.file}. O poți schimba setând variabila ADMIN_PASSWORD.`);
  }
  console.log('');
});

let closing = false;
function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log(`\nSe oprește serverul (${signal})…`);
  server.close(() => {
    close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
