import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { GalleryApi } from '@app/core/api/gallery.api';
import { messageOf } from '@app/core/api/problem';
import { Auction, AuctionEvent, AuctionStatus } from '@app/core/models/api.models';
import { AuctionSocket } from '@app/core/realtime/auction-socket.service';
import { PricePipe } from '@app/core/util/format.pipes';
import { AuctionStatusBadge } from '@app/shared/components/auction-status-badge';
import { Countdown } from '@app/shared/components/countdown';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';

interface Tab {
  status: AuctionStatus;
  label: string;
  empty: string;
}

const TABS: Tab[] = [
  { status: 'OPEN', label: 'Live', empty: 'No auction is open right now. Upcoming sales are listed in the next tab.' },
  { status: 'SCHEDULED', label: 'Upcoming', empty: 'No auction is scheduled at the moment. Please come back soon.' },
  { status: 'CLOSED', label: 'Closed', empty: 'No auction has closed yet.' },
];

@Component({
  selector: 'at-auctions-page',
  imports: [RouterLink, AuctionStatusBadge, Countdown, PricePipe, HlmSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auctions-page.html',
})
export default class AuctionsPage {
  private readonly api = inject(GalleryApi);
  protected readonly socket = inject(AuctionSocket);

  protected readonly tabs = TABS;
  protected readonly tab = signal<AuctionStatus>('OPEN');
  protected readonly auctions = signal<Auction[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly current = computed(() => TABS.find((t) => t.status === this.tab()) ?? TABS[0]);

  constructor() {
    toObservable(this.tab)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((status) =>
          this.api.auctions([status], undefined, 48).pipe(
            map((page) => page.content),
            catchError((err) => {
              this.error.set(messageOf(err));
              return of([] as Auction[]);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((list) => {
        this.auctions.set(list);
        this.loading.set(false);
      });

    this.socket
      .all()
      .pipe(takeUntilDestroyed())
      .subscribe((event) => this.patch(event));
  }

  protected select(status: AuctionStatus): void {
    this.tab.set(status);
  }

  private patch(event: AuctionEvent): void {
    const incoming = event.auction;
    const matches = incoming.status === this.tab();
    this.auctions.update((list) => {
      const index = list.findIndex((a) => a.id === incoming.id);
      if (index >= 0) {
        if (!matches) {
          return list.filter((a) => a.id !== incoming.id);
        }
        if (list[index].version > incoming.version) {
          return list;
        }
        return list.map((a) => (a.id === incoming.id ? incoming : a));
      }
      return matches && event.type !== 'BID_PLACED' ? [incoming, ...list] : list;
    });
  }
}
