import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { GalleryApi } from '@app/core/api/gallery.api';
import { PricePipe } from '@app/core/util/format.pipes';
import { RiffleDeck } from '@app/shared/animations/riffle-deck';
import { ArtworkCard } from '@app/shared/components/artwork-card';
import { AuctionStatusBadge } from '@app/shared/components/auction-status-badge';
import { Countdown } from '@app/shared/components/countdown';
import { SectionHeading } from '@app/shared/components/section-heading';

/**
 * Homepage storyboard: the Riffle deck opens the page → live auctions → recent arrivals → exhibitions → invitation.
 * Navigation and live auctions stay reachable at all times; the animation never blocks them.
 */
@Component({
  selector: 'at-home-page',
  imports: [
    RouterLink,
    RiffleDeck,
    ArtworkCard,
    AuctionStatusBadge,
    Countdown,
    SectionHeading,
    PricePipe,
  ],
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
}
