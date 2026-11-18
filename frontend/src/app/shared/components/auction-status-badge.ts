import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AuctionStatus } from '@app/core/models/api.models';

const STYLES: Record<AuctionStatus, { label: string; classes: string }> = {
  OPEN: { label: 'Live', classes: 'bg-cypress text-ivory' },
  SCHEDULED: { label: 'Upcoming', classes: 'bg-cobalt text-ivory' },
  CLOSED: { label: 'Closed', classes: 'bg-midnight/80 text-ivory' },
  CANCELLED: { label: 'Cancelled', classes: 'bg-terracotta text-ivory' },
};

@Component({
  selector: 'at-auction-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold tracking-[0.14em] uppercase"
      [class]="style().classes"
    >
      @if (status() === 'OPEN') {
        <span class="size-1.5 animate-pulse rounded-full bg-sunflower"></span>
      }
      {{ style().label }}
    </span>
  `,
})
export class AuctionStatusBadge {
  readonly status = input.required<AuctionStatus>();
  protected readonly style = computed(() => STYLES[this.status()]);
}
