import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-reveal wrapper — fades and lifts its children into view as the
 * wrapper enters the viewport. Used on /about to give each section a
 * moment of arrival rather than landing as static text.
 *
 * Respects prefers-reduced-motion: reveals instantly with no animation.
 *
 * Threshold of 0.15 + rootMargin pulling 10% off the bottom means the
 * reveal fires slightly BEFORE the element is fully on screen — by the
 * time the reader's eye reaches it, the animation is mid-flight and
 * lands with the text rather than after.
 *
 * Once revealed, stays revealed (observer disconnects). Animations don't
 * replay on scroll-back; this is editorial pacing, not an effect to
 * showcase repeatedly.
 *
 * Hydrates per <RevealOnScroll client:visible> in the Astro source. The
 * SSR'd HTML has opacity: 0; the brief moment before JS attaches is
 * acceptable because by definition the user isn't looking at below-fold
 * content yet. For above-fold use, prefer client:load.
 *
 * Children render inside a div wrapper. The wrapper takes no explicit
 * margin so vertical rhythm from the wrapped element (e.g., an H2's
 * margin-bottom) flows through to the next sibling as expected.
 */
export function RevealOnScroll({ children, delay = 0, className = '', style = {} }) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Respect the user's motion preference — no animation, just appear.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(1.5rem)',
        transition: `opacity 800ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 800ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
