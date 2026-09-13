(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const body = document.body;
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const certificates = [
    { name:'Prompt 工程师认证', issuer:'科大讯飞 · AI大学堂', date:'2026.08.30', number:'XFPROMPT608697', original:'Ai大学认证证书.png' },
    { name:'智能体工程师认证', issuer:'科大讯飞 · AI大学堂', date:'2026.08.30', number:'FAGENT142492', original:'Ai大学认证证书 (1).png' },
    { name:'微调工程师认证', issuer:'科大讯飞 · AI大学堂', date:'2026.08.30', number:'XFTUNING495843', original:'Ai大学认证证书 (2).png' },
    { name:'RAG 工程师认证', issuer:'科大讯飞 · AI大学堂', date:'2026.08.30', number:'XFRAG514447', original:'Ai大学认证证书 (3).png' },
    { name:'PAI ArtLab 的 AIGC 设计基础', issuer:'阿里云 Apsara Clouder', date:'有效至 2028.08.29', number:'CLDM05260802772637', original:'img_50225f3df651f93dc6eb3931aa52e673.png' },
    { name:'基于百炼平台构建智能体应用', issuer:'阿里云 Apsara Clouder', date:'有效至 2028.08.29', number:'CLDM02260802772634', original:'img_b544fc7e6850a9314dd3ccb9b9de4ba2.png' },
    { name:'VISION 人工智能设计（入门）', issuer:'阿里云 Apsara Clouder', date:'有效至 2028.08.29', number:'CLDM06260802772641', original:'img_c1c6e384de04e7517135c7b624d73d04.png' },
    { name:'Spring AI 应用开发（入门）', issuer:'阿里云 Apsara Clouder', date:'有效至 2028.08.29', number:'CLDM09260802772665', original:'img_c5ee885494f037bb59ff6baaaa695d32.png' },
    { name:'人工智能训练师高级证书', issuer:'阿里达摩院', date:'2026.08.22', number:'AIT260822232741000139', original:'阿里达摩院高级.jpg' },
    { name:'人工智能训练师初级证书', issuer:'阿里达摩院', date:'2026.08.20', number:'AIT260820150824000158', original:'阿里达摩院初级.png' }
  ].map((certificate, index) => ({
    ...certificate, index,
    source: index === 8 ? certificate.original : 'assets/archive/certificates/' + String(index + 1).padStart(2, '0') + '.webp'
  }));
  let toastTimer;
  function toast(message) {
    $('#toast').textContent = message;
    $('#toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2400);
  }

  // Each group has exactly the same measured width, so looping never jumps.
  function exhibit(certificate, copy) {
    const number = String(certificate.index + 1).padStart(2, '0');
    return '<figure class="cert-exhibit" data-certificate="' + certificate.index + '">' +
      '<button class="cert-frame" type="button" data-view-certificate="' + certificate.index + '" ' +
      (copy ? 'tabindex="-1" ' : '') + 'aria-label="查看原图：' + escapeHTML(certificate.name) + '">' +
      '<span class="cert-mat"><img class="cert-image" data-src="' + escapeHTML(certificate.source) + '" data-original="' + escapeHTML(certificate.original) + '" alt="' + escapeHTML(certificate.name) + '" width="1000" height="707" decoding="async"></span></button>' +
      '<figcaption><span class="cert-no">' + number + '</span><div><p class="cert-name">' + escapeHTML(certificate.name) +
      '</p><p class="cert-meta">' + escapeHTML(certificate.issuer) + ' · ' + escapeHTML(certificate.date) +
      '<br>' + escapeHTML(certificate.number) + '</p></div></figcaption></figure>';
  }
  $('#certificateWall').innerHTML = [certificates.slice(0, 5), certificates.slice(5)].map((row, index) =>
    '<div class="wall-row" aria-label="第 ' + (index + 1) + ' 排证书，向' + (index ? '右' : '左') + '缓慢移动">' +
    '<div class="wall-track"><div class="wall-group">' + row.map(c => exhibit(c, false)).join('') +
    '</div><div class="wall-group" aria-hidden="true">' + row.map(c => exhibit(c, true)).join('') + '</div></div></div>'
  ).join('');

  // Two concurrent decodes prevent a newly revealed wall from blocking input.
  const imageQueue = [];
  let decoding = 0;
  const readySources = new Map();
  function pumpImages() {
    while (decoding < 2 && imageQueue.length) {
      const image = imageQueue.shift();
      decoding++;
      const source = image.dataset.src;
      let task = readySources.get(source);
      if (!task) {
        task = new Promise(resolve => {
          const loader = new Image();
          loader.decoding = 'async';
          loader.onload = async () => {
            try { await loader.decode(); } catch {}
            resolve(loader.src);
          };
          loader.onerror = () => {
            if (!loader.dataset.fallback) {
              loader.dataset.fallback = 'true';
              loader.src = image.dataset.original;
            } else resolve(null);
          };
          loader.src = source;
        });
        readySources.set(source, task);
      }
      task.then(resolved => {
        if (resolved) {
          image.src = resolved;
          image.classList.add('is-loaded');
        } else {
          image.closest('.cert-mat').setAttribute('aria-label', '图片暂未载入，请点击查看原图');
        }
      }).finally(() => { decoding--; pumpImages(); });
    }
  }
  function queueImage(image) {
    if (image.dataset.queued) return;
    image.dataset.queued = 'true';
    imageQueue.push(image);
    pumpImages();
  }
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { queueImage(entry.target); imageObserver.unobserve(entry.target); }
      });
    }, {rootMargin:'220px', threshold:0});
    $$('.cert-image').forEach(image => imageObserver.observe(image));
    const sceneObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        entry.target.dataset.offscreen = String(!entry.isIntersecting);
      });
    }, {rootMargin:'60px'});
    sceneObserver.observe($('#home'));
    sceneObserver.observe($('#education'));
  } else $$('.cert-image').forEach(queueImage);

  let allPaused = reduced.matches;
  let galleryPaused = false;
  function applyMotion() {
    body.dataset.motion = allPaused ? 'paused' : 'running';
    $('#motionToggle').setAttribute('aria-pressed', String(allPaused));
    $('#motionToggle').setAttribute('aria-label', allPaused ? '恢复所有动效' : '暂停所有动效');
    $('.motion-symbol').textContent = allPaused ? '▷' : 'Ⅱ';
    $('.motion-label').textContent = allPaused ? '恢复动效' : '暂停动效';
    $('#education').dataset.paused = String(galleryPaused);
    $('#galleryToggle').setAttribute('aria-pressed', String(galleryPaused));
    $('#galleryToggle').textContent = galleryPaused ? '▷ 继续陈列墙' : 'Ⅱ 暂停陈列墙';
  }
  $('#motionToggle').addEventListener('click', () => { allPaused = !allPaused; applyMotion(); });
  $('#galleryToggle').addEventListener('click', () => { galleryPaused = !galleryPaused; applyMotion(); });
  reduced.addEventListener('change', () => { allPaused = reduced.matches; applyMotion(); });
  applyMotion();
  document.addEventListener('visibilitychange', () => { body.dataset.hidden = String(document.hidden); });

  // Viewer uses the original files, including all certificate identifiers.
  const dialog = $('#certificateDialog');
  let currentCertificate = 0;
  let viewerRequest = 0;
  let returnFocus;
  function showCertificate(index) {
    currentCertificate = (index + certificates.length) % certificates.length;
    const certificate = certificates[currentCertificate];
    const request = ++viewerRequest;
    $('#dialogTitle').textContent = certificate.name;
    $('#dialogCounter').textContent = String(currentCertificate + 1).padStart(2, '0') + ' / 10';
    $('#dialogMeta').textContent = certificate.issuer + ' · ' + certificate.date + ' · ' + certificate.number;
    $('#dialogOriginal').href = certificate.original;
    $('.dialog-image-wrap').setAttribute('aria-busy', 'true');
    $('#imageStatus').textContent = '正在载入原图…';
    const image = new Image();
    image.decoding = 'async';
    image.onload = async () => {
      try { await image.decode(); } catch {}
      if (request !== viewerRequest || !dialog.open) return;
      $('#dialogImage').src = image.src;
      $('#dialogImage').alt = certificate.name + '，原始证书';
      $('#imageStatus').textContent = '';
      $('.dialog-image-wrap').setAttribute('aria-busy', 'false');
    };
    image.onerror = () => {
      if (request !== viewerRequest) return;
      $('#imageStatus').textContent = '原图载入失败，可点击“打开原始文件”重试';
      $('.dialog-image-wrap').setAttribute('aria-busy', 'false');
    };
    image.src = certificate.original;
  }
  $('#certificateWall').addEventListener('click', event => {
    const button = event.target.closest('[data-view-certificate]');
    if (!button) return;
    returnFocus = button;
    dialog.showModal();
    body.dataset.modal = 'true';
    body.style.overflow = 'hidden';
    showCertificate(Number(button.dataset.viewCertificate));
  });
  function closeDialog() { dialog.close(); }
  $('#dialogClose').addEventListener('click', closeDialog);
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });
  dialog.addEventListener('close', () => {
    viewerRequest++;
    body.dataset.modal = 'false';
    body.style.overflow = '';
    // A looping visual duplicate should return keyboard focus to its real exhibit.
    if (returnFocus?.closest('[aria-hidden="true"]')) {
      returnFocus = document.querySelector('.wall-group:not([aria-hidden]) [data-view-certificate="' + currentCertificate + '"]');
    }
    returnFocus?.focus({preventScroll:true});
  });
  $('#dialogPrev').addEventListener('click', () => showCertificate(currentCertificate - 1));
  $('#dialogNext').addEventListener('click', () => showCertificate(currentCertificate + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showCertificate(currentCertificate + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });

  // Hover, focus, and touch share the same decoding state; no permanent timer.
  const glyphs = '⌁⟐⋔⟁⟡⋇⌬⫷⫸';
  $$('.contact-row').forEach((row, rowIndex) => {
    const button = $('.contact-reveal', row);
    const output = $('.contact-value', row);
    const real = row.dataset.value;
    const length = Math.min(12, Math.max(7, real.length));
    const encoded = Array.from({length}, (_, index) => glyphs[(index * 3 + rowIndex * 2) % glyphs.length]).join('');
    let hover = false, focused = false, pinned = false, revealed = false, frame = 0;
    function render(show) {
      if (show === revealed && output.textContent === (show ? real : encoded)) return;
      revealed = show;
      cancelAnimationFrame(frame);
      row.dataset.revealed = String(show);
      button.setAttribute('aria-expanded', String(show));
      button.setAttribute('aria-label', (show ? '隐藏' : '显示') + row.dataset.label + '：' + real);
      $('.contact-indicator', row).textContent = show ? '−' : '＋';
      const text = show ? real : encoded;
      if (reduced.matches || allPaused || !show) { output.textContent = text; return; }
      const start = performance.now();
      let lastStep = -1;
      function decode(now) {
        const progress = Math.min(1, (now - start) / 620);
        const step = Math.floor(progress * 17);
        if (step !== lastStep) {
          lastStep = step;
          output.textContent = [...text].map((char, index) => index / text.length < progress ? char : glyphs[(step + index * 3) % glyphs.length]).join('');
        }
        if (progress < 1) frame = requestAnimationFrame(decode);
        else { output.textContent = text; frame = 0; }
      }
      frame = requestAnimationFrame(decode);
    }
    output.textContent = encoded;
    const sync = () => render(hover || focused || pinned);
    row.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hover = true; sync(); } });
    row.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') { hover = false; sync(); } });
    row.addEventListener('focusin', () => { focused = true; sync(); });
    row.addEventListener('focusout', event => { if (!row.contains(event.relatedTarget)) { focused = false; pinned = false; sync(); } });
    button.addEventListener('click', () => {
      pinned = !pinned;
      if (!pinned) { focused = false; hover = false; button.blur(); }
      sync();
    });
    row.addEventListener('keydown', event => {
      if (event.key === 'Escape') { pinned = false; focused = false; hover = false; button.blur(); sync(); }
    });
    row.resetContact = () => { pinned = false; focused = false; hover = false; render(false); };
  });
  document.addEventListener('pointerdown', event => {
    $$('.contact-row').forEach(row => { if (!row.contains(event.target)) row.resetContact(); });
  });
  $('[data-copy]').addEventListener('click', async event => {
    const value = event.currentTarget.dataset.copy;
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(value);
      else {
        const input = document.createElement('textarea');
        input.value = value; input.style.position = 'fixed'; input.style.opacity = '0';
        document.body.append(input); input.select();
        const copied = document.execCommand('copy'); input.remove();
        if (!copied) throw new Error('copy failed');
      }
      toast('微信号已复制');
    } catch { toast('暂时无法复制，请长按微信号手动复制'); }
  });

  // Wallpaper Engine's original local soundtrack loads only on explicit play.
  const audio = $('#wallpaperAudio');
  audio.volume = .35;
  const sound = $('#soundToggle');
  function syncSound() {
    const playing = !audio.paused;
    sound.setAttribute('aria-pressed', String(playing));
    sound.innerHTML = '<span aria-hidden="true">♫</span> ' + (playing ? '关闭原壁纸音乐' : '开启原壁纸音乐');
  }
  sound.addEventListener('click', async () => {
    if (!audio.paused) { audio.pause(); syncSound(); return; }
    sound.disabled = true;
    sound.textContent = '正在载入音乐…';
    try { await audio.play(); } catch { toast('音乐暂时无法播放，请稍后重试'); }
    finally { sound.disabled = false; syncSound(); }
  });
  audio.addEventListener('pause', syncSound);
  audio.addEventListener('playing', syncSound);
  audio.addEventListener('error', () => { sound.disabled = false; syncSound(); toast('音乐载入失败，请稍后重试'); });

  let sceneFrame = 0, px = 0, py = 0;
  const hero = $('#home'), scene = $('.wallpaper-scene');
  function updateParallax() {
    sceneFrame = 0;
    scene.style.setProperty('--parallax-x', px.toFixed(2) + 'px');
    scene.style.setProperty('--parallax-y', py.toFixed(2) + 'px');
  }
  hero.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || reduced.matches || allPaused) return;
    const rect = hero.getBoundingClientRect();
    px = ((event.clientX - rect.left) / rect.width - .5) * 13;
    py = ((event.clientY - rect.top) / rect.height - .5) * 8;
    if (!sceneFrame) sceneFrame = requestAnimationFrame(updateParallax);
  }, {passive:true});
  hero.addEventListener('pointerleave', () => {
    px = py = 0;
    if (!sceneFrame) sceneFrame = requestAnimationFrame(updateParallax);
  });
  $('#year').textContent = new Date().getFullYear();
  addEventListener('beforeprint', () => {
    $$('.cert-image').forEach(image => { image.src = image.dataset.original; image.classList.add('is-loaded'); });
    $$('.contact-row').forEach(row => { $('.contact-value', row).textContent = row.dataset.value; });
  });
  addEventListener('afterprint', () => $$('.contact-row').forEach(row => row.resetContact()));
})();
