import { useEffect, useState } from 'react';

/**
 * Reading progress indicator — a thin brass rule fixed to the top of the
 * viewport that fills left-to-right as the reader scrolls through the
 * target article element. Used on /journal/[slug] to give long-form
 * essays the same scroll-position signal that NYT longreads, Medium,
 * and most editorial reading sites provide.
 *
 * Progress is measured *relative to the target element*, not the whole
 * document. This means the bar stays at 0% during the header, fills
 * smoothly through the body, and reaches 100% as the body ends — not
 * when the visitor scrolls past the previous/next nav and footer. The
 * UX promise is "this is how much of the ARTICLE remains", not "this
 * is how much of the PAGE remains."
 *
 * Hidden when progress is 0% (the bar would just be an invisible
 * starting line) and fades out gracefully when 100% (the article is
 * done; no need to keep showing the indicator at the foot).
 *
 * Uses passive scroll listener for performance. No JS animation on the
 * width — direct update on every scroll event so the bar tracks scroll
 * 1:1 without lag.
 */
export function ReadingProgress({ targetSelector = 'article' }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const target = document.querySelector(targetSelector);
    if (!target) return;

    function updateProgress() {
      const rect = target.getBoundingClientRect();
      const targetTopAbs = window.scrollY + rect.top;
      const targetHeight = rect.height;
      const viewport = window.innerHeight;

      // How far the reader has scrolled into the target, measured against
      // the readable distance (target height minus the viewport height).
      // If the target is shorter than the viewport, progress is always 0
      // because there's nothing to scroll through.
      const readable = targetHeight - viewport;
      if (readable <= 0) {
        setProgress(0);
        return;
      }

      const scrolledIntoTarget = window.scrollY - targetTopAbs;
      const pct = Math.max(0, Math.min(1, scrolledIntoTarget / readable));
      setProgress(pct);
    }

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [targetSelector]);

  // Fade in only when the reader is actually inside the article (progress > 0)
  // and fade out as they finish (progress reaches 1). Avoids the bar being
  // visible as a zero-width nub at the top of the page or a full-width line
  // hanging around after the read is over.
  const isActive = progress > 0.001 && progress < 0.999;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '2px',
        width: `${progress * 100}%`,
        background: 'var(--atelier-brass-600)',
        zIndex: 100,
        opacity: isActive ? 1 : 0,
        transition: 'opacity 300ms ease',
        pointerEvents: 'none',
      }}
    />
  );
}
