import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';

import './DepthCarousel.css';

const DEFAULT_ITEMS = [
  { image: 'https://picsum.photos/seed/depth1/800/1000', alt: 'Slide 1' },
  { image: 'https://picsum.photos/seed/depth2/800/1000', alt: 'Slide 2' },
  { image: 'https://picsum.photos/seed/depth3/800/1000', alt: 'Slide 3' }
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const normalizeItem = item => (typeof item === 'string' ? { image: item, alt: '' } : item);

export default function DepthCarousel({
  items = DEFAULT_ITEMS,
  cardWidth = 540,
  cardHeight = 400,
  radius = 18,
  tint = '#06110f',
  depth = 110,
  spread = 50,
  tilt = 10,
  tiltDirection = 'right',
  perspective = 1400,
  visibleCards = 4,
  falloff = 0.16,
  blur = 2.5,
  duration = 700,
  ease = 'power3.out',
  autoplay = false,
  autoplayDelay = 3200,
  loop = true,
  showControls = true,
  showIndicators = true,
  onChange,
  className = ''
}) {
  const data = useMemo(
    () => (Array.isArray(items) ? items : []).map(normalizeItem),
    [items]
  );
  const count = data.length;

  const rootRef = useRef(null);
  const cardRefs = useRef([]);
  const overlayRefs = useRef([]);
  const posRef = useRef(0);
  const focusRef = useRef(0);
  const tweenRef = useRef(null);
  const scaleRef = useRef(1);
  const cfgRef = useRef({});
  const onChangeRef = useRef(onChange);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const wheelTimerRef = useRef(null);
  const autoTimerRef = useRef(null);
  const reducedRef = useRef(false);
  const [active, setActive] = useState(0);

  onChangeRef.current = onChange;
  cfgRef.current = {
    count,
    depth,
    spread,
    tilt,
    tiltDirection,
    visibleCards,
    falloff,
    blur,
    duration,
    ease,
    loop,
    cardWidth,
    autoplayDelay
  };

  const layout = useCallback(position => {
    const cfg = cfgRef.current;
    if (!cfg.count) return;
    const direction = cfg.tiltDirection === 'left' ? -1 : 1;
    const scale = scaleRef.current;

    for (let index = 0; index < cfg.count; index += 1) {
      const card = cardRefs.current[index];
      if (!card) continue;

      let distance = index - position;
      if (cfg.loop && cfg.count > 1) {
        distance = ((distance % cfg.count) + cfg.count) % cfg.count;
        if (distance > cfg.count / 2) distance -= cfg.count;
      }

      const back = Math.max(0, distance);
      const absoluteDistance = Math.abs(distance);
      const shown = absoluteDistance <= cfg.visibleCards + 0.5;
      const translateZ = -cfg.depth * distance;
      const translateX = direction * cfg.spread * distance;
      const rotateY = direction * cfg.tilt * clamp(distance, 0, 1);

      let opacity = distance < 0 ? Math.max(0, 1 + distance) : 1;
      if (!shown) opacity = 0;

      const brightness = Math.max(0.18, 1 - back * cfg.falloff);
      const blurPx = cfg.blur > 0
        ? Math.min(cfg.blur, (back / Math.max(1, cfg.visibleCards)) * cfg.blur)
        : 0;

      card.style.transform = `translate(-50%, -50%) scale(${scale}) translateX(${translateX.toFixed(2)}px) translateZ(${translateZ.toFixed(2)}px) rotateY(${rotateY.toFixed(3)}deg)`;
      card.style.opacity = opacity.toFixed(3);
      card.style.filter = `brightness(${brightness.toFixed(3)}) blur(${blurPx.toFixed(2)}px)`;
      card.style.zIndex = String(Math.round(2000 - distance * 20));
      card.style.pointerEvents = shown && opacity > 0.05 ? 'auto' : 'none';

      const overlay = overlayRefs.current[index];
      if (overlay) {
        overlay.style.opacity = clamp(back * cfg.falloff * 1.25, 0, 0.86).toFixed(3);
      }
    }
  }, []);

  const notify = useCallback(
    index => {
      setActive(index);
      onChangeRef.current?.(index, data[index]);
    },
    [data]
  );

  const tweenTo = useCallback(
    (target, animate) => {
      tweenRef.current?.kill();
      const cfg = cfgRef.current;
      const proxy = { position: posRef.current };
      const tweenDuration = animate && !reducedRef.current ? cfg.duration / 1000 : 0;

      tweenRef.current = gsap.to(proxy, {
        position: target,
        duration: tweenDuration,
        ease: cfg.ease,
        onUpdate: () => {
          posRef.current = proxy.position;
          layout(proxy.position);
        },
        onComplete: () => {
          if (cfg.count > 0) {
            posRef.current = ((posRef.current % cfg.count) + cfg.count) % cfg.count;
          }
          layout(posRef.current);
        }
      });
    },
    [layout]
  );

  const setFocus = useCallback(
    (rawIndex, animate = true) => {
      const cfg = cfgRef.current;
      if (!cfg.count) return;
      const index = cfg.loop
        ? ((rawIndex % cfg.count) + cfg.count) % cfg.count
        : clamp(rawIndex, 0, cfg.count - 1);

      let delta = index - posRef.current;
      if (cfg.loop && cfg.count > 1) {
        delta = ((delta % cfg.count) + cfg.count) % cfg.count;
        if (delta > cfg.count / 2) delta -= cfg.count;
      }

      tweenTo(posRef.current + delta, animate);
      if (index !== focusRef.current) {
        focusRef.current = index;
        notify(index);
      }
    },
    [notify, tweenTo]
  );

  const navigateBy = useCallback(
    step => setFocus(focusRef.current + step, true),
    [setFocus]
  );

  useEffect(() => {
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    posRef.current = 0;
    focusRef.current = 0;
    setActive(0);
    layout(0);
  }, [count, layout]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const resizeObserver = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      const cfg = cfgRef.current;
      const neededWidth = cfg.cardWidth + Math.abs(cfg.spread) * 2 + 120;
      scaleRef.current = clamp(width / neededWidth, 0.46, 1);
      layout(posRef.current);
    });

    resizeObserver.observe(root);
    return () => resizeObserver.disconnect();
  }, [layout]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const handleWheel = event => {
      const cfg = cfgRef.current;
      if (cfg.count < 2) return;
      event.preventDefault();
      tweenRef.current?.kill();

      const rawDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
      const normalizedDelta = event.deltaMode === 1 ? rawDelta * 24 : rawDelta;
      const step = clamp(normalizedDelta / (cfg.cardWidth * 0.9), -0.6, 0.6);
      posRef.current += step;
      layout(posRef.current);

      clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = window.setTimeout(
        () => setFocus(Math.round(posRef.current), true),
        130
      );
    };

    root.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      root.removeEventListener('wheel', handleWheel);
      clearTimeout(wheelTimerRef.current);
    };
  }, [layout, setFocus]);

  const handlePointerDown = useCallback(event => {
    const cfg = cfgRef.current;
    if (cfg.count < 2 || event.button !== 0 || event.target.closest('button')) return;
    tweenRef.current?.kill();
    suppressClickRef.current = false;
    dragRef.current = {
      x: event.clientX,
      startPosition: posRef.current,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
      moved: false,
      pointerId: event.pointerId
    };
  }, []);

  const handlePointerMove = useCallback(
    event => {
      const drag = dragRef.current;
      if (!drag) return;
      const cfg = cfgRef.current;
      const stepPixels = Math.max(cfg.cardWidth * 0.55 * scaleRef.current, 40);
      const deltaX = event.clientX - drag.x;

      if (!drag.moved && Math.abs(deltaX) > 4) {
        drag.moved = true;
        rootRef.current?.setPointerCapture(drag.pointerId);
      }
      if (!drag.moved) return;

      const now = performance.now();
      const elapsed = Math.max(now - drag.lastTime, 1);
      drag.velocity = (event.clientX - drag.lastX) / elapsed;
      drag.lastX = event.clientX;
      drag.lastTime = now;
      posRef.current = drag.startPosition - deltaX / stepPixels;
      layout(posRef.current);
    },
    [layout]
  );

  const handlePointerEnd = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (!drag.moved) return;

    const cfg = cfgRef.current;
    const stepPixels = Math.max(cfg.cardWidth * 0.55 * scaleRef.current, 40);
    const projected = posRef.current - (drag.velocity * 180) / stepPixels;
    suppressClickRef.current = true;
    requestAnimationFrame(() => { suppressClickRef.current = false; });
    setFocus(Math.round(projected), true);
  }, [setFocus]);

  const handleKeyDown = useCallback(
    event => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateBy(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateBy(1);
      }
    },
    [navigateBy]
  );

  useEffect(() => {
    if (!autoplay || reducedRef.current || count < 2) return undefined;
    const root = rootRef.current;
    let hovered = false;
    let focused = false;

    const stop = () => {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    };
    const start = () => {
      stop();
      autoTimerRef.current = window.setInterval(() => {
        if (!hovered && !focused) navigateBy(1);
      }, Math.max(cfgRef.current.autoplayDelay, 600));
    };
    const enter = () => { hovered = true; };
    const leave = () => { hovered = false; };
    const focusIn = () => { focused = true; };
    const focusOut = () => { focused = false; };

    root.addEventListener('mouseenter', enter);
    root.addEventListener('mouseleave', leave);
    root.addEventListener('focusin', focusIn);
    root.addEventListener('focusout', focusOut);
    start();

    return () => {
      stop();
      root.removeEventListener('mouseenter', enter);
      root.removeEventListener('mouseleave', leave);
      root.removeEventListener('focusin', focusIn);
      root.removeEventListener('focusout', focusOut);
    };
  }, [autoplay, autoplayDelay, count, navigateBy]);

  useEffect(() => {
    layout(posRef.current);
  }, [layout, depth, spread, tilt, tiltDirection, visibleCards, falloff, blur, cardWidth, cardHeight, radius, count]);

  useEffect(
    () => () => {
      tweenRef.current?.kill();
      clearTimeout(wheelTimerRef.current);
      clearInterval(autoTimerRef.current);
    },
    []
  );

  if (!count) return null;

  return (
    <div
      ref={rootRef}
      className={`depth-carousel ${className}`.trim()}
      style={{ '--dc-perspective': `${perspective}px` }}
      role="group"
      aria-roledescription="carousel"
      aria-label="专业技能证书深度轮播"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
    >
      <div className="depth-carousel__stage">
        {data.map((item, index) => (
          <figure
            key={item.number || index}
            className="depth-carousel__card"
            ref={element => { cardRefs.current[index] = element; }}
            style={{ width: cardWidth, height: cardHeight, borderRadius: radius }}
            aria-roledescription="slide"
            aria-label={`${index + 1} / ${count}：${item.name || item.alt || '证书'}`}
            aria-hidden={active !== index}
            onClick={() => {
              if (!suppressClickRef.current) setFocus(index, true);
            }}
          >
            <div className="depth-carousel__media">
              <img
                className="depth-carousel__img"
                src={item.image}
                alt={item.alt || item.name || ''}
                draggable={false}
              />
              <span
                className="depth-carousel__tint"
                ref={element => { overlayRefs.current[index] = element; }}
                style={{ background: tint }}
                aria-hidden="true"
              />
            </div>
            <figcaption className="depth-carousel__caption">
              <span className="depth-carousel__name">{item.name}</span>
              <span className="depth-carousel__meta">
                {[item.issuer, item.date, item.number].filter(Boolean).join(' · ')}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      {showControls && count > 1 && (
        <>
          <button
            type="button"
            className="depth-carousel__arrow depth-carousel__arrow--prev"
            aria-label="上一张证书"
            onClick={() => navigateBy(-1)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className="depth-carousel__arrow depth-carousel__arrow--next"
            aria-label="下一张证书"
            onClick={() => navigateBy(1)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}

      {showIndicators && count > 1 && (
        <div className="depth-carousel__dots" role="tablist" aria-label="选择证书">
          {data.map((item, index) => (
            <button
              key={item.number || index}
              type="button"
              role="tab"
              aria-selected={active === index}
              aria-label={`查看第 ${index + 1} 张证书：${item.name || ''}`}
              className={`depth-carousel__dot${active === index ? ' is-active' : ''}`}
              onClick={() => setFocus(index, true)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
