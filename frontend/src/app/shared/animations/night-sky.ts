import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
import { gsap, prefersReducedMotion } from './motion';

interface Star {
  x: number;
  y: number;
  r: number;
}

/**
 * The living night sky: slow swirling strokes and golden stars, purely decorative, rendered behind
 * paintings (never applied to the artworks themselves). Hidden from assistive technologies.
 */
@Component({
  selector: 'at-night-sky',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none absolute inset-0 overflow-hidden', 'aria-hidden': 'true' },
  template: `
    <svg class="size-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="sky-glow" cx="70%" cy="20%" r="60%">
          <stop offset="0" stop-color="#315c91" stop-opacity="0.55" />
          <stop offset="1" stop-color="#101d35" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="moon" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="#f6d47a" />
          <stop offset="0.6" stop-color="#e7b84b" stop-opacity="0.5" />
          <stop offset="1" stop-color="#e7b84b" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#sky-glow)" />
      <g class="swirls" fill="none" stroke-linecap="round">
        <path class="swirl" stroke="#315c91" stroke-opacity="0.35" stroke-width="3"
          d="M-40 420 C 180 300, 360 520, 560 400 S 900 260, 1080 380 S 1380 520, 1500 400" />
        <path class="swirl" stroke="#f4edde" stroke-opacity="0.12" stroke-width="2"
          d="M-40 470 C 200 360, 380 560, 600 450 S 920 320, 1100 430 S 1380 560, 1500 450" />
        <path class="swirl" stroke="#e7b84b" stroke-opacity="0.18" stroke-width="2"
          d="M300 300 c 60 -80 200 -60 210 30 c 8 70 -90 100 -130 50 c -30 -40 10 -90 50 -70" />
        <path class="swirl" stroke="#315c91" stroke-opacity="0.3" stroke-width="2.5"
          d="M820 230 c 80 -90 260 -50 250 60 c -8 90 -130 110 -170 40 c -25 -45 20 -95 70 -70" />
      </g>
      <circle class="moon" cx="1240" cy="150" r="70" fill="url(#moon)" />
      <g class="stars">
        @for (star of stars; track $index) {
          <circle class="star" [attr.cx]="star.x" [attr.cy]="star.y" [attr.r]="star.r" fill="#e7b84b" />
        }
      </g>
    </svg>
  `,
})
export class NightSky {
  protected readonly stars: Star[] = Array.from({ length: 42 }, (_, i) => ({
    x: (i * 337) % 1440,
    y: (i * 211) % 620,
    r: 0.8 + ((i * 7) % 5) * 0.45,
  }));

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (prefersReducedMotion()) {
        return;
      }
      const ctx = gsap.context(() => {
        gsap.utils.toArray<SVGPathElement>('.swirl').forEach((path, i) => {
          const length = path.getTotalLength();
          gsap.set(path, { strokeDasharray: `${length * 0.35} ${length * 0.15}` });
          gsap.to(path, { strokeDashoffset: -length, duration: 40 + i * 12, ease: 'none', repeat: -1 });
        });
        gsap.to('.star', {
          opacity: 0.25,
          duration: () => gsap.utils.random(1.6, 3.8),
          delay: () => gsap.utils.random(0, 3),
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
        gsap.to('.moon', { scale: 1.08, transformOrigin: 'center', duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      }, host.nativeElement);
      destroyRef.onDestroy(() => ctx.revert());
    });
  }
}
