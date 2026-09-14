import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const professions = read('assets/professions/professions.js');
const journey = read('assets/journey/journey.js');
const css = read('assets/journey/journey.css');
const html = read('index个人简历.html');
assert.match(html, /class="wordmark"[^>]*>[\s\S]*?CAI XINHAI<span class="wordmark-caption"/, 'Header uses the full uppercase name');
assert.match(html, /<audio id="wallpaperAudio"[^>]*preload="auto" autoplay loop>/, 'Original wallpaper music requests autoplay and preload');
assert(css.includes('body[data-page-mode="desktop"] .projects::before{position:fixed}'), 'Project vignette stays fixed with the background instead of scrolling a dark seam');
const archiveJS = read('assets/archive/archive.js');
assert(archiveJS.includes("const unlockEvents = ['pointerdown', 'keydown', 'touchstart']"), 'Blocked autoplay retries on the first trusted interaction');
assert(archiveJS.includes("event.target.closest?.('#soundToggle')"), 'Autoplay retry cannot invert the visible sound toggle');
new vm.Script(professions);
new vm.Script(journey);
const desktopQuery = '(min-width: 901px) and (hover: hover) and (pointer: fine)';
assert(professions.includes(desktopQuery) && journey.includes(desktopQuery), 'Desktop selection, cursor and paging share a breakpoint');
assert(journey.includes("const ids = ['home', 'professions', 'projects', 'education', 'contact']"));
assert(journey.includes('index > 1 && !selected()'), 'Page two selection gate');
assert(journey.includes('if (wheelScrolling) return'), 'Wheel inertia may not turn a page after internal scrolling');
assert(journey.includes('event.defaultPrevented'), 'Respect profession and dialog keyboard navigation');
assert(journey.includes("body.dataset.modal === 'true'"), 'Do not turn pages inside the certificate viewer');
assert(journey.includes('await source.decode()') && journey.includes('revision !== cursorRevision'), 'Only decoded, current selection can replace the native pointer');
assert(css.includes('@media print') && css.includes('body:not([data-page-mode="desktop"])'), 'Mobile document and print fallback');
const archiveCSS = read('assets/archive/archive.css');
assert(archiveCSS.includes('animation:wall-left 57.5s linear infinite'));
assert(archiveCSS.includes('animation-duration:65s'));
const keys = ['knight','prince','witch','archer'];
for (const key of keys) {
  const bytes = readFileSync(resolve(root, 'assets/cursors/' + key + '-original.png'));
  assert.equal(bytes.subarray(1,4).toString(), 'PNG');
  assert.equal(bytes.readUInt32BE(16), 1254);
  assert.equal(bytes.readUInt32BE(20), 1254);
  assert.equal(bytes[25], 6, 'Original transparent RGBA cursor: ' + key);
}

// A small event/DOM fixture exercises the actual profession controller, not a
// rewritten selection algorithm. Browser QA covers layout, input and rendering.
class Node {
  dataset = {}; attrs = {}; listeners = new Map(); textContent = ''; innerHTML = '';
  clientWidth = 1200; classes = new Set();
  classList = {toggle:(name, on) => on ? this.classes.add(name) : this.classes.delete(name)};
  querySelector(selector) { return this.children?.[selector]; }
  querySelectorAll(selector) { return this.lists?.[selector] || []; }
  setAttribute(key, value) { this.attrs[key] = value; }
  removeAttribute(key) { delete this.attrs[key]; }
  addEventListener(name, fn) { this.listeners.set(name, [...(this.listeners.get(name) || []), fn]); }
  async fire(name, event = {}) { for (const fn of this.listeners.get(name) || []) await fn(event); }
  blur() { this.fire('blur'); }
  focus() { this.fire('focus'); }
  scrollTo() {}
}
function fixture({isDesktop = true, saved = '', deniedStorage = false} = {}) {
  const page = new Node(), body = new Node(), status = new Node();
  const choices = keys.map(key => {
    const button = new Node(); button.dataset.character = key;
    button.children = {'.profession-state': new Node()};
    return button;
  });
  const layers = keys.map(() => { const image = new Node(); image.dataset.src = 'assets/professions/characters-original.png'; return image; });
  page.children = {'#professionPan':new Node(), '.profession-scene':new Node(), '#professionStatus':status,
    '.profession-controls':new Node(), '.profession-hint':new Node(), '.profession-figure image':layers[0]};
  keys.forEach(key => {
    page.children['.profession-figure[data-character="'+key+'"]'] = new Node();
    page.children['.profession-target[data-character="'+key+'"]'] = new Node();
  });
  page.lists = {'.profession-choice':choices, '.profession-figure image':layers};
  const media = {matches:isDesktop, callbacks:[], addEventListener(name, fn) { this.callbacks.push(fn); }};
  const storage = new Map([['archive-profession-v1', saved]]);
  const events = [];
  const context = {
    document:{body, querySelector:()=>page, dispatchEvent:event=>events.push(event)},
    matchMedia:query=>query === desktopQuery ? media : {matches:false},
    sessionStorage:{getItem:key=>{if (deniedStorage) throw Error('disabled'); return storage.get(key);}, setItem:(key,value)=>{if (deniedStorage) throw Error('disabled');storage.set(key,value);}},
    CustomEvent:class { constructor(type, init) { this.type=type; this.detail=init.detail; } },
    Image:class { decode() { return Promise.resolve(); } set src(value) { this.source=value; queueMicrotask(()=>this.onload?.()); } get src() { return this.source; } },
    IntersectionObserver:class { observe() {} disconnect() {} },
    window:{IntersectionObserver:true},
  };
  vm.runInNewContext(professions, context);
  return {body, status, events, choices,
    pressed:()=>choices.filter(button=>button.attrs['aria-pressed']==='true').map(button=>button.dataset.character),
    choose:async key=>choices[keys.indexOf(key)].fire('click',{pointerType:'mouse'}),
    mode:enabled=>{media.matches=enabled;media.callbacks.forEach(fn=>fn());}};
}
const test = fixture();
assert.deepEqual(test.pressed(), []);
await test.choose('knight');
assert.deepEqual(test.pressed(), ['knight']);
for (const key of ['prince','witch','archer','archer']) {
  await test.choose(key);
  assert.deepEqual(test.pressed(), [key], 'Desktop must never select multiple or deselect on repeated click');
  assert.equal(test.body.dataset.profession, key);
}
await test.choices[3].fire('keydown', {key:'Escape'});
assert.deepEqual(test.pressed(), ['archer'], 'Escape leaves committed desktop selection intact');
test.mode(false);
assert.equal(test.body.dataset.profession, undefined, 'No mobile custom cursor');
await test.choose('knight');
assert.deepEqual(test.pressed(), ['knight','archer'], 'Existing independent mobile selection retained');
await test.choose('knight');
assert.deepEqual(test.pressed(), ['archer'], 'Mobile selection remains cancellable');
await test.choose('witch');
test.mode(true);
assert.deepEqual(test.pressed(), ['witch'], 'Resizing to desktop resolves to last chosen profession');
assert.equal(fixture({saved:'prince'}).body.dataset.profession, 'prince');
assert.deepEqual(fixture({saved:'invalid'}).pressed(), []);
const denied = fixture({deniedStorage:true});
await denied.choose('knight');
assert.equal(denied.body.dataset.profession, 'knight', 'Storage restrictions do not break selection');
console.log('PASS: desktop exclusivity, repeated choice, mobile multi-select, mode changes, session restore, storage fallback, page/keyboard guards, 4 original RGBA cursors, 2x wall speed.');
