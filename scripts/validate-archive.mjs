import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index个人简历.html'), 'utf8');
const js = readFileSync(resolve(root, 'assets/archive/archive.js'), 'utf8');
const css = readFileSync(resolve(root, 'assets/archive/archive.css'), 'utf8');
new vm.Script(js);
const originalExpression = js.match(/const certificates = (\[[\s\S]*?\])\.map\(/)?.[1];
assert(originalExpression, 'Certificate data is present');
const certificates = vm.runInNewContext(originalExpression);
assert.equal(certificates.length, 10, 'All ten certificates are present');
assert.equal(new Set(certificates.map(c => c.original)).size, 10, 'No duplicate originals');

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs are unique');
assert.equal([...html.matchAll(/class="avatar"/g)].length, 1, 'Exactly one avatar');
assert.equal([...html.matchAll(/<article class="project">/g)].length, 4, 'Four projects');
assert.deepEqual([...html.matchAll(/class="contact-row" data-value="([^"]+)"/g)].map(m => m[1]),
  ['深圳', '18772308691', '3291191486@qq.com', 'shenrenhxc'], 'Contact order and data');
const sections = [...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map(m => m[1]);
assert.deepEqual(sections, ['home', 'projects', 'education', 'contact'], 'Requested sections only');

let checkedAssets = 0;
function checkReference(value, directory = root) {
  if (/^(?:https?:|data:|mailto:|tel:)/i.test(value)) return;
  if (value.startsWith('#')) {
    assert(value === '#' || ids.includes(value.slice(1)), 'Anchor exists: ' + value);
    return;
  }
  const relative = decodeURIComponent(value.split(/[?#]/)[0]);
  assert(existsSync(resolve(directory, relative)), 'Local asset exists: ' + relative);
  checkedAssets++;
}
for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) checkReference(match[1]);
for (const match of css.matchAll(/url\("([^"]+)"\)/g)) checkReference(match[1], resolve(root, 'assets/archive'));
certificates.forEach((c, index) => {
  checkReference(c.original);
  if (index !== 8) checkReference('assets/archive/certificates/' + String(index + 1).padStart(2, '0') + '.webp');
});
for (const id of [...js.matchAll(/\$\('#([A-Za-z][\w-]*)'\)/g)].map(m => m[1])) {
  assert(ids.includes(id), 'Script target exists: ' + id);
}
assert(css.includes('object-fit:contain'), 'Images use full-image containment');
assert(css.includes('@keyframes wall-left') && css.includes('@keyframes wall-right'), 'Alternating wall directions');
assert(css.includes('prefers-reduced-motion'), 'Reduced-motion handling');
assert(html.includes('preload="none"'), 'Music is not loaded before visitor opt-in');
assert(!html.includes('depthCarousel'), 'Old carousel runtime is not included');

// Optional source comparison against the last published revision.
if (process.argv[2]) {
  const previous = execFileSync('git', ['show', process.argv[2] + ':index个人简历.html'], {cwd:root, encoding:'utf8'});
  const expression = previous.match(/const resume\s*=\s*(\{[\s\S]*?\n\s*\});/)?.[1];
  assert(expression, 'Baseline data can be read');
  const baseline = vm.runInNewContext('(' + expression + ')');
  certificates.forEach((certificate, index) => {
    const before = baseline.certificates[index];
    for (const key of ['name', 'issuer', 'date', 'number']) {
      assert.equal(certificate[key], before[key], 'Preserved certificate ' + index + ': ' + key);
    }
    assert.equal(certificate.original, before.image, 'Original file preserved');
  });
  for (const text of [baseline.education.school, baseline.education.degree, baseline.education.period,
    baseline.education.description, ...baseline.education.courses]) {
    assert(html.includes(text), 'Education text preserved: ' + text);
  }
  console.log('PASS: all certificate fields and complete education text match the published baseline.');
}
console.log('PASS: script syntax, section structure, four projects, one avatar, contact order, ' + checkedAssets + ' local references.');
