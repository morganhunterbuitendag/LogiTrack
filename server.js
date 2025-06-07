import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

const PORT = process.env.PORT || 3101;
const DATA_DIR = path.join(process.cwd(), 'data');
const JWT_SECRET = 'change_this_secret';

const app = express();
app.use(express.json());
app.use(cookieParser());

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
    users.push({id:record.id,email:record.email,passwordHash:record.passwordHash,role:'member',created:new Date().toISOString()});
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

app.post('/api/auth/login', async (req,res)=>{
  try{
    const {email,passwordHash} = req.body || {};
    const users = await readArray('users.json');
    const user = users.find(u=>u.email===email);
    if(!user) return res.status(401).json({error:'invalid'});
    if(!['member','admin'].includes(user.role)) return res.status(403).json({error:'pending'});
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

app.use(express.static(process.cwd(), { index: 'login.html' }));

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
