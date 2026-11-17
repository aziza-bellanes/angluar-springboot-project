import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Editorial heading: small eyebrow, large serif title, optional lead paragraph. */
@Component({
  selector: 'at-section-heading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="eyebrow">{{ eyebrow() }}</p>
    <h2 class="mt-3 font-display text-4xl leading-[1.05] md:text-6xl">{{ title() }}</h2>
    @if (lead()) {
      <p class="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">{{ lead() }}</p>
    }
    <ng-content />
  `,
})
export class SectionHeading {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly lead = input<string>();
}
