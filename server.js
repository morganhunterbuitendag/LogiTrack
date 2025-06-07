import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const PORT = 3101;
const DATA_DIR = path.join(process.cwd(), 'data');

const app = express();
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
