(() => {
  'use strict';
  const body = document.body;
  const desktop = matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ids = ['home', 'professions', 'projects', 'education', 'contact'];
  const titles = ['序章', '职业之境', '代表项目', '教育与认证', '联系'];
  const labels = {knight:'骑士', prince:'王子', witch:'女巫', archer:'弓手'};
  const pages = ids.map(id => document.getElementById(id));
  if (pages.some(page => !page)) return;
  const header = document.querySelector('.site-header');
  const footer = document.querySelector('.site-footer');
  const footerHome = document.createComment('Original footer position for continuous / mobile layout');
  footer.before(footerHome);
  const motion = document.getElementById('motionToggle');
  const nav = document.createElement('nav');
  nav.className = 'journey-nav';
  nav.setAttribute('aria-label', '逐页浏览');
  nav.innerHTML = '<div class="journey-chapters"><button type="button" class="journey-prev" aria-label="上一页">← 上一页</button>' +
    '<div class="journey-pages">' + ids.map((id, i) => '<button type="button" class="journey-dot" data-page="'+i+'" aria-label="第'+(i+1)+'页：'+titles[i]+'"></button>').join('') + '</div>' +
    '<span class="journey-counter" role="status" aria-live="polite"></span><button type="button" class="journey-next" aria-label="下一页">下一页 →</button></div>' +
    '<div class="journey-actions"><span class="journey-keyhint">滚轮 / ← → 翻页</span><button type="button" class="journey-change">选择职业 ↗</button><button type="button" class="journey-pause" aria-label="暂停所有动效">Ⅱ 动效</button></div>';
  body.append(nav);
  const prev = nav.querySelector('.journey-prev');
  const next = nav.querySelector('.journey-next');
  const counter = nav.querySelector('.journey-counter');
  const change = nav.querySelector('.journey-change');
  const pause = nav.querySelector('.journey-pause');
  const dots = [...nav.querySelectorAll('.journey-dot')];
  let active = -1;
  let animationTimer = 0;
  let transitioning = false;
  let modeEnabled = false;
  const initialTabIndex = pages.map(page => page.getAttribute('tabindex'));
  const isPaused = () => reduced.matches || body.dataset.motion === 'paused';
  const selected = () => Object.hasOwn(labels, body.dataset.profession || '');
  const hashIndex = () => Math.max(0, ids.indexOf(location.hash.slice(1)));
  function syncChoice() {
    change.textContent = selected() ? labels[body.dataset.profession] + ' · 更改职业' : '选择职业 ↗';
  }
  function syncMotion() {
    const paused = body.dataset.motion === 'paused';
    pause.textContent = paused ? '▷ 动效' : 'Ⅱ 动效';
    pause.setAttribute('aria-label', paused ? '播放所有动效' : '暂停所有动效');
    pause.setAttribute('aria-pressed', String(paused));
    if (paused && transitioning) finishTransition();
  }
  function finishTransition() {
    clearTimeout(animationTimer);
    transitioning = false;
    pages.forEach(page => page.classList.remove('is-entering', 'is-leaving'));
  }
  function setHash(index, replace) {
    if (location.hash === '#' + ids[index]) return;
    history[replace ? 'replaceState' : 'pushState'](null, '', location.pathname + location.search + '#' + ids[index]);
  }
  function go(raw, {focus = false, replace = false, animate = true} = {}) {
    if (!modeEnabled) return;
    let index = Math.max(0, Math.min(pages.length - 1, raw));
    const gated = index > 1 && !selected();
    if (gated) index = 1;
    if (active !== index) {
      const old = pages[active];
      const direction = index >= active ? 1 : -1;
      finishTransition();
      body.style.setProperty('--page-direction', direction);
      active = index;
      body.dataset.activePage = ids[index];
      pages.forEach((page, i) => {
        page.classList.toggle('is-active', i === index);
        page.inert = i !== index;
        page.setAttribute('aria-hidden', String(i !== index));
        page.dataset.offscreen = String(i !== index);
      });
      if (old && animate && !isPaused()) {
        transitioning = true;
        old.classList.add('is-leaving');
        pages[index].classList.add('is-entering');
        animationTimer = setTimeout(finishTransition, 550);
      }
      header.inert = index !== 0;
      header.setAttribute('aria-hidden', String(index !== 0));
      prev.disabled = index === 0;
      next.disabled = index === pages.length - 1;
      counter.textContent = String(index + 1).padStart(2, '0') + ' / 05 · ' + titles[index];
      dots.forEach((dot, i) => {
        if (i === index) dot.setAttribute('aria-current', 'page');
        else dot.removeAttribute('aria-current');
      });
    }
    setHash(index, replace || gated);
    if (gated) document.getElementById('professionStatus').textContent = '请选择一种职业，再继续探索。可以随时返回更换。';
    if (focus) pages[index].focus({preventScroll:true});
  }
  function setMode() {
    const entering = desktop.matches;
    if (entering === modeEnabled) return;
    finishTransition();
    modeEnabled = entering;
    if (entering) {
      body.dataset.pageMode = 'desktop';
      footer.classList.add('journey-footer');
      pages[4].append(footer);
      pages.forEach(page => { page.classList.add('archive-page'); page.tabIndex = -1; });
      active = -1;
      go(hashIndex(), {replace:true, animate:false});
      window.scrollTo(0, 0);
    } else {
      const returnTo = pages[Math.max(0, active)];
      delete body.dataset.pageMode;
      delete body.dataset.activePage;
      body.classList.remove('has-profession-cursor');
      header.inert = false;
      header.removeAttribute('aria-hidden');
      footerHome.after(footer);
      footer.classList.remove('journey-footer');
      pages.forEach((page, i) => {
        page.classList.remove('archive-page', 'is-active');
        page.inert = false;
        page.removeAttribute('aria-hidden');
        delete page.dataset.offscreen;
        if (initialTabIndex[i] === null) page.removeAttribute('tabindex');
        else page.setAttribute('tabindex', initialTabIndex[i]);
      });
      requestAnimationFrame(() => returnTo.scrollIntoView({behavior:'instant'}));
    }
  }
  prev.addEventListener('click', () => go(active - 1, {focus:true}));
  next.addEventListener('click', () => go(active + 1, {focus:true}));
  change.addEventListener('click', () => go(1, {focus:true}));
  dots.forEach((dot, i) => dot.addEventListener('click', () => go(i, {focus:true})));
  pause.addEventListener('click', () => motion.click());
  document.addEventListener('click', event => {
    if (!modeEnabled || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const index = ids.indexOf(link.getAttribute('href').slice(1));
    if (index < 0) return;
    event.preventDefault();
    go(index, {focus:true});
  });
  const restoreHistory = () => go(hashIndex(), {replace:true});
  window.addEventListener('popstate', restoreHistory);
  window.addEventListener('hashchange', restoreHistory);
  desktop.addEventListener('change', setMode);
  document.addEventListener('professionchange', syncChoice);
  new MutationObserver(syncMotion).observe(body, {attributes:true, attributeFilter:['data-motion']});

  // One wheel gesture either scrolls the current page OR turns one page.
  // Reaching a long page's edge never consumes the remaining inertia as a turn.
  let wheelTimer = 0;
  let wheelTotal = 0;
  let wheelLocked = false;
  let wheelScrolling = false;
  function canScroll(element, delta) {
    return element.scrollHeight > element.clientHeight + 2 &&
      (delta > 0 ? element.scrollTop + element.clientHeight < element.scrollHeight - 2 : element.scrollTop > 2);
  }
  function scrollContainer(target, delta) {
    let element = target instanceof Element ? target : null;
    while (element && pages[active].contains(element)) {
      if (/(auto|scroll)/.test(getComputedStyle(element).overflowY) && canScroll(element, delta)) return element;
      if (element === pages[active]) break;
      element = element.parentElement;
    }
    return canScroll(pages[active], delta) ? pages[active] : null;
  }
  document.addEventListener('wheel', event => {
    if (!modeEnabled || event.ctrlKey || body.dataset.modal === 'true' || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelTotal = 0; wheelLocked = false; wheelScrolling = false; }, 220);
    if (transitioning || wheelLocked) { event.preventDefault(); wheelLocked = true; return; }
    const delta = event.deltaY * (event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? innerHeight : 1);
    if (!delta) return;
    if (scrollContainer(event.target, delta)) { wheelScrolling = true; return; }
    event.preventDefault();
    if (wheelScrolling) return;
    if (Math.sign(wheelTotal) !== Math.sign(delta)) wheelTotal = 0;
    wheelTotal += delta;
    if (Math.abs(wheelTotal) >= 75) {
      wheelLocked = true;
      go(active + Math.sign(wheelTotal));
    }
  }, {passive:false});
  document.addEventListener('keydown', event => {
    if (!modeEnabled || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || body.dataset.modal === 'true') return;
    if (event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (event.key === 'PageDown' || event.key === 'PageUp') {
      const direction = event.key === 'PageDown' ? 1 : -1;
      const container = scrollContainer(event.target, direction);
      event.preventDefault();
      if (container) container.scrollBy({top:direction * container.clientHeight * .85, behavior:isPaused() ? 'instant' : 'smooth'});
      else go(active + direction, {focus:true});
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      go(active + (event.key === 'ArrowRight' ? 1 : -1), {focus:true});
    }
  });

  // Exact supplied transparent PNGs; CSS rotates the original artwork toward
  // the pointer hotspot. No resampling, redraw or animation trail is involved.
  const cursor = document.createElement('div');
  cursor.className = 'profession-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  const cursorImage = new Image();
  cursorImage.alt = '';
  cursorImage.decoding = 'async';
  cursorImage.draggable = false;
  cursor.append(cursorImage);
  body.append(cursor);
  let readyKey = '';
  let requestedKey = '';
  let cursorRevision = 0;
  let inside = false;
  let editable = false;
  let cursorFrame = 0;
  let x = 0, y = 0;
  const cursorCache = new Map();
  function showCursor() {
    body.classList.toggle('has-profession-cursor', modeEnabled && inside && !editable &&
      !document.hidden && readyKey === body.dataset.profession && !!readyKey);
  }
  async function equipCursor() {
    const key = modeEnabled && selected() ? body.dataset.profession : '';
    if (key === requestedKey) { showCursor(); return; }
    requestedKey = key;
    const revision = ++cursorRevision;
    readyKey = '';
    showCursor();
    if (!key) return;
    let source = cursorCache.get(key);
    if (!source) {
      source = new Image();
      source.decoding = 'async';
      source.src = 'assets/cursors/' + key + '-original.png';
      cursorCache.set(key, source);
    }
    try {
      await source.decode();
      if (revision !== cursorRevision || !modeEnabled) return;
      cursorImage.src = source.src;
      await cursorImage.decode();
      if (revision !== cursorRevision) return;
      readyKey = key;
      cursor.dataset.profession = key;
      showCursor();
    } catch {
      if (revision !== cursorRevision) return;
      requestedKey = '';
      cursorCache.delete(key);
      showCursor();
      document.getElementById('professionStatus').textContent = '职业已选择；光标原图暂未加载，保留系统光标。再次选择可重试。';
    }
  }
  function pointer(event) {
    if (event.pointerType !== 'mouse' || !modeEnabled) { inside = false; showCursor(); return; }
    inside = true;
    editable = !!event.target.closest('input,textarea,select,[contenteditable="true"]');
    x = event.clientX; y = event.clientY;
    if (!cursorFrame) cursorFrame = requestAnimationFrame(() => {
      cursorFrame = 0;
      cursor.style.transform = 'translate3d(' + (x - 3) + 'px,' + (y - 3) + 'px,0)';
      showCursor();
    });
  }
  document.addEventListener('pointermove', pointer, {passive:true});
  document.addEventListener('pointerdown', pointer, {passive:true});
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) { inside = false; showCursor(); } });
  window.addEventListener('blur', () => { inside = false; showCursor(); });
  document.addEventListener('visibilitychange', showCursor);
  document.addEventListener('professionchange', equipCursor);
  desktop.addEventListener('change', equipCursor);
  setMode();
  syncChoice();
  syncMotion();
  equipCursor();
})();
