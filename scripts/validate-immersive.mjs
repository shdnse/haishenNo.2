import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index个人简历.html'), 'utf8');
const baseline = execFileSync('git', ['show', '939e7cc:index个人简历.html'], {cwd: root, encoding:'utf8'});
const articles = text => [...text.matchAll(/<article class="project">([\s\S]*?)<\/article>/g)].map(m=>m[1].replace(/\s+/g,' ').trim());
assert.deepEqual(articles(html), articles(baseline), 'Every project, description, tag and link is preserved');
for (const id of ['home','education','contact']) {
  const getSection = text => text.match(new RegExp('<section[^>]+id="'+id+'"[\\s\\S]*?<\\/section>'))?.[0];
  assert.equal(getSection(html), getSection(baseline), 'Untouched section: '+id);
}
assert(!/projectScene|sculpture|three\.module|\.glb/.test(html), 'No 3D figure, loader or model reference');
assert(!existsSync(resolve(root,'assets/project-scene/project-scene.js')), '3D bootstrap removed');
assert(!existsSync(resolve(root,'assets/project-scene/sculpture.js')), '3D renderer removed');
assert(!existsSync(resolve(root,'assets/project-scene/models/LeePerrySmith.glb')), '3D model removed');
assert(existsSync(resolve(root,'assets/project-scene/crimson-hall.png')), 'Shared static background preserved');
console.log('PASS: all four projects and three untouched sections preserved; 3D runtime/model removed; shared background retained.');
