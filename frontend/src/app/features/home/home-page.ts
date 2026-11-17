import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { GalleryApi } from '@app/core/api/gallery.api';
import { ExhibitionSummary } from '@app/core/models/api.models';
import { LongDatePipe, PricePipe } from '@app/core/util/format.pipes';
import { NightSky } from '@app/shared/animations/night-sky';
import { Reveal } from '@app/shared/animations/reveal.directive';
import { RiffleDeck } from '@app/shared/animations/riffle-deck';
import { AuctionStatusBadge } from '@app/shared/components/auction-status-badge';
import { Countdown } from '@app/shared/components/countdown';
import { inWords, listOf, surname } from './home-wording';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
/**
 * Homepage storyboard: the Riffle opening → an editorial statement → lots on the block →
 * the painters → the collection wall → rooms now showing → the collectors' register.
 * Every section is real catalogue data; navigation stays reachable at all times.
 */
@Component({
  selector: 'at-home-page',
  imports: [
    RouterLink,
    NightSky,
    Reveal,
    RiffleDeck,
    AuctionStatusBadge,
    Countdown,
    PricePipe,
    LongDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export default class HomePage {
  private readonly api = inject(GalleryApi);

  protected readonly artworks = toSignal(
    this.api.artworks({ size: 30 }).pipe(
      map((page) => page.content),
      catchError(() => of([])),
    ),
  );
  protected readonly auctions = toSignal(
    this.api.auctions(['OPEN'], undefined, 24).pipe(
      map((page) => page.content),
      catchError(() => of([])),
    ),
  );
  protected readonly artists = toSignal(
    this.api.artists(undefined, 0, 24).pipe(
      map((page) => page.content),
      catchError(() => of([])),
    ),
  );
  protected readonly exhibitions = toSignal(
    this.api.exhibitions(undefined, 0, 6).pipe(
      map((page) => page.content),
      catchError(() => of([])),
    ),
  );

  protected readonly worksInWords = computed(() => inWords(this.artworks()?.length ?? 0));
  protected readonly painterNames = computed(() =>
    listOf((this.artists() ?? []).map((a) => surname(a.name))),
  );
  protected readonly roomsInWords = computed(() =>
    inWords(this.exhibitions()?.length ?? 0).toLowerCase(),
  );

  protected readonly lead = computed(() => this.auctions()?.[0]);
  protected readonly nextLots = computed(() => this.auctions()?.slice(1, 4) ?? []);
  protected readonly wall = computed(() => this.artworks()?.slice(0, 12) ?? []);
  protected readonly inline = computed(() => {
    const works = this.artworks() ?? [];
    return [works[3], works[12], works[20]].filter(Boolean);
  });

  /** One painting per artist, used to preview a room while hovering its title. */
  private readonly coverByArtist = computed(() => {
    const covers = new Map<number, string>();
    for (const art of this.artworks() ?? []) {
      if (!covers.has(art.artistId)) {
        covers.set(art.artistId, art.imageUrl);
      }
    }
    return covers;
  });

  protected readonly preview = signal<string | null>(null);
  protected readonly previewX = signal(0);
  protected readonly previewY = signal(0);

  protected roman(index: number): string {
    return ROMAN[index] ?? String(index + 1);
  }

  protected coverOf(exhibition: ExhibitionSummary): string | null {
    return exhibition.coverUrl ?? this.coverByArtist().get(exhibition.artistId) ?? null;
  }

  protected showPreview(exhibition: ExhibitionSummary | null, event?: PointerEvent): void {
    if (event && event.pointerType !== 'mouse') {
      return;
    }
    if (event) {
      this.movePreview(event);
    }
    this.preview.set(exhibition ? this.coverOf(exhibition) : null);
  }

  protected movePreview(event: PointerEvent): void {
    this.previewX.set(event.clientX);
    this.previewY.set(event.clientY);
  }
}
