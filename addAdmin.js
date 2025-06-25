import { kv } from '@vercel/kv';
import crypto from 'crypto';

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: node addAdmin.js <email> <password>');
  process.exit(1);
}

const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

(async () => {
  try {
    const users = (await kv.get('users.json')) || [];
    const norm = email.trim().toLowerCase();
    if (users.some(u => u.email === norm)) {
      console.log('User already exists.');
      return;
    }
    users.push({
      id: Date.now().toString(),
      email: norm,
      passwordHash,
      role: 'admin',
      created: new Date().toISOString(),
      active: true
    });
    await kv.set('users.json', users);
    console.log(`Admin user ${norm} added.`);
  } catch (err) {
    console.error('Failed to add admin user:', err.message);
  }
})();

