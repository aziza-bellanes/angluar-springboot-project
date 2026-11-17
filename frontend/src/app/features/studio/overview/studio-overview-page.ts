import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideGavel, lucideImage, lucideLandmark, lucidePalette, lucidePlus, lucideUsers } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { messageOf } from '@app/core/api/problem';
import { StudioApi } from '@app/core/api/studio.api';
import { AuthStore } from '@app/core/auth/auth.store';
import { DateTimePipe, PricePipe } from '@app/core/util/format.pipes';
import { AuctionStatusBadge } from '@app/shared/components/auction-status-badge';
import { ChartCanvas } from '../shared/chart-canvas';
import {
  BidMetric, Trend, auctionsByStatusConfig, auctionsSummary, bidActivityConfig, bidActivitySummary, shareOfTop, trendOf,
} from './overview-metrics';

interface Kpi {
  label: string;
  value: string | number;
  icon: string;
  /** Tailwind background of the round icon. */
  tone: string;
  trend: Trend;
}

interface Stat {
  label: string;
  value: string | number;
  detail: string;
}

@Component({
  selector: 'at-studio-overview-page',
  imports: [RouterLink, NgIcon, HlmButton, HlmSkeleton, HlmTableImports, PricePipe, DateTimePipe, AuctionStatusBadge, ChartCanvas],
  providers: [provideIcons({ lucideGavel, lucideImage, lucideLandmark, lucidePalette, lucidePlus, lucideUsers })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-overview-page.html',
})
export default class StudioOverviewPage {
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(StudioApi);
  protected readonly overview = rxResource({ stream: () => this.api.overview() });
  protected readonly error = computed(() => (this.overview.error() ? messageOf(this.overview.error()) : null));

  protected readonly metric = signal<BidMetric>('volume');
  protected readonly metrics: { id: BidMetric; label: string }[] = [
    { id: 'volume', label: 'Volume' },
    { id: 'bids', label: 'Bids' },
  ];

  protected readonly activityConfig = computed(() => bidActivityConfig(this.overview.value()?.bidActivity ?? [], this.metric()));
  protected readonly activityLabel = computed(() => bidActivitySummary(this.overview.value()?.bidActivity ?? []));
  protected readonly statusConfig = computed(() => {
    const o = this.overview.value();
    return auctionsByStatusConfig(o?.auctionsByStatus ?? { SCHEDULED: 0, OPEN: 0, CLOSED: 0, CANCELLED: 0 });
  });
  protected readonly statusLabel = computed(() => {
    const o = this.overview.value();
    return o ? auctionsSummary(o.auctionsByStatus) : '';
  });

  protected readonly artistShares = computed(() => shareOfTop(this.overview.value()?.topArtists ?? []));

  protected readonly kpis = computed<Kpi[]>(() => {
    const o = this.overview.value();
    if (!o) return [];
    const t = o.trends;
    return [
      { label: 'Artists', value: o.artists, icon: 'lucidePalette', tone: 'bg-terracotta', trend: trendOf(t.newArtists, t.newArtistsPrevious) },
      { label: 'Exhibitions', value: o.exhibitions, icon: 'lucideLandmark', tone: 'bg-sunflower-deep', trend: trendOf(t.newExhibitions, t.newExhibitionsPrevious) },
      { label: 'Bids placed', value: o.bids, icon: 'lucideGavel', tone: 'bg-cypress', trend: trendOf(t.bids, t.bidsPrevious) },
      { label: 'Users', value: o.users, icon: 'lucideUsers', tone: 'bg-cobalt', trend: trendOf(t.newUsers, t.newUsersPrevious) },
    ];
  });

  protected readonly stats = computed<Stat[]>(() => {
    const o = this.overview.value();
    if (!o) return [];
    return [
      { label: 'Artworks', value: o.publishedArtworks, detail: `${o.draftArtworks} in draft` },
      { label: 'Live auctions', value: o.openAuctions, detail: `${o.scheduledAuctions} upcoming · ${o.closedAuctions} closed` },
    ];
  });

  protected trendClass(trend: Trend): string {
    return trend.direction === 'up' || trend.direction === 'new' ? 'text-cypress' : trend.direction === 'down' ? 'text-terracotta' : 'text-muted-foreground';
  }
}
