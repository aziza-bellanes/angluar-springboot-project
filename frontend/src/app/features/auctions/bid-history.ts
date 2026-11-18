import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, effect, inject, input } from '@angular/core';
import { Bid } from '@app/core/models/api.models';
import { DateTimePipe, PricePipe } from '@app/core/util/format.pipes';
import { gsap, prefersReducedMotion } from '@app/shared/animations/motion';

/** Bid history, highest first; rows added after the first render slide in. */
@Component({
  selector: 'at-bid-history',
  imports: [PricePipe, DateTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="divide-y divide-ivory/10 border-y border-ivory/10" aria-label="Bid history">
      @for (bid of bids(); track bid.id) {
        <li class="bid-row flex items-center justify-between gap-4 py-3" [attr.data-id]="bid.id">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold">
              {{ bid.bidder }}
              @if (bid.bidderId === myId()) {
                <span class="ml-1 rounded-full bg-sunflower px-2 py-0.5 text-[0.65rem] font-bold tracking-wider text-midnight uppercase">You</span>
              }
            </p>
            <p class="text-xs text-ivory/50">{{ bid.createdAt | dateTime }}</p>
          </div>
          <p class="price text-lg font-semibold">{{ bid.amount | price }}</p>
        </li>
      } @empty {
        <li class="py-6 text-sm text-ivory/60">No bids yet. Be the first to bid.</li>
      }
    </ol>
  `,
})
export class BidHistory {
  readonly bids = input.required<Bid[]>();
  readonly myId = input<number | null>(null);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    let ready = false;
    let known = new Set<number>();
    const ctx = gsap.context(() => undefined, host);
    destroyRef.onDestroy(() => ctx.revert());
    afterNextRender(() => (ready = true));
    effect(() => {
      const ids = new Set(this.bids().map((b) => b.id));
      const fresh = [...ids].filter((id) => !known.has(id));
      known = ids;
      if (!ready || fresh.length === 0 || prefersReducedMotion()) {
        return;
      }
      queueMicrotask(() =>
        ctx.add(() => {
          const rows = fresh.map((id) => host.querySelector(`.bid-row[data-id="${id}"]`)).filter(Boolean);
          gsap.from(rows, { y: -16, opacity: 0, duration: 0.5, ease: 'power2.out' });
        }),
      );
    });
  }
}
