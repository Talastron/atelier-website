import React, { useState, useEffect, useRef } from 'react';

/**
 * InvestmentLens — a magazine "by the numbers" data spread for the home
 * page. Four sample statistics counted up by tween-animation when the
 * section enters the viewport, framed by an editorial paragraph on the
 * left so the figures land as composed criticism rather than dashboard.
 *
 * Numbers are illustrative — these are the kinds of figures Atelier
 * surfaces inside the studio. Wired to dummy data here; the production
 * studio computes them per-member from real wardrobe + wear logs.
 *
 * The counter animation uses requestAnimationFrame for smooth easing
 * (cubic-out — fast start, gentle settle), respects prefers-reduced-motion,
 * and only fires once per visit (no replay on scroll).
 */

const BrassRule = () => (
  <span
    aria-hidden="true"
    style={{
      display: 'inline-block',
      width: 24,
      height: '1.5px',
      backgroundColor: 'var(--atelier-brass-300)',
    }}
  />
);

// Four sample statistics. Each is editorially distinct — low-is-good
// (cost per wear), problem-naming (unworn), possibility-naming (outfits
// composed), compounding (wears unlocked).
const STATS = [
  {
    numeral: 'N°. I',
    prefix: '£',
    value: 2.84,
    decimals: 2,
    suffix: '',
    label: 'Cost per wear',
    caption: 'Your most-worn piece, year one.',
  },
  {
    numeral: 'N°. II',
    prefix: '',
    value: 18,
    decimals: 0,
    suffix: '%',
    label: 'Unworn in twelve months',
    caption: 'The quiet half of your closet.',
  },
  {
    numeral: 'N°. III',
    prefix: '',
    value: 247,
    decimals: 0,
    suffix: '',
    label: 'Outfits composed',
    caption: 'From a collection of forty-two pieces.',
  },
  {
    numeral: 'N°. IV',
    prefix: '',
    value: 5.3,
    decimals: 1,
    suffix: '×',
    label: 'Wears unlocked, per piece',
    caption: 'The compounding return of stewardship.',
  },
];

function useCountUp(target, decimals, inView, durationMs = 1600) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;

    // Respect reduced-motion users — snap to final value, no animation.
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setValue(target);
      return;
    }

    const start = performance.now();
    let rafId;
    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / durationMs, 1);
      // Cubic-out easing — fast start, gentle settle. Suits luxury pacing.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(eased * target);
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [inView, target, durationMs]);

  // Format with the right number of decimals only at render time so
  // intermediate counter values display tidily (e.g. "2.84" never "2.8400001").
  return value.toFixed(decimals);
}

function Stat({ stat, inView }) {
  const formatted = useCountUp(stat.value, stat.decimals, inView);

  return (
    <div className="flex flex-col items-center text-center md:items-start md:text-left">
      <p
        className="text-[10px] uppercase mb-3"
        style={{
          letterSpacing: '0.32em',
          color: 'var(--atelier-brass-600)',
          fontWeight: 600,
        }}
      >
        {stat.numeral}
      </p>
      <p
        className="mb-3"
        style={{
          fontFamily: 'var(--atelier-font-display)',
          fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
          lineHeight: 1,
          letterSpacing: '-0.015em',
          color: 'var(--atelier-stone-900)',
          // Tabular figures so the digits don't jump around as they count
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {stat.prefix}{formatted}{stat.suffix}
      </p>
      <h3
        className="mb-1.5 text-[10px] uppercase"
        style={{
          letterSpacing: '0.28em',
          color: 'var(--atelier-stone-900)',
          fontWeight: 600,
        }}
      >
        {stat.label}
      </h3>
      <p
        className="italic"
        style={{
          fontFamily: 'var(--atelier-font-display)',
          fontSize: '0.875rem',
          lineHeight: 1.55,
          color: 'var(--atelier-stone-500)',
          maxWidth: '28ch',
        }}
      >
        {stat.caption}
      </p>
    </div>
  );
}

export function InvestmentLens() {
  const containerRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        // 0.25 threshold — counters start when the section is visibly
        // committed in the viewport, not on first pixel-touch.
        if (entry.isIntersecting && entry.intersectionRatio > 0.25) {
          setInView(true);
        }
      },
      { threshold: [0, 0.25, 0.5] }
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={containerRef}
      style={{
        paddingBlock: 'clamp(4rem, 7vw, 6rem)',
        paddingInline: 'var(--atelier-page-padding)',
        background: 'var(--atelier-stone-50)',
      }}
    >
      <div
        className="mx-auto"
        style={{ maxWidth: 'var(--atelier-container-max)' }}
      >
        {/* Section header */}
        <div className="text-center mb-12 lg:mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BrassRule />
            <p
              className="text-[10px] uppercase font-medium"
              style={{ letterSpacing: '0.32em', color: 'var(--atelier-brass-600)' }}
            >
              The Investment Lens
            </p>
            <BrassRule />
          </div>
          <h2
            className="mx-auto"
            style={{
              fontFamily: 'var(--atelier-font-display)',
              fontSize: 'clamp(2rem, 3.5vw, 3rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              color: 'var(--atelier-stone-900)',
              maxWidth: '22ch',
            }}
          >
            A wardrobe, <em style={{ fontWeight: 400 }}>by the numbers</em>.
          </h2>
        </div>

        {/* Two-column body: editorial framing on the left, stats grid on the
            right. Stacks to a single column on mobile, with the framing
            paragraph above the figures. */}
        <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-12 lg:gap-16 items-start">
          {/* Left — editorial framing */}
          <div className="text-center lg:text-left">
            <p
              className="italic mx-auto lg:mx-0"
              style={{
                fontFamily: 'var(--atelier-font-display)',
                fontSize: 'clamp(1.125rem, 1.5vw, 1.375rem)',
                lineHeight: 1.55,
                color: 'var(--atelier-stone-700)',
                maxWidth: '32ch',
              }}
            >
              What you wear tells you who you are.
              What you don't wear tells you who you used to think you were.
            </p>
            <p
              className="mt-6 mx-auto lg:mx-0"
              style={{
                fontSize: '0.9375rem',
                lineHeight: 1.7,
                color: 'var(--atelier-stone-500)',
                maxWidth: '34ch',
              }}
            >
              Atelier counts both. The figures opposite are a sample of what
              the studio surfaces — the small intelligences that quietly fix
              the wardrobe nothing else has.
            </p>
          </div>

          {/* Right — 2x2 stats grid with hairline separators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-12 gap-x-12 sm:gap-x-10">
            {STATS.map((stat) => (
              <Stat key={stat.numeral} stat={stat} inView={inView} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
