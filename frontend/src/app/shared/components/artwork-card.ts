import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArtworkCard as ArtworkCardModel } from '@app/core/models/api.models';
import { FlipTransition } from '../animations/flip-transition.service';

/**
 * Gallery card: the painting first, editorial caption underneath. Clicking records the image
 * position so the detail page can grow the painting out of the card.
 */
@Component({
  selector: 'at-artwork-card',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      [routerLink]="['/artworks', artwork().slug]"
      (click)="flip.capture(artwork().slug, image)"
      class="group block space-y-3 outline-offset-4"
    >
      <div class="overflow-hidden rounded-[3px] bg-muted shadow-[0_18px_40px_-24px_rgb(16_29_53/0.6)]">
        <img
          #image
          [src]="artwork().imageUrl"
          [alt]="artwork().title + ' by ' + artwork().artistName"
          class="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-gallery group-hover:scale-[1.04]"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div class="space-y-1">
        <p class="font-display text-xl leading-snug group-hover:text-cobalt">{{ artwork().title }}</p>
        <p class="text-sm text-muted-foreground">
          {{ artwork().artistName }}@if (artwork().yearCreated) {<span> · {{ artwork().yearCreated }}</span>}
        </p>
      </div>
    </a>
  `,
})
export class ArtworkCard {
  readonly artwork = input.required<ArtworkCardModel>();
  protected readonly flip = inject(FlipTransition);
}
