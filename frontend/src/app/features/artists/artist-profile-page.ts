import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { GalleryApi } from '@app/core/api/gallery.api';
import { LongDatePipe } from '@app/core/util/format.pipes';
import { NightSky } from '@app/shared/animations/night-sky';
import { ArtworkCard } from '@app/shared/components/artwork-card';

/** Artist profile: night hero with the biography, then their works and exhibitions. */
@Component({
  selector: 'at-artist-profile-page',
  imports: [RouterLink, NightSky, ArtworkCard, LongDatePipe],
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
      <section class="night relative overflow-hidden pt-36 pb-24">
        <at-night-sky />
        <div class="container-gallery relative z-10 grid gap-10 md:grid-cols-[auto_1fr] md:items-end">
          @if (artist.value()?.photoUrl; as photo) {
            <img [src]="photo" [alt]="artist.value()?.name" class="size-40 rounded-full object-cover md:size-56" />
          }
          <div class="max-w-3xl">
            <a routerLink="/artists" class="eyebrow !text-sunflower hover:underline">← The artists</a>
            @if (artist.value(); as a) {
              <h1 class="mt-4 font-display text-6xl leading-[0.95] md:text-8xl">{{ a.name }}</h1>
              @if (a.country) {
                <p class="eyebrow mt-4 !text-ivory/60">{{ a.country }}</p>
              }
              <p class="mt-8 text-lg leading-relaxed text-ivory/75">{{ a.biography || 'Biography coming soon.' }}</p>
            } @else {
              <div class="mt-6 h-20 w-2/3 animate-pulse rounded bg-ivory/10"></div>
            }
          </div>
        </div>
      </section>

      <section class="canvas-texture bg-ivory py-20">
        <div class="container-gallery">
          <p class="eyebrow">Works</p>
          <h2 class="mt-3 font-display text-4xl md:text-5xl">In the collection</h2>
          <div class="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 xl:grid-cols-4">
            @for (item of artworks.value() ?? []; track item.id) {
              <at-artwork-card [artwork]="item" />
            } @empty {
              @if (!artworks.isLoading()) {
                <p class="col-span-full text-muted-foreground">No works by this artist are on view yet.</p>
              }
            }
          </div>
        </div>
      </section>

      @if (exhibitions.value()?.length) {
        <section class="bg-canvas py-20">
          <div class="container-gallery">
            <p class="eyebrow">Exhibitions</p>
            <h2 class="mt-3 font-display text-4xl md:text-5xl">Shows</h2>
            <ul class="mt-10 border-t border-ink/10">
              @for (show of exhibitions.value(); track show.id) {
                <li class="grid gap-2 border-b border-ink/10 py-6 md:grid-cols-[1.5fr_1fr_1fr] md:items-baseline">
                  <p class="font-display text-3xl">{{ show.title }}</p>
                  <p class="text-sm text-muted-foreground">{{ show.venue || 'Venue to be announced' }}</p>
                  <p class="text-sm text-muted-foreground">
                    @if (show.startsOn) {
                      {{ show.startsOn | longDate }}@if (show.endsOn) { → {{ show.endsOn | longDate }} }
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
}
