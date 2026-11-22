import { useLayoutEffect, useRef } from 'react';
import { useInView, useReducedMotion } from 'motion/react';

export function LandingWhatsApp({ number }: { number: string }) {
  const slot = useRef<HTMLDivElement>(null);
  const corner = useRef<HTMLSpanElement>(null);
  const link = useRef<HTMLAnchorElement>(null);
  const docked = useInView(slot, { amount: 1, margin: '-90px 0px -16px 0px' });
  const previousDocked = useRef(docked);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (previousDocked.current === docked) return;
    previousDocked.current = docked;
    if (reducedMotion || !link.current) return;

    const origin = (docked ? corner.current : slot.current)?.getBoundingClientRect();
    const destination = link.current.getBoundingClientRect();
    if (!origin?.width || !destination.width) return;

    const animation = link.current.animate(
      [
        {
          transform: `translate(${origin.left - destination.left}px, ${origin.top - destination.top}px) scaleX(${origin.width / destination.width})`,
          borderRadius: docked ? '50%' : '28px',
        },
        { transform: 'none', borderRadius: '28px' },
      ],
      { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
    return () => animation.cancel();
  }, [docked, reducedMotion]);

  return (
    <div ref={slot} className="hours-whatsapp-slot">
      <span ref={corner} className="hours-whatsapp-corner" aria-hidden="true" />
      <a
        ref={link}
        className="hours-whatsapp"
        data-docked={docked}
        href={`https://wa.me/${number}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Preguntar por WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.5 3.5A11.9 11.9 0 0 0 1.8 17.8L.1 24l6.4-1.7A11.9 11.9 0 0 0 20.5 3.5ZM12 21.6a9.9 9.9 0 0 1-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4A9.9 9.9 0 1 1 12 21.6Zm5.4-7.4c-.3-.2-1.8-.9-2-.9-.3-.1-.5-.2-.7.1l-.9 1.1c-.2.2-.4.2-.7.1a8 8 0 0 1-4-3.5c-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.3 0-.6.1-.8.4-.3.3-1 1-1 2.4 0 1.5 1 2.9 1.2 3.1.1.2 2 3.2 5 4.5 1.8.8 2.6.9 3.5.7.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.1-1.4 0-.1-.2-.2-.5-.3Z" />
        </svg>
        <span className="hours-whatsapp-label">Preguntar por WhatsApp</span>
      </a>
    </div>
  );
}
