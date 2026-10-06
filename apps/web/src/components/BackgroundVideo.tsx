import { useEffect, useRef } from 'react';

/** Full-screen looping background. Put the file at /public/media/background.mp4 (or pass `src`). */
export function BackgroundVideo({ src = '/media/background.mp4' }: { src?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  // Autoplay can be blocked until the first interaction; retry once on first input and when the tab returns.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const play = () => { void v.play().catch(() => {}); };
    play();
    const events = ['pointerdown', 'keydown', 'visibilitychange'] as const;
    events.forEach((e) => document.addEventListener(e, play));
    return () => events.forEach((e) => document.removeEventListener(e, play));
  }, []);

  return (
    <>
      <video ref={ref} className="bg-video" src={src} autoPlay muted loop playsInline preload="auto" aria-hidden="true" tabIndex={-1} />
      <div className="bg-scrim" aria-hidden="true" />
    </>
  );
}
