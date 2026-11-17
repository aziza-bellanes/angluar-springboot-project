import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
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

interface Kpi {
  label: string;
  value: string | number;
  detail?: string;
  icon: string;
}

@Component({
  selector: 'at-studio-overview-page',
  imports: [RouterLink, NgIcon, HlmButton, HlmSkeleton, HlmTableImports, PricePipe, DateTimePipe, AuctionStatusBadge],
  providers: [provideIcons({ lucideGavel, lucideImage, lucideLandmark, lucidePalette, lucidePlus, lucideUsers })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-overview-page.html',
})
export default class StudioOverviewPage {
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(StudioApi);
  protected readonly overview = rxResource({ stream: () => this.api.overview() });
  protected readonly error = computed(() => (this.overview.error() ? messageOf(this.overview.error()) : null));

  protected readonly kpis = computed<Kpi[]>(() => {
    const o = this.overview.value();
    if (!o) return [];
    const cards: Kpi[] = [
      { label: 'Artists', value: o.artists, detail: 'Clients', icon: 'lucidePalette' },
      { label: 'Exhibitions', value: o.exhibitions, detail: 'Projets', icon: 'lucideLandmark' },
      { label: 'Artworks', value: o.publishedArtworks, detail: `${o.draftArtworks} in draft`, icon: 'lucideImage' },
      { label: 'Live auctions', value: o.openAuctions, detail: `${o.scheduledAuctions} upcoming · ${o.closedAuctions} closed`, icon: 'lucideGavel' },
    ];
    return cards;
  });
}
