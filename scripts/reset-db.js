/*
 * Reface baza de date de la zero, cu catalogul inițial de produse.
 * ATENȚIE: șterge toate comenzile, produsele modificate și setările.
 *   npm run db:reset -- --da
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT_DIR, loadEnv } from '../src/config.js';
import { createStore, openDatabase, seedIfEmpty } from '../src/db.js';

const envFile = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

if (!process.argv.includes('--da')) {
  console.log('Această comandă șterge TOATE comenzile, produsele și setările din baza de date.');
  console.log('Dacă ești sigur, rulează: npm run db:reset -- --da');
  process.exit(1);
}

const env = loadEnv();
const file = path.join(env.dataDir, 'cofetarie.db');
for (const suffix of ['', '-wal', '-shm']) fs.rmSync(file + suffix, { force: true });
const db = openDatabase(file);
seedIfEmpty(createStore(db));
db.close();
console.log(`Baza de date a fost refăcută: ${file}`);
