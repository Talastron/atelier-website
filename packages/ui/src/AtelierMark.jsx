import React, { useState, useEffect } from 'react';
import { colors } from '@atelier/design-tokens';

// One-shot wax-seal animation lives at the navbar's brand mark — first page
// load in a session, the hanger wire draws itself in and the brass charm
// lands; from then on the mark is static. Subsequent navigations within the
// same session see the resting state. Respects prefers-reduced-motion.
//
// The wordmark ("Atelier.") that sits next to this mark in Nav.astro is
// intentionally static HTML text. Only the *mark* performs — the wordmark
// stays continuously readable. Cartier and Hermès use the same pattern on
// their product pages: small chrome animates, brand name does not.
const SESSION_KEY = 'atelier-mark-animated-v1';

// pathLength="100" lets each path treat itself as length 100 regardless of
// real geometry — so a single keyframe-set (dashoffset 100 → 0) draws every
// path correctly without us measuring them. The pathLength SVG attribute is
// supported everywhere modern (Chrome 88+, Safari 14+, Firefox 88+).
const ANIM_STYLES = `
@keyframes atelier-mark-draw { to { stroke-dashoffset: 0; } }
@keyframes atelier-mark-fade { to { opacity: 1; } }
.atelier-mark-anim .am-hook,
.atelier-mark-anim .am-tri,
.atelier-mark-anim .am-line {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
}
.atelier-mark-anim .am-hook {
  animation: atelier-mark-draw 0.55s cubic-bezier(0.4, 0, 0.2, 1) 0s both;
}
.atelier-mark-anim .am-tri {
  animation: atelier-mark-draw 0.55s cubic-bezier(0.4, 0, 0.2, 1) 0.42s both;
}
.atelier-mark-anim .am-line {
  animation: atelier-mark-draw 0.28s ease-out 0.92s both;
}
.atelier-mark-anim .am-dot {
  opacity: 0;
  animation: atelier-mark-fade 0.28s ease-out 1.08s both;
}
@media (prefers-reduced-motion: reduce) {
  .atelier-mark-anim .am-hook,
  .atelier-mark-anim .am-tri,
  .atelier-mark-anim .am-line,
  .atelier-mark-anim .am-dot {
    animation: none;
    stroke-dasharray: none;
    stroke-dashoffset: 0;
    opacity: 1;
  }
}
`;

// Inject the keyframes once per document — keeps the SVG itself clean and
// means re-rendering the component never re-injects style. Stays a no-op on
// SSR (no document) and only runs on first client hydrate.
let stylesInjected = false;
function ensureStyles() {
  if (typeof document === 'undefined' || stylesInjected) return;
  const el = document.createElement('style');
  el.setAttribute('data-atelier-mark', 'true');
  el.textContent = ANIM_STYLES;
  document.head.appendChild(el);
  stylesInjected = true;
}

export function AtelierMark({ size = 40, light = false, playOnce = false }) {
  const bg    = light ? colors.stone[800] : colors.stone[900];
  const line  = light ? colors.stone[400] : colors.cream;
  const brass = colors.brass[300];

  // Default false so SSR + first-paint state is the resting mark. We only
  // flip to `true` if (a) playOnce was requested, (b) this session hasn't
  // already seen the animation, (c) reduced-motion is NOT preferred.
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!playOnce) return;
    try {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
      sessionStorage.setItem(SESSION_KEY, '1');
      ensureStyles();
      setAnimate(true);
    } catch { /* sessionStorage blocked (Safari private mode) — stay static */ }
  }, [playOnce]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={animate ? 'atelier-mark-anim' : undefined}
    >
      <rect width="256" height="256" fill={bg} rx="56" />
      <g fill="none" stroke={line} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 160 60 Q 160 44 144 44 Q 128 44 128 58 L 128 110"
              pathLength="100" className="am-hook" />
        <path d="M 128 110 L 62 184 L 194 184 Z"
              pathLength="100" className="am-tri" />
      </g>
      <line x1="128" y1="184" x2="128" y2="206"
            stroke={brass} strokeWidth="1.5" strokeLinecap="round" opacity="0.8"
            pathLength="100" className="am-line" />
      <circle cx="128" cy="212" r="5" fill={brass} className="am-dot" />
    </svg>
  );
}
