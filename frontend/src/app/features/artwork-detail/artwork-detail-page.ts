import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { GalleryApi } from '@app/core/api/gallery.api';
import { PricePipe } from '@app/core/util/format.pipes';
import { FlipTransition } from '@app/shared/animations/flip-transition.service';
import { gsap, prefersReducedMotion } from '@app/shared/animations/motion';
import { ArtworkCard } from '@app/shared/components/artwork-card';
import { AuctionStatusBadge } from '@app/shared/components/auction-status-badge';
import { Countdown } from '@app/shared/components/countdown';

/** Artwork detail: the painting on a night panel, the story and the auction on ivory. */
@Component({
  selector: 'at-artwork-detail-page',
  imports: [RouterLink, HlmTabsImports, PricePipe, ArtworkCard, AuctionStatusBadge, Countdown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './artwork-detail-page.html',
})
export default class ArtworkDetailPage {
  private readonly api = inject(GalleryApi);
  private readonly flip = inject(FlipTransition);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private ctx?: gsap.Context;

  readonly slug = input.required<string>();

  protected readonly artwork = rxResource({
    params: () => this.slug(),
    stream: ({ params }) => this.api.artwork(params),
  });

  protected readonly auction = rxResource({
    params: () => this.artwork.value()?.id,
    stream: ({ params }) =>
      this.api.auctions(['OPEN', 'SCHEDULED'], params, 1).pipe(
        map((page) => page.content[0] ?? null),
        catchError(() => of(null)),
      ),
  });

  protected readonly related = rxResource({
    params: () => this.artwork.value()?.artist.id,
    stream: ({ params }) =>
      this.api.artworks({ artistId: params, size: 5 }).pipe(
        map((page) => page.content),
        catchError(() => of([])),
      ),
  });

  protected readonly more = computed(() => {
    const current = this.artwork.value();
    return (this.related.value() ?? []).filter((item) => item.id !== current?.id).slice(0, 4);
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.ctx?.revert());
  }

  protected onImageLoaded(image: HTMLImageElement): void {
    this.flip.play(this.slug(), image);
    if (prefersReducedMotion()) {
      return;
    }
    this.ctx?.revert();
    this.ctx = gsap.context(() => {
      gsap.from('.detail-reveal', { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.09, delay: 0.35 });
    }, this.host);
  }
}
