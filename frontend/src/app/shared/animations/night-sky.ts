import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Ambient backdrop for the dark (midnight) sections: two slow, softly blurred colour blooms in the
 * palette's cobalt and sunflower, a vignette and fine film grain. Purely decorative, behind content,
 * hidden from assistive technologies, and still when reduced motion is requested.
 */
@Component({
  selector: 'at-night-sky',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none absolute inset-0 overflow-hidden', 'aria-hidden': 'true' },
  template: `
    <div class="bloom bloom-cobalt"></div>
    <div class="bloom bloom-gold"></div>
    <div class="vignette"></div>
    <div class="grain"></div>
  `,
  styles: `
    .bloom {
      position: absolute;
      border-radius: 9999px;
      filter: blur(90px);
      will-change: transform;
    }
    .bloom-cobalt {
      width: 70vmax;
      height: 70vmax;
      top: -30vmax;
      left: -18vmax;
      background: radial-gradient(circle, rgb(49 92 145 / 0.55), transparent 65%);
      animation: drift-a 26s ease-in-out infinite alternate;
    }
    .bloom-gold {
      width: 46vmax;
      height: 46vmax;
      right: -14vmax;
      bottom: -22vmax;
      background: radial-gradient(circle, rgb(231 184 75 / 0.16), transparent 65%);
      animation: drift-b 32s ease-in-out infinite alternate;
    }
    .vignette {
      position: absolute;
      inset: 0;
      background: radial-gradient(120% 90% at 50% 40%, transparent 55%, rgb(8 14 28 / 0.55) 100%);
    }
    .grain {
      position: absolute;
      inset: 0;
      opacity: 0.16;
      mix-blend-mode: soft-light;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }
    @keyframes drift-a {
      to {
        transform: translate3d(12vmax, 8vmax, 0) scale(1.08);
      }
    }
    @keyframes drift-b {
      to {
        transform: translate3d(-10vmax, -6vmax, 0) scale(1.12);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .bloom {
        animation: none;
      }
    }
  `,
})
export class NightSky {}
