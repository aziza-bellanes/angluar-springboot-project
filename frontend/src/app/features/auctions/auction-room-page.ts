import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import { GalleryApi } from '@app/core/api/gallery.api';
import { messageOf } from '@app/core/api/problem';
import { AuthStore } from '@app/core/auth/auth.store';
import { Auction, AuctionEvent, Bid } from '@app/core/models/api.models';
import { AuctionSocket } from '@app/core/realtime/auction-socket.service';
import { formatPrice } from '@app/core/util/format';
import { PricePipe } from '@app/core/util/format.pipes';
import { gsap, prefersReducedMotion } from '@app/shared/animations/motion';
import { AuctionStatusBadge } from '@app/shared/components/auction-status-badge';
import { Countdown } from '@app/shared/components/countdown';
import { BidHistory } from './bid-history';
import { BidPanel } from './bid-panel';

@Component({
  selector: 'at-auction-room-page',
  imports: [RouterLink, AuctionStatusBadge, Countdown, PricePipe, HlmSkeleton, BidPanel, BidHistory],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auction-room-page.html',
})
export default class AuctionRoomPage {
  readonly id = input.required<string>();

  private readonly api = inject(GalleryApi);
  private readonly socket = inject(AuctionSocket);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthStore);

  protected readonly auction = signal<Auction | null>(null);
  protected readonly bids = signal<Bid[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly extended = signal(false);
  protected readonly displayPrice = signal(0);

  protected readonly myId = computed(() => this.auth.user()?.id ?? null);
  protected readonly iLead = computed(() => {
    const a = this.auction();
    return !!a && this.myId() !== null && a.leadingBidderId === this.myId();
  });
  protected readonly iWon = computed(() => {
    const a = this.auction();
    return !!a && a.status === 'CLOSED' && this.myId() !== null && a.winnerId === this.myId();
  });

  private readonly priceEl = viewChild<ElementRef<HTMLElement>>('priceEl');
  private tween: gsap.core.Tween | null = null;
  private shownPrice: number | null = null;

  constructor() {
    const numericId$ = toObservable(this.id);

    numericId$
      .pipe(
        tap(() => {
          this.auction.set(null);
          this.bids.set([]);
          this.error.set(null);
          this.extended.set(false);
          this.shownPrice = null;
        }),
        switchMap((id) =>
          forkJoin({
            auction: this.api.auction(Number(id)),
            bids: this.api.bids(Number(id), 30).pipe(catchError(() => of(null))),
          }).pipe(
            catchError((err) => {
              this.error.set(messageOf(err));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result) {
          this.auction.set(result.auction);
          this.bids.set(result.bids?.content ?? []);
        }
      });

    numericId$
      .pipe(
        switchMap((id) => this.socket.auction(Number(id))),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.onEvent(event));

    effect(() => {
      const price = this.auction()?.currentPrice;
      if (price !== undefined) {
        this.animatePrice(price);
      }
    });
    this.destroyRef.onDestroy(() => this.tween?.kill());
  }

  /** Reloads the authoritative state, e.g. after the server rejected a bid. */
  protected reload(): void {
    this.api.auction(Number(this.id())).subscribe({
      next: (auction) => this.apply(auction),
      error: (err) => toast.error(messageOf(err)),
    });
  }

  private onEvent(event: AuctionEvent): void {
    this.apply(event.auction);
    const bid = event.bid;
    if (bid) {
      this.bids.update((list) => (list.some((b) => b.id === bid.id) ? list : [bid, ...list]));
    }
  }

  private apply(next: Auction): void {
    const prev = this.auction();
    if (prev && next.version < prev.version) {
      return;
    }
    if (prev) {
      const me = this.myId();
      if (me !== null && prev.leadingBidderId === me && next.leadingBidderId !== me && next.status === 'OPEN') {
        toast.warning('You have been outbid', {
          description: `${next.leadingBidder ?? 'Another collector'} now leads with ${formatPrice(next.currentPrice)}.`,
        });
      }
      if (prev.status !== 'CLOSED' && next.status === 'CLOSED') {
        if (me !== null && next.winnerId === me) {
          toast.success('You won this auction', {
            description: `${next.artwork.title} is yours for ${formatPrice(next.currentPrice)}.`,
          });
        } else {
          toast(`Auction closed at ${formatPrice(next.currentPrice)}`, {
            description: next.winner ? `Won by ${next.winner}.` : 'There was no winning bid.',
          });
        }
      }
      if (next.status === 'OPEN' && new Date(next.endsAt).getTime() > new Date(prev.endsAt).getTime()) {
        this.extended.set(true);
      }
    }
    this.auction.set(next);
  }

  private animatePrice(price: number): void {
    const previous = this.shownPrice;
    this.shownPrice = price;
    this.tween?.kill();
    const el = this.priceEl()?.nativeElement;
    if (previous === null || previous === price || prefersReducedMotion() || !el) {
      this.displayPrice.set(price);
      return;
    }
    const proxy = { value: previous };
    this.tween = gsap.to(proxy, {
      value: price,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => this.displayPrice.set(Math.round(proxy.value)),
      onComplete: () => this.displayPrice.set(price),
    });
    gsap.fromTo(
      el,
      { scale: 1.08, color: '#e7b84b' },
      { scale: 1, color: '#f4edde', duration: 1.1, ease: 'power3.out', transformOrigin: 'left center', clearProps: 'color,transform' },
    );
  }

  protected readonly displayText = computed(() => formatPrice(this.displayPrice()));
}
