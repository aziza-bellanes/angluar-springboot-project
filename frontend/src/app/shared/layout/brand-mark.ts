import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** ATELIER wordmark: editorial serif with a single golden star. */
@Component({
  selector: 'at-brand-mark',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      [routerLink]="link()"
      class="group inline-flex items-baseline gap-1.5"
      aria-label="ATELIER home"
    >
      <span class="font-display text-2xl font-semibold tracking-[0.2em]">ATELIER</span>
      <span
        class="size-1.5 rounded-full bg-sunflower transition-transform duration-500 group-hover:scale-150"
      ></span>
    </a>
  `,
})
export class BrandMark {
  readonly link = input<string>('/');
}
