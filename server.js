import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const PORT = process.env.PORT || 3101;
const DATA_DIR = path.join(process.cwd(), 'data');
const JWT_SECRET = 'change_this_secret';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get('/config.js', (req, res) => {
  const key = process.env.ORS_KEY || '';
  res.type('application/javascript').send(`window.ORS_KEY=${JSON.stringify(key)};`);
});

async function ensureDir(){
  await fs.mkdir(DATA_DIR, {recursive: true});
}

async function append(file, obj){
  await ensureDir();
  const filePath = path.join(DATA_DIR, file);
  let arr = [];
  try{
    arr = JSON.parse(await fs.readFile(filePath, 'utf8'));
    if(!Array.isArray(arr)) arr = [];
  }catch{}
  arr.push(obj);
  await fs.writeFile(filePath, JSON.stringify(arr, null, 2));
}

async function readArray(file){
  await ensureDir();
  const filePath = path.join(DATA_DIR, file);
  try{
    const data = JSON.parse(await fs.readFile(filePath,'utf8'));
    return Array.isArray(data)?data:[];
  }catch{
    return [];
  }
}

async function writeArray(file, arr){
  await ensureDir();
  const filePath = path.join(DATA_DIR, file);
  await fs.writeFile(filePath, JSON.stringify(arr, null, 2));
}

function generateToken(){
  return crypto.randomBytes(32).toString('hex');
}

function sha256(str){
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function sendEmail(to, subject, text){
  const {SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE} = process.env;
  if(!SMTP_HOST){
    console.log(`Email to ${to}: ${text}`);
    return;
  }
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT||0),
    secure: SMTP_SECURE === 'true',
    auth: {user: SMTP_USER, pass: SMTP_PASS}
  });
  await transport.sendMail({from: SMTP_USER, to, subject, text});
}

async function orsMatrix(origin, depots){
  const key = process.env.ORS_KEY;
  if(!key) return depots.map(() => null);
  const body = {
    locations:[origin, ...depots],
    sources:[0],
    destinations:depots.map((_,i)=>i+1),
    metrics:['distance'],
    units:'km'
  };
  const res = await fetch('https://api.openrouteservice.org/v2/matrix/driving-car', {
    method:'POST',
    headers:{'Authorization':key,'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  if(!res.ok) throw new Error('ORS request failed');
  const data = await res.json();
  const vals = data.distances && data.distances[0];
  return Array.isArray(vals) ? vals : depots.map(()=>null);
}

app.post('/api/distances', async (req, res) => {
  try{
    const {producer, distances, producerRecord} = req.body || {};
    await append('distances.json', {producer, distances});

    const prodFile = path.join(DATA_DIR, 'producers.json');
    let producers = [];
    try{
      producers = JSON.parse(await fs.readFile(prodFile, 'utf8'));
      if(!Array.isArray(producers)) producers = [];
    }catch{}
    if(producerRecord && !producers.some(p => p.name === producerRecord.name)){
      producers.push(producerRecord);
      await fs.writeFile(prodFile, JSON.stringify(producers, null, 2));
    }
    res.sendStatus(200);
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
});

app.get('/api/distances', async (req,res)=>{
  try{
    const records = await readArray('distances.json');
    res.json(records);
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
});

app.delete('/api/distances/:producer', async (req,res)=>{
  try{
    const {producer} = req.params;
    const records = await readArray('distances.json');
    const idx = records.findIndex(r=>r.producer===producer);
    if(idx!==-1){
      records.splice(idx,1);
      await writeArray('distances.json', records);
    }
    const prods = await readArray('producers.json');
    const pidx = prods.findIndex(p=>p.name===producer);
    if(pidx!==-1){
      prods.splice(pidx,1);
      await writeArray('producers.json', prods);
    }
    res.json({ok:true});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
});

app.post('/api/pending-users', async (req, res) => {
  try{
    const {email, passwordHash} = req.body || {};
    if(typeof email !== 'string' || typeof passwordHash !== 'string'){
      return res.status(400).json({error:'invalid'});
    }
    const pending = await readArray('pending-users.json');
    const id = Date.now().toString();
    pending.push({id, email, passwordHash, requested: new Date().toISOString()});
    await writeArray('pending-users.json', pending);
    res.sendStatus(200);
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
});

app.get('/api/pending-users', async (req,res) => {
  try{
    const pending = await readArray('pending-users.json');
    res.json(pending);
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
});

app.post('/api/pending-users/:id/approve', async (req,res)=>{
  try{
    const {id} = req.params;
    const pending = await readArray('pending-users.json');
    const idx = pending.findIndex(p=>p.id===id);
    if(idx===-1) return res.sendStatus(404);
    const record = pending.splice(idx,1)[0];
    await writeArray('pending-users.json', pending);
    const users = await readArray('users.json');
    users.push({
      id: record.id,
      email: record.email,
      passwordHash: record.passwordHash,
      role: 'member',
      created: new Date().toISOString(),
      active: true
    });
    await writeArray('users.json', users);
    res.json({ok:true});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
});

app.post('/api/pending-users/:id/reject', async (req,res)=>{
  try{
    const {id} = req.params;
    const pending = await readArray('pending-users.json');
    const idx = pending.findIndex(p=>p.id===id);
    if(idx===-1) return res.sendStatus(404);
    pending.splice(idx,1);
    await writeArray('pending-users.json', pending);
    res.json({ok:true});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
});

app.get('/api/users', async (req,res) => {
  try{
    const users = await readArray('users.json');
    res.json(users);
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
});

app.post('/api/users/:id/activate', async (req,res)=>{
  try{
    const {id} = req.params;
    const users = await readArray('users.json');
    const user = users.find(u=>u.id===id);
    if(!user) return res.sendStatus(404);
    user.active = true;
    await writeArray('users.json', users);
    res.json({ok:true});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
});

app.post('/api/users/:id/deactivate', async (req,res)=>{
  try{
    const {id} = req.params;
    const users = await readArray('users.json');
    const user = users.find(u=>u.id===id);
    if(!user) return res.sendStatus(404);
    user.active = false;
    await writeArray('users.json', users);
    res.json({ok:true});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
});

app.post('/api/auth/forgot', async (req,res)=>{
  try{
    const {email} = req.body || {};
    if(typeof email !== 'string') return res.status(400).json({error:'invalid'});
    const users = await readArray('users.json');
    const user = users.find(u=>u.email===email);
    if(user){
      const token = generateToken();
      const tokenHash = sha256(token);
      const tokens = await readArray('reset-tokens.json');
      tokens.push({tokenHash, email, expires: Date.now()+3600_000});
      await writeArray('reset-tokens.json', tokens);
      const link = `${req.protocol}://${req.get('host')}/reset.html?token=${token}`;
      await sendEmail(email, 'Password reset', `Reset your password here: ${link}`);
    }
    res.json({ok:true});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
});

app.post('/api/auth/reset', async (req,res)=>{
  try{
    const {token, passwordHash} = req.body || {};
    if(typeof token !== 'string' || typeof passwordHash !== 'string'){
      return res.status(400).json({error:'invalid'});
    }
    const tokens = await readArray('reset-tokens.json');
    const tokenHash = sha256(token);
    const idx = tokens.findIndex(t=>t.tokenHash===tokenHash && t.expires>Date.now());
    if(idx===-1) return res.status(400).json({error:'invalid'});
    const email = tokens[idx].email;
    tokens.splice(idx,1);
    await writeArray('reset-tokens.json', tokens);
    const users = await readArray('users.json');
    const user = users.find(u=>u.email===email);
    if(!user) return res.status(400).json({error:'invalid'});
    user.passwordHash = passwordHash;
    await writeArray('users.json', users);
    res.json({ok:true});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
});

app.post('/api/auth/login', async (req,res)=>{
  try{
    const {email,passwordHash} = req.body || {};
    const users = await readArray('users.json');
    const user = users.find(u=>u.email===email);
    if(!user) return res.status(401).json({error:'invalid'});
    if(!['member','admin'].includes(user.role)) return res.status(403).json({error:'pending'});
    if(user.active === false) return res.status(403).json({error:'inactive'});
    if(user.passwordHash !== passwordHash) return res.status(401).json({error:'invalid'});
    const token = jwt.sign({email:user.email,role:user.role}, JWT_SECRET,{expiresIn:'1h'});
    res.cookie('auth',token,{httpOnly:true,sameSite:'lax'});
    res.json({ok:true});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
});

app.get('/api/auth/check', (req,res)=>{
  const token = req.cookies.auth;
  if(!token) return res.status(401).end();
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({email:payload.email,role:payload.role});
  }catch(err){
    res.status(401).end();
  }
});

app.post('/api/auth/logout', (req,res)=>{
  res.clearCookie('auth');
  res.json({ok:true});
});

app.post('/api/auth/change-password', async (req,res)=>{
  const token = req.cookies.auth;
  if(!token) return res.status(401).end();
  let payload;
  try{
    payload = jwt.verify(token, JWT_SECRET);
  }catch{
    return res.status(401).end();
  }
  const {oldPasswordHash,newPasswordHash} = req.body || {};
  if(typeof oldPasswordHash !== 'string' || typeof newPasswordHash !== 'string'){
    return res.status(400).json({error:'invalid'});
  }
  try{
    const users = await readArray('users.json');
    const user = users.find(u=>u.email===payload.email);
    if(!user || user.passwordHash !== oldPasswordHash){
      return res.status(400).json({error:'invalid'});
    }
    user.passwordHash = newPasswordHash;
    await writeArray('users.json', users);
    res.json({ok:true});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
});

app.use(express.static(process.cwd(), { index: 'login.html' }));

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
