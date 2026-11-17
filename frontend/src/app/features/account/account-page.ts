import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { catchError, map, of } from 'rxjs';
import { GalleryApi } from '@app/core/api/gallery.api';
import { messageOf } from '@app/core/api/problem';
import { AuthStore } from '@app/core/auth/auth.store';
import { Auction, MyBid } from '@app/core/models/api.models';
import { DateTimePipe, PricePipe } from '@app/core/util/format.pipes';
import { AuctionStatusBadge } from '@app/shared/components/auction-status-badge';

type Tab = 'bids' | 'wins';

@Component({
  selector: 'at-account-page',
  imports: [RouterLink, HlmSkeleton, HlmTableImports, AuctionStatusBadge, PricePipe, DateTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-page.html',
})
export default class AccountPage {
  private readonly api = inject(GalleryApi);
  protected readonly auth = inject(AuthStore);

  protected readonly tab = signal<Tab>('bids');
  protected readonly roleLabels = computed(() =>
    this.auth.roles().map((r) => (r === 'ADMIN' ? 'Administrator' : r === 'COLLABORATEUR' ? 'Gallery staff' : 'Collector')),
  );

  protected readonly bidsState = toSignal(
    this.api.myBids(0, 50).pipe(
      map((page) => ({ items: page.content as MyBid[], error: null as string | null })),
      catchError((err) => of({ items: null, error: messageOf(err) })),
    ),
  );
  protected readonly winsState = toSignal(
    this.api.myWins().pipe(
      map((items) => ({ items: items as Auction[], error: null as string | null })),
      catchError((err) => of({ items: null, error: messageOf(err) })),
    ),
  );

  protected readonly tabs: { id: Tab; label: string }[] = [
    { id: 'bids', label: 'My bids' },
    { id: 'wins', label: 'Won works' },
  ];

  protected standing(bid: MyBid): 'Leading' | 'Outbid' | 'Won' | 'Lost' | 'Cancelled' {
    switch (bid.auctionStatus) {
      case 'CLOSED':
        return bid.leading ? 'Won' : 'Lost';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return bid.leading ? 'Leading' : 'Outbid';
    }
  }

  protected pillClass(standing: string): string {
    return standing === 'Leading' || standing === 'Won'
      ? 'bg-cypress text-ivory'
      : standing === 'Outbid' || standing === 'Lost'
        ? 'bg-terracotta text-ivory'
        : 'bg-muted text-muted-foreground';
  }
}
