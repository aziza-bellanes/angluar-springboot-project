import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideGavel,
  lucideImage,
  lucideLandmark,
  lucideMinus,
  lucidePalette,
  lucidePlus,
  lucideTimer,
  lucideTrendingDown,
  lucideTrendingUp,
  lucideTrophy,
  lucideUsers,
  lucideWallet,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { messageOf } from '@app/core/api/problem';
import { StudioApi } from '@app/core/api/studio.api';
import { AuthStore } from '@app/core/auth/auth.store';
import { DateTimePipe, LongDatePipe, PricePipe } from '@app/core/util/format.pipes';
import { AuctionStatusBadge } from '@app/shared/components/auction-status-badge';
import { Countdown } from '@app/shared/components/countdown';
import { ChartCanvas } from '../shared/chart-canvas';
import { SERIES, TONES, Tone } from '../shared/tones';
import {
  ActivityRange,
  Trend,
  activityTotals,
  auctionsByStatusConfig,
  auctionsSummary,
  bidActivityConfig,
  bidActivitySummary,
  greeting,
  inRange,
  shareOfTop,
  statusSlices,
  trendOf,
} from './overview-metrics';

interface Kpi {
  label: string;
  value: string | number;
  icon: string;
  tone: Tone;
  trend: Trend;
  link: string;
}

interface Stat {
  label: string;
  value: string | number;
  detail: string;
  icon: string;
  tone: Tone;
}

const TREND_ICON: Record<Trend['direction'], string> = {
  up: 'lucideTrendingUp',
  new: 'lucideTrendingUp',
  down: 'lucideTrendingDown',
  flat: 'lucideMinus',
};

/** Studio overview: KPI cards, bid activity, auctions by status, rankings and work queues. */
@Component({
  selector: 'at-studio-overview-page',
  imports: [
    RouterLink,
    NgIcon,
    HlmButton,
    HlmSkeleton,
    HlmTableImports,
    PricePipe,
    DateTimePipe,
    LongDatePipe,
    AuctionStatusBadge,
    ChartCanvas,
    Countdown,
  ],
  providers: [
    provideIcons({
      lucideArrowRight,
      lucideGavel,
      lucideImage,
      lucideLandmark,
      lucideMinus,
      lucidePalette,
      lucidePlus,
      lucideTimer,
      lucideTrendingDown,
      lucideTrendingUp,
      lucideTrophy,
      lucideUsers,
      lucideWallet,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-overview-page.html',
})
export default class StudioOverviewPage {
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(StudioApi);
  protected readonly overview = rxResource({ stream: () => this.api.overview() });
  protected readonly error = computed(() =>
    this.overview.error() ? messageOf(this.overview.error()) : null,
  );

  protected readonly tones = TONES;
  protected readonly hello = `${greeting(new Date().getHours())}, ${this.auth.user()?.firstName ?? 'there'}`;
  protected readonly today = new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD

  protected readonly range = signal<ActivityRange>(7);
  protected readonly ranges: ActivityRange[] = [7, 14];

  private readonly activity = computed(() =>
    inRange(this.overview.value()?.bidActivity ?? [], this.range()),
  );
  protected readonly activityConfig = computed(() => bidActivityConfig(this.activity()));
  protected readonly activityLabel = computed(() => bidActivitySummary(this.activity()));
  protected readonly totals = computed(() => activityTotals(this.activity()));

  protected readonly slices = computed(() =>
    statusSlices(this.overview.value()?.auctionsByStatus ?? {}),
  );
  protected readonly auctionTotal = computed(() =>
    this.slices().reduce((sum, s) => sum + s.count, 0),
  );
  protected readonly statusConfig = computed(() => auctionsByStatusConfig(this.slices()));
  protected readonly statusLabel = computed(() => auctionsSummary(this.slices()));

  protected readonly artistShares = computed(() =>
    shareOfTop(this.overview.value()?.topArtists ?? []),
  );
  protected readonly series = SERIES;

  protected readonly kpis = computed<Kpi[]>(() => {
    const o = this.overview.value();
    if (!o) return [];
    const t = o.trends;
    return [
      {
        label: 'Artists',
        value: o.artists,
        icon: 'lucidePalette',
        tone: 'artists',
        link: '/studio/artists',
        trend: trendOf(t.newArtists, t.newArtistsPrevious),
      },
      {
        label: 'Exhibitions',
        value: o.exhibitions,
        icon: 'lucideLandmark',
        tone: 'exhibitions',
        link: '/studio/exhibitions',
        trend: trendOf(t.newExhibitions, t.newExhibitionsPrevious),
      },
      {
        label: 'Bids placed',
        value: o.bids,
        icon: 'lucideGavel',
        tone: 'auctions',
        link: this.auth.isAdmin() ? '/studio/auctions' : '/studio',
        trend: trendOf(t.bids, t.bidsPrevious),
      },
      {
        label: 'Users',
        value: o.users,
        icon: 'lucideUsers',
        tone: 'users',
        link: this.auth.isAdmin() ? '/studio/users' : '/studio',
        trend: trendOf(t.newUsers, t.newUsersPrevious),
      },
    ];
  });

  protected readonly stats = computed<Stat[]>(() => {
    const o = this.overview.value();
    if (!o) return [];
    return [
      {
        label: 'Artworks',
        value: o.publishedArtworks,
        detail: `${o.draftArtworks} in draft`,
        icon: 'lucideImage',
        tone: 'artworks',
      },
      {
        label: 'Live auctions',
        value: o.openAuctions,
        detail: `${o.scheduledAuctions} upcoming · ${o.closedAuctions} closed`,
        icon: 'lucideTimer',
        tone: 'overview',
      },
    ];
  });

  protected trendIcon(trend: Trend): string {
    return TREND_ICON[trend.direction];
  }

  protected trendContext(trend: Trend): string {
    return trend.direction === 'new' ? 'new this week' : 'vs last week';
  }

  protected trendClass(trend: Trend): string {
    if (trend.direction === 'up' || trend.direction === 'new')
      return 'bg-emerald-50 text-emerald-700';
    if (trend.direction === 'down') return 'bg-rose-50 text-rose-700';
    return 'bg-muted text-muted-foreground';
  }
}
