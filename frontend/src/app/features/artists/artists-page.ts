import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { GalleryApi } from '@app/core/api/gallery.api';

/** Editorial index of artists, alphabetical, with a client-side search over the loaded list. */
@Component({
  selector: 'at-artists-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="canvas-texture min-h-dvh bg-ivory pt-28 pb-24">
      <div class="container-gallery">
        <header class="max-w-3xl">
          <p class="eyebrow">The artists</p>
          <h1 class="mt-3 font-display text-5xl leading-[1.02] md:text-7xl">Masters, in their own words.</h1>
        </header>

        <div class="mt-12 max-w-md">
          <label for="artist-search" class="eyebrow !text-[0.62rem]">Search artists</label>
          <input
            id="artist-search"
            type="search"
            autocomplete="off"
            placeholder="Name or country"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
            class="mt-1.5 h-10 w-full rounded-md border border-ink/15 bg-canvas px-3 text-sm outline-none focus-visible:border-cobalt focus-visible:ring-2 focus-visible:ring-cobalt/30"
          />
        </div>

        <ul class="mt-10 border-t border-ink/10">
          @for (artist of filtered(); track artist.id) {
            <li>
              <a
                [routerLink]="['/artists', artist.id]"
                class="grid gap-3 border-b border-ink/10 px-2 py-8 transition-colors duration-300 hover:bg-canvas focus-visible:bg-canvas focus-visible:outline-2 focus-visible:outline-cobalt md:grid-cols-[1.2fr_1.4fr_auto] md:items-center md:gap-10 md:px-6"
              >
                <div>
                  <p class="font-display text-4xl leading-tight md:text-5xl">{{ artist.name }}</p>
                  @if (artist.country) {
                    <p class="eyebrow mt-2">{{ artist.country }}</p>
                  }
                </div>
                <p class="line-clamp-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {{ artist.biography || 'Biography coming soon.' }}
                </p>
                <span class="text-sm font-semibold">View profile →</span>
              </a>
            </li>
          } @empty {
            @if (loaded()) {
              <li class="py-16 text-center text-muted-foreground">No artist matches your search.</li>
            } @else {
              @for (n of [1, 2, 3, 4]; track n) {
                <li class="py-8" aria-hidden="true"><div class="h-12 w-1/2 animate-pulse rounded bg-ink/10"></div></li>
              }
            }
          }
        </ul>
      </div>
    </section>
  `,
})
export default class ArtistsPage {
  private readonly api = inject(GalleryApi);

  protected readonly query = signal('');
  private readonly all = toSignal(
    this.api.artists(undefined, 0, 500).pipe(
      map((page) => page.content),
      catchError(() => of([])),
    ),
  );
  protected readonly loaded = computed(() => this.all() !== undefined);
  protected readonly filtered = computed(() => {
    const term = this.query().trim().toLowerCase();
    return [...(this.all() ?? [])]
      .filter((a) => !term || a.name.toLowerCase().includes(term) || (a.country ?? '').toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
}
