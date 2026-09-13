(() => {
  'use strict';
  const root = document.querySelector('#professions');
  if (!root) return;
  const pan = root.querySelector('#professionPan');
  const scene = root.querySelector('.profession-scene');
  const status = root.querySelector('#professionStatus');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const labels = {knight:'骑士', prince:'王子', witch:'女巫', archer:'弓手'};
  const centers = {knight:.20, prince:.46, witch:.66, archer:.86};
  const characters = new Map();
  let ready = false, loading;
  let rovingIndex = 0;
  const choices = [...root.querySelectorAll('.profession-choice')];
  choices.forEach((button, index) => {
    const key = button.dataset.character;
    characters.set(key, {button, index, figure:root.querySelector('.profession-figure[data-character="'+key+'"]'), selected:false, hovered:false, focused:false});
  });
  function paint(key) {
    const item = characters.get(key);
    const revealed = item.selected || item.hovered || item.focused;
    item.figure.classList.toggle('is-revealed', revealed);
    item.button.classList.toggle('is-revealed', revealed);
    item.button.setAttribute('aria-pressed', String(item.selected));
    item.button.querySelector('.profession-state').textContent = item.selected ? '已选择 · 取消 −' : '唤醒形象 ＋';
  }
  function announce() {
    const selected = [...characters].filter(([, item]) => item.selected).map(([key]) => labels[key]);
    status.textContent = selected.length ? '你的选择：' + selected.join('、') + '。再次点击可取消。' : '四条道路，等待你的选择。';
  }
  function locate(key) {
    if (scene.clientWidth <= pan.clientWidth + 1) return;
    pan.scrollTo({left:scene.clientWidth * centers[key] - pan.clientWidth / 2,
      behavior:reduced.matches || document.body.dataset.motion === 'paused' ? 'instant' : 'smooth'});
  }
  // Decode once, then share the same unmodified source between the four masks.
  function loadPortraits() {
    if (loading) return loading;
    loading = new Promise(resolve => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = async () => {
        try { await image.decode(); } catch {}
        root.querySelectorAll('.profession-figure image').forEach(layer => layer.setAttribute('href', image.src));
        ready = true;
        root.dataset.ready = 'true';
        root.removeAttribute('aria-busy');
        announce();
        resolve(true);
      };
      image.onerror = () => {
        root.removeAttribute('aria-busy');
        status.textContent = '人物原图暂未载入，请再次点击职业重试。';
        loading = null;
        resolve(false);
      };
      image.src = root.querySelector('.profession-figure image').dataset.src;
    });
    return loading;
  }
  async function choose(key, shouldLocate, pointerType) {
    const item = characters.get(key);
    item.selected = !item.selected;
    if (!item.selected && pointerType === 'touch') {
      item.focused = false;
      item.hovered = false;
      item.button.blur();
    }
    paint(key);
    announce();
    if (shouldLocate) locate(key);
    if (!ready) {
      root.setAttribute('aria-busy','true');
      status.textContent = '正在唤醒人物形象…';
      await loadPortraits();
    }
  }
  for (const [key, item] of characters) {
    const target = root.querySelector('.profession-target[data-character="'+key+'"]');
    [item.button, target].forEach(element => {
      element.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        item.hovered = true;
        paint(key);
        loadPortraits();
      });
      element.addEventListener('pointerleave', () => { item.hovered = false; paint(key); });
      element.addEventListener('pointercancel', () => { item.hovered = false; paint(key); });
      element.addEventListener('click', event => choose(key, element === item.button, event.pointerType));
    });
    item.button.addEventListener('focus', () => {
      rovingIndex = item.index;
      item.focused = true;
      paint(key);
      locate(key);
      loadPortraits();
    });
    item.button.addEventListener('blur', () => { item.focused = false; paint(key); });
    item.button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (rovingIndex + 1) % choices.length;
      if (event.key === 'ArrowLeft') next = (rovingIndex + choices.length - 1) % choices.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = choices.length - 1;
      if (next !== undefined) { event.preventDefault(); choices[next].focus({preventScroll:true}); }
      if (event.key === 'Escape') {
        item.selected = false; item.hovered = false; item.focused = false;
        paint(key); announce(); item.button.blur();
      }
    });
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      loadPortraits(); observer.disconnect();
    }, {rootMargin:'400px'});
    observer.observe(root);
  } else loadPortraits();
})();
