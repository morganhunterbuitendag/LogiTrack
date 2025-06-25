import express from 'express';
import { kv } from '@vercel/kv';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import fs from 'fs/promises';

// Data is now stored in Vercel KV using the original filenames as keys.
const JWT_SECRET = 'change_this_secret'; // IMPORTANT: Change this and use an environment variable

const useKv = Boolean(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL);

const app = express();
app.use(express.json());
app.use(cookieParser());

// Serve the config file for the frontend
app.get('/config.js', (req, res) => {
  const key = process.env.ORS_KEY || '';
  res.type('application/javascript').send(`window.ORS_KEY=${JSON.stringify(key)};`);
});

// --- Utility Functions ---

async function readArray(file) {
  if (useKv) {
    try {
      const data = await kv.get(file);
      if (Array.isArray(data)) return data;
    } catch (error) {
      console.error(`Error reading ${file} from KV:`, error);
    }
  }
  try {
    const data = JSON.parse(await fs.readFile(file, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`Error reading ${file}:`, err);
    return [];
  }
}

async function writeArray(file, arr) {
  if (useKv) {
    try {
      await kv.set(file, arr);
      return;
    } catch (err) {
      console.error(`Error writing ${file} to KV:`, err);
    }
  }
  await fs.writeFile(file, JSON.stringify(arr, null, 2));
}

async function append(file, obj) {
  const arr = await readArray(file);
  arr.push(obj);
  await writeArray(file, arr);
}


function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function sendEmail(to, subject, text) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST) {
    console.log(`Email sending is not configured. Would send to ${to}: ${text}`);
    return;
  }
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 0),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  await transport.sendMail({ from: SMTP_USER, to, subject, text });
}

// Create a default admin if the user list is empty
async function ensureDefaultAdmin() {
  const users = await readArray('users.json');
  if (users.length === 0) {
    users.push({
      id: Date.now().toString(),
      email: 'admin@example.com',
      passwordHash: sha256('admin123'),
      role: 'admin',
      created: new Date().toISOString(),
      active: true
    });
    await writeArray('users.json', users);
    console.log('Created default admin user admin@example.com / admin123');
  }
}
ensureDefaultAdmin().catch(err => console.error('Failed to ensure admin user:', err));

// --- API Routes ---

app.post('/api/distances', async (req, res) => {
  try {
    const { producer, distances, producerRecord } = req.body || {};
    await append('distances.json', { producer, distances });

    if (producerRecord) {
        const producers = await readArray('producers.json');
        if (!producers.some(p => p.name === producerRecord.name)) {
            producers.push(producerRecord);
            await writeArray('producers.json', producers);
        }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/distances', async (req, res) => {
  try {
    const records = await readArray('distances.json');
    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.delete('/api/distances/:producer', async (req, res) => {
    try {
        const { producer } = req.params;
        let records = await readArray('distances.json');
        records = records.filter(r => r.producer !== producer);
        await writeArray('distances.json', records);

        let prods = await readArray('producers.json');
        prods = prods.filter(p => p.name !== producer);
        await writeArray('producers.json', prods);
        
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});


app.post('/api/pending-users', async (req, res) => {
  try {
    const { email, passwordHash } = req.body || {};
    if (typeof email !== 'string' || typeof passwordHash !== 'string') {
      return res.status(400).json({ error: 'invalid request' });
    }
    const pending = await readArray('pending-users.json');
    const id = Date.now().toString();
    const normEmail = email.trim().toLowerCase();
    pending.push({ id, email: normEmail, passwordHash, requested: new Date().toISOString() });
    await writeArray('pending-users.json', pending);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/pending-users', async (req, res) => {
  try {
    const pending = await readArray('pending-users.json');
    res.json(pending);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/api/pending-users/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const pending = await readArray('pending-users.json');
    const idx = pending.findIndex(p => p.id === id);
    if (idx === -1) return res.sendStatus(404);

    const [record] = pending.splice(idx, 1);
    await writeArray('pending-users.json', pending);

    const users = await readArray('users.json');
    users.push({
      id: record.id,
      email: record.email.toLowerCase(),
      passwordHash: record.passwordHash,
      role: 'member',
      created: new Date().toISOString(),
      active: false
    });
    await writeArray('users.json', users);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/api/pending-users/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    let pending = await readArray('pending-users.json');
    pending = pending.filter(p => p.id !== id);
    await writeArray('pending-users.json', pending);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await readArray('users.json');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/api/users/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const users = await readArray('users.json');
    const user = users.find(u => u.id === id);
    if (!user) return res.sendStatus(404);
    user.active = true;
    await writeArray('users.json', users);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/api/users/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    const users = await readArray('users.json');
    const user = users.find(u => u.id === id);
    if (!user) return res.sendStatus(404);
    user.active = false;
    await writeArray('users.json', users);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/api/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'invalid role' });
    }
    const users = await readArray('users.json');
    const user = users.find(u => u.id === id);
    if (!user) return res.sendStatus(404);
    user.role = role;
    await writeArray('users.json', users);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let users = await readArray('users.json');
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return res.sendStatus(404);
    users.splice(idx, 1);
    await writeArray('users.json', users);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/api/auth/forgot', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (typeof email !== 'string') return res.status(400).json({ error: 'invalid request' });

    const emailNorm = email.trim().toLowerCase();
    const users = await readArray('users.json');
    const user = users.find(u => u.email === emailNorm);
    if (user) {
      const token = generateToken();
      const tokenHash = sha256(token);

      const tokens = await readArray('reset-tokens.json');
      tokens.push({ tokenHash, email: emailNorm, expires: Date.now() + 3600_000 }); // Expires in 1 hour
      await writeArray('reset-tokens.json', tokens);
      
      const link = `${req.protocol}://${req.get('host')}/reset.html?token=${token}`;
      await sendEmail(email, 'Password reset', `Reset your password here: ${link}`);
    }
    res.json({ ok: true }); // Always send a success-like response to prevent email enumeration
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/api/auth/reset', async (req, res) => {
  try {
    const { token, passwordHash } = req.body || {};
    if (typeof token !== 'string' || typeof passwordHash !== 'string') {
      return res.status(400).json({ error: 'invalid request' });
    }
    
    let tokens = await readArray('reset-tokens.json');
    const tokenHash = sha256(token);
    const tokenRecord = tokens.find(t => t.tokenHash === tokenHash && t.expires > Date.now());

    if (!tokenRecord) return res.status(400).json({ error: 'invalid or expired token' });
    
    const email = tokenRecord.email;
    tokens = tokens.filter(t => t.tokenHash !== tokenHash); // Invalidate token after use
    await writeArray('reset-tokens.json', tokens);
    
    const users = await readArray('users.json');
    const user = users.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: 'user not found' });
    
    user.passwordHash = passwordHash;
    await writeArray('users.json', users);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, passwordHash } = req.body || {};
    const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const users = await readArray('users.json');
    const user = users.find(u => u.email === emailNorm);

    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    if (!['member', 'admin'].includes(user.role)) return res.status(403).json({ error: 'account pending approval' });
    if (user.active === false) return res.status(403).json({ error: 'account inactive' });
    if (user.passwordHash !== passwordHash) return res.status(401).json({ error: 'invalid credentials' });

    const token = jwt.sign({ email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    // Use secure cookies only in production so local development over HTTP works
    const secure = process.env.NODE_ENV === 'production';
    res.cookie('auth', token, { httpOnly: true, secure, sameSite: 'strict' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/auth/check', (req, res) => {
  const token = req.cookies.auth;
  if (!token) return res.status(401).end();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ email: payload.email, role: payload.role });
  } catch (err) {
    res.clearCookie('auth');
    res.status(401).end();
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth');
  res.json({ ok: true });
});

app.post('/api/auth/change-password', async (req, res) => {
  const token = req.cookies.auth;
  if (!token) return res.status(401).end();
  
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).end();
  }
  
  const { oldPasswordHash, newPasswordHash } = req.body || {};
  if (typeof oldPasswordHash !== 'string' || typeof newPasswordHash !== 'string') {
    return res.status(400).json({ error: 'invalid request' });
  }
  
  try {
    const users = await readArray('users.json');
    const user = users.find(u => u.email === payload.email);
    if (!user || user.passwordHash !== oldPasswordHash) {
      return res.status(400).json({ error: 'invalid old password' });
    }
    user.passwordHash = newPasswordHash;
    await writeArray('users.json', users);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// --- Static File Serving ---
// This serves all the HTML, JS, and CSS files from the root of your project.
// Middleware to protect HTML pages from unauthenticated access
app.use((req, res, next) => {
  const publicPages = ['/login.html', '/register.html', '/forgot.html', '/reset.html'];
  if (req.path === '/' || req.path.endsWith('.html')) {
    if (!publicPages.includes(req.path) && req.path !== '/') {
      const token = req.cookies.auth;
      if (!token) return res.redirect('/login.html');
      try {
        jwt.verify(token, JWT_SECRET);
      } catch {
        res.clearCookie('auth');
        return res.redirect('/login.html');
      }
    }
  }
  next();
});

// Redirect the root path to the main page when authenticated
app.get('/', (req, res) => {
  const token = req.cookies.auth;
  if (!token) return res.redirect('/login.html');
  try {
    jwt.verify(token, JWT_SECRET);
    return res.redirect('/Index.html');
  } catch {
    res.clearCookie('auth');
    return res.redirect('/login.html');
  }
});

app.use(express.static(process.cwd(), {
    // Set default page to login.html
    index: 'login.html'
}));

// Start the server when run directly (useful for local development)
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3101;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

// Export the app for Vercel
export default app;
