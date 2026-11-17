import { Directive, DestroyRef, ElementRef, afterNextRender, inject, input } from '@angular/core';

/**
 * Fades and lifts an element into place the first time it enters the viewport.
 * Pure CSS transition driven by one IntersectionObserver; reduced motion shows content immediately.
 *
 * ```html
 * <h2 atReveal>Title</h2>
 * <p atReveal [revealDelay]="120">Lead</p>
 * ```
 */
@Directive({
  selector: '[atReveal]',
  host: { class: 'reveal', '[style.--reveal-delay.ms]': 'revealDelay()' },
})
export class Reveal {
  readonly revealDelay = input(0);

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          }
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
      );
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
