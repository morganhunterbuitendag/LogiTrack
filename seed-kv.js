import { kv } from '@vercel/kv';
import fs from 'fs/promises';

const files = [
  'distances.json',
  'producers.json',
  'pending-users.json',
  'reset-tokens.json',
  'users.json'
];

(async () => {
  for (const file of files) {
    try {
      const data = JSON.parse(await fs.readFile(`data/${file}`, 'utf8'));
      await kv.set(file, data);
      console.log(`Seeded ${file}`);
    } catch (err) {
      console.error(`Failed to seed ${file}:`, err.message);
    }
  }
})();
