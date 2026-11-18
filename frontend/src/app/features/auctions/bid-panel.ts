import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { GalleryApi } from '@app/core/api/gallery.api';
import { messageOf } from '@app/core/api/problem';
import { AuthStore } from '@app/core/auth/auth.store';
import { Auction } from '@app/core/models/api.models';
import { formatPrice } from '@app/core/util/format';

/** Bid form with a confirmation dialog; tells the room to reload when the server rejects a bid. */
@Component({
  selector: 'at-bid-panel',
  imports: [RouterLink, HlmButton, HlmInput, HlmLabel, HlmDialogImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!auth.isAuthenticated()) {
      <a [routerLink]="['/login']" [queryParams]="{ returnUrl: '/auctions/' + auction().id }" class="btn-gold w-full">
        Sign in to bid
      </a>
    } @else {
      <form class="space-y-4" (submit)="$event.preventDefault(); ask()" novalidate>
        <div>
          <label hlmLabel for="bid-amount" class="text-ivory/80">Your bid (EUR)</label>
          <input
            hlmInput
            id="bid-amount"
            type="number"
            inputmode="decimal"
            class="mt-2 h-12 w-full text-lg"
            [min]="auction().minimumNextBid"
            [step]="auction().minimumIncrement"
            [disabled]="!canBid()"
            [value]="amount()"
            (input)="onInput($event)"
          />
        </div>
        <div class="flex flex-wrap gap-2" role="group" aria-label="Quick bid">
          @for (k of steps; track k) {
            <button
              type="button"
              class="btn-ghost-light !px-4 !py-2 disabled:opacity-40"
              [disabled]="!canBid()"
              (click)="quick(k)"
            >
              +{{ k }} {{ k === 1 ? 'increment' : 'increments' }}
            </button>
          }
        </div>
        @if (!canBid() && auth.isAuthenticated() && !auth.isBidder()) {
          <p class="text-sm text-ivory/70">Staff accounts cannot bid.</p>
        } @else if (auction().status !== 'OPEN') {
          <p class="text-sm text-ivory/70">Bidding is not open for this auction.</p>
        } @else if (tooLow()) {
          <p class="text-sm text-sunflower" role="alert">The minimum bid is {{ minimumText() }}.</p>
        } @else if (leading()) {
          <p class="text-sm text-sunflower">You are the highest bidder. Wait for another bid to raise yours.</p>
        }
        <button type="submit" class="btn-gold w-full" [disabled]="!canSubmit()">Place a bid</button>
        <p class="text-xs leading-relaxed text-ivory/60">Bid confirmations, outbid notices and winning results go to your account email. Follow this page for the live auction status.</p>
      </form>

      <hlm-dialog [state]="dialog() ? 'open' : 'closed'" (closed)="dialog.set(false)">
        <ng-template hlmDialogPortal>
          <hlm-dialog-content>
            <hlm-dialog-header>
              <h2 hlmDialogTitle>Confirm your bid</h2>
              <p hlmDialogDescription>
                Confirm your bid of {{ amountText() }} for {{ auction().artwork.title }}. Demonstration money only.
              </p>
            </hlm-dialog-header>
            <hlm-dialog-footer>
              <button type="button" hlmBtn variant="outline" hlmDialogClose>Cancel</button>
              <button type="button" hlmBtn [disabled]="pending()" (click)="confirm()">
                {{ pending() ? 'Sending…' : 'Confirm bid' }}
              </button>
            </hlm-dialog-footer>
          </hlm-dialog-content>
        </ng-template>
      </hlm-dialog>
    }
  `,
})
export class BidPanel {
  private readonly api = inject(GalleryApi);
  protected readonly auth = inject(AuthStore);

  readonly auction = input.required<Auction>();
  readonly refresh = output<void>();

  protected readonly steps = [1, 2, 5];
  protected readonly amount = signal(0);
  protected readonly dialog = signal(false);
  protected readonly pending = signal(false);

  protected readonly canBid = computed(() => this.auth.isBidder() && this.auction().status === 'OPEN');
  protected readonly leading = computed(
    () => !!this.auth.user() && this.auction().leadingBidderId === this.auth.user()!.id,
  );
  protected readonly tooLow = computed(() => this.amount() < this.auction().minimumNextBid);
  protected readonly canSubmit = computed(() => this.canBid() && !this.tooLow() && !this.leading() && this.amount() > 0);
  protected readonly amountText = computed(() => formatPrice(this.amount()));
  protected readonly minimumText = computed(() => formatPrice(this.auction().minimumNextBid));

  constructor() {
    // Keep the field at or above the minimum: follows new minimums unless a higher amount was typed.
    effect(() => {
      const min = this.auction().minimumNextBid;
      if (this.amount() < min) {
        this.amount.set(min);
      }
    });
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.amount.set(Number.isFinite(value) ? value : 0);
  }

  protected quick(count: number): void {
    const { minimumNextBid, minimumIncrement } = this.auction();
    this.amount.set(minimumNextBid + count * minimumIncrement);
  }

  protected ask(): void {
    if (this.canSubmit()) {
      this.dialog.set(true);
    }
  }

  protected confirm(): void {
    this.pending.set(true);
    const amount = this.amount();
    this.api.placeBid(this.auction().id, amount).subscribe({
      next: () => {
        this.pending.set(false);
        this.dialog.set(false);
        toast.success('Bid placed', { description: `You bid ${formatPrice(amount)} on ${this.auction().artwork.title}.` });
      },
      error: (err) => {
        this.pending.set(false);
        this.dialog.set(false);
        toast.error(messageOf(err));
        this.refresh.emit();
      },
    });
  }
}
