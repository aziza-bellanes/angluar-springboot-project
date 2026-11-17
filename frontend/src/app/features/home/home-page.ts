import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { GalleryApi } from '@app/core/api/gallery.api';
import { PricePipe } from '@app/core/util/format.pipes';
import { NightSky } from '@app/shared/animations/night-sky';
import { RiffleGallery } from '@app/shared/animations/riffle-gallery';
import { gsap, prefersReducedMotion } from '@app/shared/animations/motion';
import { ArtworkCard } from '@app/shared/components/artwork-card';
import { AuctionStatusBadge } from '@app/shared/components/auction-status-badge';
import { Countdown } from '@app/shared/components/countdown';
import { SectionHeading } from '@app/shared/components/section-heading';

/**
 * Homepage storyboard: cinematic hero → Riffle sequence → live auctions → exhibitions → invitation.
 * Navigation and live auctions stay reachable at all times; the animation never blocks them.
 */
@Component({
  selector: 'at-home-page',
  imports: [RouterLink, NightSky, RiffleGallery, ArtworkCard, AuctionStatusBadge, Countdown, SectionHeading, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-page.html',
})
export default class HomePage {
  private readonly api = inject(GalleryApi);

  protected readonly artworks = toSignal(
    this.api.artworks({ size: 24 }).pipe(
      map((page) => page.content),
      catchError(() => of([])),
    ),
  );
  protected readonly auctions = toSignal(
    this.api.auctions(['OPEN'], undefined, 3).pipe(
      map((page) => page.content),
      catchError(() => of([])),
    ),
  );
  protected readonly exhibitions = toSignal(
    this.api.exhibitions(undefined, 0, 3).pipe(
      map((page) => page.content),
      catchError(() => of([])),
    ),
  );

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (prefersReducedMotion()) {
        return;
      }
      const ctx = gsap.context(() => {
        gsap.from('.hero-reveal', { y: 40, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12 });
      }, host);
      destroyRef.onDestroy(() => ctx.revert());
    });
  }
}
