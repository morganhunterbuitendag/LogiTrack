import {parseLocation, appendJSON} from './addProducer.js';
import fs from 'fs/promises';

describe('parseLocation', () => {
  test('parses raw pair', () => {
    const loc = parseLocation('-27.1,26.2');
    expect(loc).toEqual({lat:-27.1,lng:26.2});
  });
  test('parses google url', () => {
    const loc = parseLocation('https://maps.app.goo.gl/@-27.5,25.4,17z');
    expect(loc).toEqual({lat:-27.5,lng:25.4});
  });
});

describe('appendJSON', () => {
  const tmp = 'tmp.json';
  afterEach(async () => { try{ await fs.unlink(tmp); }catch{} });
  test('appends object', async () => {
    await appendJSON(tmp,{a:1});
    await appendJSON(tmp,{b:2});
    const data = JSON.parse(await fs.readFile(tmp,'utf8'));
    expect(data).toEqual([{a:1},{b:2}]);
  });
});
