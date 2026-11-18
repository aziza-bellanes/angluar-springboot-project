import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { GalleryApi } from '@app/core/api/gallery.api';
import { LongDatePipe, PricePipe } from '@app/core/util/format.pipes';
import { NightSky } from '@app/shared/animations/night-sky';
import { Reveal } from '@app/shared/animations/reveal.directive';
import { Countdown } from '@app/shared/components/countdown';

/**
 * Artist profile: night hero with the biography, key figures and a signature painting,
 * then their open lots, their works uncropped and the rooms showing them.
 */
@Component({
  selector: 'at-artist-profile-page',
  imports: [RouterLink, NightSky, Reveal, Countdown, LongDatePipe, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (artist.error()) {
      <section class="canvas-texture flex min-h-dvh items-center bg-ivory pt-28 pb-20">
        <div class="container-gallery max-w-2xl text-center">
          <h1 class="font-display text-5xl">This artist could not be found.</h1>
          <a routerLink="/artists" class="btn-gold mt-8">All artists</a>
        </div>
      </section>
    } @else {
      <section class="night relative overflow-hidden pt-32 pb-20 md:pt-36">
        <at-night-sky />
        <div
          class="container-gallery relative z-10 grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:items-center"
        >
          <div>
            <a
              routerLink="/artists"
              class="font-mono text-[11px] tracking-[0.3em] text-sunflower uppercase hover:underline"
              >← The artists</a
            >
            @if (artist.value(); as a) {
              <h1 class="mt-6 font-display text-6xl leading-[0.95] md:text-8xl">{{ a.name }}</h1>
              @if (a.country) {
                <p class="mt-5 font-mono text-[11px] tracking-[0.3em] text-ivory/55 uppercase">
                  {{ a.country }}
                </p>
              }
              <p class="mt-8 max-w-2xl text-lg leading-relaxed text-ivory/75">
                {{ a.biography || 'Biography coming soon.' }}
              </p>
            } @else {
              <div class="mt-6 h-20 w-2/3 animate-pulse rounded bg-ivory/10"></div>
            }

            <dl class="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-ivory/15 pt-6">
              <div>
                <dt class="font-mono text-[10px] tracking-[0.26em] text-ivory/50 uppercase">
                  Works
                </dt>
                <dd class="mt-1 font-display text-4xl tabular-nums">
                  {{ artworks.value()?.length ?? '—' }}
                </dd>
              </div>
              <div>
                <dt class="font-mono text-[10px] tracking-[0.26em] text-ivory/50 uppercase">
                  Rooms
                </dt>
                <dd class="mt-1 font-display text-4xl tabular-nums">
                  {{ exhibitions.value()?.length ?? '—' }}
                </dd>
              </div>
              <div>
                <dt class="font-mono text-[10px] tracking-[0.26em] text-ivory/50 uppercase">
                  Open lots
                </dt>
                <dd class="mt-1 font-display text-4xl tabular-nums">{{ lots().length }}</dd>
              </div>
            </dl>
          </div>

          @if (featured(); as art) {
            <a
              [routerLink]="['/artworks', art.slug]"
              class="group relative mx-auto block w-full max-w-md rotate-[-2deg] transition-transform duration-700 ease-gallery hover:rotate-0"
            >
              <img
                [src]="art.imageUrl"
                [alt]="art.title"
                class="w-full rounded-[22px] shadow-[0_40px_90px_-30px_rgb(0_0_0/0.75)]"
              />
              <span
                class="absolute -bottom-5 left-6 rounded-xl border border-white/70 bg-[#fbf8f1]/90 px-4 py-2.5 text-midnight shadow-xl backdrop-blur"
              >
                <span class="block font-display text-lg leading-tight italic">{{ art.title }}</span>
                @if (art.yearCreated) {
                  <span
                    class="font-mono text-[10px] tracking-[0.24em] text-midnight/55 uppercase"
                    >{{ art.yearCreated }}</span
                  >
                }
              </span>
            </a>
          } @else if (photo(); as src) {
            <img
              [src]="src"
              [alt]="artist.value()?.name"
              class="mx-auto size-56 rounded-full object-cover"
            />
          }
        </div>
      </section>

      @if (lots().length) {
        <section class="border-b border-midnight/10 bg-ivory py-14 text-midnight">
          <div class="container-gallery">
            <p
              class="flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] text-terracotta uppercase"
            >
              <span class="size-1.5 animate-pulse rounded-full bg-current"></span> On the block now
            </p>
            <ul class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              @for (lot of lots(); track lot.id) {
                <li>
                  <a
                    [routerLink]="['/auctions', lot.id]"
                    class="group grid grid-cols-[72px_1fr] items-center gap-4 rounded-2xl border border-midnight/10 bg-white/40 p-3 transition-colors hover:border-midnight/30"
                  >
                    <img
                      [src]="lot.artwork.imageUrl"
                      [alt]="lot.artwork.title"
                      class="aspect-square w-full rounded-xl object-cover"
                    />
                    <span class="min-w-0">
                      <span class="block truncate font-display text-xl group-hover:italic">{{
                        lot.artwork.title
                      }}</span>
                      <span
                        class="mt-1 flex justify-between gap-3 font-mono text-[11px] tabular-nums"
                      >
                        <span>{{ lot.currentPrice | price }}</span>
                        <span class="text-midnight/55"><at-countdown [until]="lot.endsAt" /></span>
                      </span>
                    </span>
                  </a>
                </li>
              }
            </ul>
          </div>
        </section>
      }

      <section class="canvas-texture bg-ivory py-20 text-midnight">
        <div class="container-gallery">
          <p class="font-mono text-[11px] tracking-[0.3em] text-midnight/50 uppercase">Works</p>
          <h2 class="mt-3 font-display text-4xl md:text-5xl">In the collection</h2>
          <div class="mt-12 columns-2 gap-6 md:columns-3 xl:columns-4">
            @for (item of artworks.value() ?? []; track item.id; let i = $index) {
              <a
                atReveal
                [revealDelay]="(i % 4) * 70"
                [routerLink]="['/artworks', item.slug]"
                class="group mb-10 block break-inside-avoid"
              >
                <span
                  class="block overflow-hidden rounded-[14px] shadow-[0_24px_50px_-30px_rgb(16_29_53/0.55)]"
                >
                  <img
                    [src]="item.imageUrl"
                    [alt]="item.title"
                    class="w-full transition-transform duration-[1.2s] ease-gallery group-hover:scale-[1.035]"
                    loading="lazy"
                  />
                </span>
                <span class="mt-4 block font-display text-xl leading-snug group-hover:italic">{{
                  item.title
                }}</span>
                @if (item.yearCreated) {
                  <span
                    class="mt-1 block font-mono text-[10px] tracking-[0.24em] text-midnight/50 uppercase"
                    >{{ item.yearCreated }}</span
                  >
                }
              </a>
            } @empty {
              @if (!artworks.isLoading()) {
                <p class="text-midnight/60">No works by this artist are on view yet.</p>
              }
            }
          </div>
        </div>
      </section>

      @if (exhibitions.value()?.length) {
        <section class="bg-canvas py-20 text-midnight">
          <div class="container-gallery">
            <p class="font-mono text-[11px] tracking-[0.3em] text-midnight/50 uppercase">
              Now showing
            </p>
            <h2 class="mt-3 font-display text-4xl md:text-5xl">Rooms</h2>
            <ul class="mt-10 border-t border-midnight/15">
              @for (show of exhibitions.value(); track show.id) {
                <li
                  class="grid gap-3 border-b border-midnight/15 py-8 md:grid-cols-[1.5fr_1fr_1fr] md:items-baseline"
                >
                  <div>
                    <p class="font-display text-3xl md:text-4xl">{{ show.title }}</p>
                    @if (show.description) {
                      <p class="mt-2 max-w-xl text-sm leading-relaxed text-midnight/60">
                        {{ show.description }}
                      </p>
                    }
                  </div>
                  <p class="font-mono text-[11px] tracking-[0.2em] text-midnight/60 uppercase">
                    {{ show.venue || 'Venue to be announced' }}
                  </p>
                  <p class="text-sm text-midnight/60 md:text-right">
                    @if (show.startsOn) {
                      {{ show.startsOn | longDate }}
                      @if (show.endsOn) {
                        → {{ show.endsOn | longDate }}
                      }
                    } @else {
                      Dates to be announced
                    }
                  </p>
                </li>
              }
            </ul>
          </div>
        </section>
      }
    }
  `,
})
export default class ArtistProfilePage {
  private readonly api = inject(GalleryApi);

  readonly id = input.required<string>();
  private readonly artistId = computed(() => Number(this.id()));

  protected readonly artist = rxResource({
    params: () => this.artistId(),
    stream: ({ params }) => this.api.artist(params),
  });
  protected readonly artworks = rxResource({
    params: () => this.artistId(),
    stream: ({ params }) =>
      this.api.artworks({ artistId: params, size: 48 }).pipe(
        map((page) => page.content),
        catchError(() => of([])),
      ),
  });
  protected readonly exhibitions = rxResource({
    params: () => this.artistId(),
    stream: ({ params }) =>
      this.api.exhibitions(params).pipe(
        map((page) => page.content),
        catchError(() => of([])),
      ),
  });
  private readonly openAuctions = toSignal(
    this.api.auctions(['OPEN'], undefined, 100).pipe(
      map((page) => page.content),
      catchError(() => of([])),
    ),
  );

  /** Open lots for this artist's works. */
  protected readonly lots = computed(() =>
    (this.openAuctions() ?? []).filter((lot) => lot.artwork.artistId === this.artistId()),
  );
  protected readonly featured = computed(() => this.artworks.value()?.[0]);
  protected readonly photo = computed(() => this.artist.value()?.photoUrl);
}
