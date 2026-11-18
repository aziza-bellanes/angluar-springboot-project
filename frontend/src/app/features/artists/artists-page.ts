import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { GalleryApi } from '@app/core/api/gallery.api';
import { ArtworkCard } from '@app/core/models/api.models';
import { Reveal } from '@app/shared/animations/reveal.directive';

/** Paintings shown beside each artist in the index. */
const STRIP_SIZE = 3;

/**
 * Editorial index of artists: name, country and a strip of their paintings, alphabetical,
 * with a client-side search over the loaded list.
 */
@Component({
  selector: 'at-artists-page',
  imports: [RouterLink, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="canvas-texture min-h-dvh bg-ivory pt-32 pb-24">
      <div class="container-gallery">
        <header class="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div atReveal>
            <p class="font-mono text-[11px] tracking-[0.32em] text-midnight/50 uppercase">
              The artists · {{ pad(all()?.length ?? 0) }}
            </p>
            <h1 class="mt-4 font-display text-5xl leading-[1.02] md:text-7xl">
              The painters who changed <em class="text-cobalt">how light was seen.</em>
            </h1>
          </div>
          <div atReveal [revealDelay]="100">
            <label
              for="artist-search"
              class="font-mono text-[10px] tracking-[0.28em] text-midnight/50 uppercase"
              >Search the index</label
            >
            <input
              id="artist-search"
              type="search"
              autocomplete="off"
              placeholder="Name or country"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
              class="mt-2 h-11 w-full rounded-full border border-midnight/15 bg-white/50 px-5 text-sm outline-none focus-visible:border-cobalt focus-visible:ring-2 focus-visible:ring-cobalt/30"
            />
          </div>
        </header>

        <ol class="mt-16 border-t border-midnight/15">
          @for (artist of filtered(); track artist.id; let i = $index) {
            <li atReveal [revealDelay]="(i % 3) * 60">
              <a
                [routerLink]="['/artists', artist.id]"
                class="group grid gap-6 border-b border-midnight/15 py-10 focus-visible:outline-2 focus-visible:outline-cobalt md:grid-cols-[3rem_1.1fr_1.3fr] md:items-center md:gap-10"
              >
                <span class="font-mono text-xs tracking-[0.2em] text-midnight/40 tabular-nums">{{
                  pad(i + 1)
                }}</span>
                <span class="min-w-0">
                  <span
                    class="block font-display text-4xl leading-tight transition-transform duration-500 ease-gallery group-hover:translate-x-2 group-hover:italic md:text-5xl"
                    >{{ artist.name }}</span
                  >
                  <span
                    class="mt-3 block font-mono text-[10px] tracking-[0.26em] text-midnight/50 uppercase"
                  >
                    {{ artist.country || 'Country unknown' }} ·
                    {{ worksOf(artist.id).length }} works
                  </span>
                  <span
                    class="mt-4 line-clamp-2 block max-w-md text-sm leading-relaxed text-midnight/65"
                  >
                    {{ artist.biography || 'Biography coming soon.' }}
                  </span>
                </span>
                <span class="grid grid-cols-3 gap-3">
                  @for (art of worksOf(artist.id).slice(0, strip); track art.id; let j = $index) {
                    <span
                      class="block overflow-hidden rounded-[14px] bg-midnight/5 shadow-[0_18px_40px_-26px_rgb(16_29_53/0.6)] transition-transform duration-700 ease-gallery"
                      [class]="j === 1 ? 'group-hover:-translate-y-2' : 'group-hover:translate-y-1'"
                    >
                      <img
                        [src]="art.imageUrl"
                        [alt]="art.title"
                        class="aspect-[4/5] w-full object-cover transition-transform duration-[1.2s] ease-gallery group-hover:scale-105"
                        loading="lazy"
                      />
                    </span>
                  }
                </span>
              </a>
            </li>
          } @empty {
            @if (loaded()) {
              <li class="py-16 text-center text-midnight/60">No artist matches your search.</li>
            } @else {
              @for (n of [1, 2, 3]; track n) {
                <li class="border-b border-midnight/10 py-10" aria-hidden="true">
                  <div class="h-12 w-1/2 animate-pulse rounded bg-midnight/10"></div>
                </li>
              }
            }
          }
        </ol>
      </div>
    </section>
  `,
})
export default class ArtistsPage {
  private readonly api = inject(GalleryApi);
  protected readonly strip = STRIP_SIZE;

  protected readonly query = signal('');
  protected readonly all = toSignal(
    this.api.artists(undefined, 0, 500).pipe(
      map((page) => page.content),
      catchError(() => of([])),
    ),
  );
  private readonly artworks = toSignal(
    this.api.artworks({ size: 200 }).pipe(
      map((page) => page.content),
      catchError(() => of([] as ArtworkCard[])),
    ),
  );
  private readonly worksByArtist = computed(() => {
    const groups = new Map<number, ArtworkCard[]>();
    for (const art of this.artworks() ?? []) {
      groups.set(art.artistId, [...(groups.get(art.artistId) ?? []), art]);
    }
    return groups;
  });

  protected readonly loaded = computed(() => this.all() !== undefined);
  protected readonly filtered = computed(() => {
    const term = this.query().trim().toLowerCase();
    return [...(this.all() ?? [])]
      .filter(
        (a) =>
          !term ||
          a.name.toLowerCase().includes(term) ||
          (a.country ?? '').toLowerCase().includes(term),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  protected worksOf(artistId: number): ArtworkCard[] {
    return this.worksByArtist().get(artistId) ?? [];
  }

  protected pad(value: number): string {
    return String(value).padStart(2, '0');
  }
}
