import { useEffect, useRef, useState } from 'react';

/**
 * The Studio Chronicle — a short editorial heritage section on /about.
 * Four dated entries set as a printed-page ledger: Roman-numeral date
 * on the left (italic display serif, brass), single editorial line on
 * the right. Brass hairlines between entries; entries fade and lift in
 * sequence as the section enters view.
 *
 * Atelier is young, but heritage components are central to luxury
 * branding because they assert the brand exists IN TIME. This is the
 * /about page's "we've been here, here's how we got here" moment.
 *
 * Update the ENTRIES array as the studio's milestones land. New entries
 * append at the bottom; the oldest stays at the top (chronological).
 * The dates here are brand-narrative — adjust to match real history
 * when ready.
 */
const ENTRIES = [
  { date: 'MMXXIV', line: 'A wardrobe begins keeping its own ledger.' },
  { date: 'MMXXV · VI', line: 'The Concierge writes its first manifesto.' },
  { date: 'MMXXV · X', line: 'The Lookbook learns to compose.' },
  { date: 'MMXXVI · I', line: 'The studio opens for membership.' },
];

export function StudioChronicle() {
  const listRef = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true);
      return;
    }
    const el = listRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      style={{
        maxWidth: 760,
        margin: '0 auto',
        paddingInline: 'var(--atelier-page-padding)',
        paddingBottom: 'clamp(4rem, 7vw, 6rem)',
      }}
    >
      {/* Eyebrow — brass rule + small-caps, matches the other section
          eyebrows on /about (Where we began, The Practice, For Whom). */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: '24px',
            height: '1.5px',
            background: 'var(--atelier-brass-300)',
          }}
        />
        <p
          style={{
            fontSize: '10px',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--atelier-stone-500)',
            fontWeight: 600,
            margin: 0,
          }}
        >
          The Chronicle
        </p>
      </div>

      {/* Headline */}
      <h2
        style={{
          fontFamily: 'var(--atelier-font-display)',
          fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
          color: 'var(--atelier-stone-900)',
          maxWidth: '24ch',
          marginBottom: '2.5rem',
          marginTop: 0,
        }}
      >
        How the studio came to be.
      </h2>

      {/* Chronicle ledger — Roman date | editorial line, brass hairlines */}
      <ol
        ref={listRef}
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {ENTRIES.map((entry, i) => (
          <li
            key={entry.date}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(6rem, max-content) 1fr',
              gap: '1.75rem',
              alignItems: 'baseline',
              paddingTop: '1.5rem',
              paddingBottom: '1.5rem',
              // Slightly stronger brass at the top and bottom of the ledger
              // to bracket it as a printed table; lighter between entries.
              borderTop:
                i === 0
                  ? '1px solid rgba(212, 179, 120, 0.4)'
                  : '1px solid rgba(212, 179, 120, 0.22)',
              borderBottom:
                i === ENTRIES.length - 1
                  ? '1px solid rgba(212, 179, 120, 0.4)'
                  : 'none',
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translateY(0)' : 'translateY(0.75rem)',
              transition: `opacity 700ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 140}ms, transform 700ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 140}ms`,
            }}
          >
            {/* Date — italic display serif, brass, baseline-aligned */}
            <span
              style={{
                fontFamily: 'var(--atelier-font-display)',
                fontStyle: 'italic',
                fontSize: '0.9375rem',
                color: 'var(--atelier-brass-600)',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}
            >
              {entry.date}
            </span>

            {/* Line */}
            <p
              style={{
                fontFamily: 'var(--atelier-font-display)',
                fontSize: '1.0625rem',
                lineHeight: 1.55,
                color: 'var(--atelier-stone-800)',
                margin: 0,
              }}
            >
              {entry.line}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
