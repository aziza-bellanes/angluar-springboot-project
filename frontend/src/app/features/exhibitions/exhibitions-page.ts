import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { GalleryApi } from '@app/core/api/gallery.api';
import { ArtworkCard } from '@app/core/models/api.models';
import { LongDatePipe } from '@app/core/util/format.pipes';
import { FlipTransition } from '@app/shared/animations/flip-transition.service';

/** Exhibitions as large editorial blocks, alternating ivory and canvas. */
@Component({
  selector: 'at-exhibitions-page',
  imports: [RouterLink, LongDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="canvas-texture bg-ivory pt-28 pb-12">
      <div class="container-gallery max-w-4xl">
        <p class="eyebrow">Exhibitions</p>
        <h1 class="mt-3 font-display text-5xl leading-[1.02] md:text-7xl">Rooms to wander through.</h1>
      </div>
    </header>

    @for (show of shows(); track show.id; let odd = $odd) {
      <section class="py-20" [class]="odd ? 'bg-canvas' : 'bg-ivory'">
        <div class="container-gallery grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div class="space-y-5">
            <p class="eyebrow">{{ show.venue || 'Venue to be announced' }}</p>
            <h2 class="font-display text-4xl leading-[1.05] md:text-6xl">{{ show.title }}</h2>
            <p class="text-lg">
              by
              <a [routerLink]="['/artists', show.artistId]" class="underline-offset-4 hover:text-cobalt hover:underline">{{
                show.artistName
              }}</a>
            </p>
            <p class="text-sm text-muted-foreground">
              @if (show.startsOn) {
                {{ show.startsOn | longDate }}@if (show.endsOn) { → {{ show.endsOn | longDate }} }
                ·
              }
              {{ show.durationDays }} {{ show.durationDays === 1 ? 'day' : 'days' }}
            </p>
            @if (show.description) {
              <p class="max-w-xl leading-relaxed text-ink/80">{{ show.description }}</p>
            }
          </div>
          <div class="grid grid-cols-2 gap-4 self-start sm:grid-cols-4 lg:grid-cols-2">
            @for (art of thumbs()[show.id] ?? []; track art.id) {
              <a [routerLink]="['/artworks', art.slug]" (click)="flip.capture(art.slug, img)" class="group block outline-offset-4">
                <img
                  #img
                  [src]="art.imageUrl"
                  [alt]="art.title"
                  loading="lazy"
                  class="aspect-[4/5] w-full rounded-[3px] object-cover shadow-[0_18px_40px_-24px_rgb(16_29_53/0.6)] transition-transform duration-700 ease-gallery group-hover:scale-[1.03]"
                />
              </a>
            }
          </div>
        </div>
      </section>
    } @empty {
      <section class="bg-ivory py-20">
        <p class="container-gallery text-muted-foreground">
          {{ loaded() ? 'No exhibition is on view at the moment.' : 'Loading exhibitions...' }}
        </p>
      </section>
    }
  `,
})
export default class ExhibitionsPage {
  private readonly api = inject(GalleryApi);
  protected readonly flip = inject(FlipTransition);

  protected readonly thumbs = signal<Record<number, ArtworkCard[]>>({});
  private readonly list = toSignal(
    this.api.exhibitions(undefined, 0, 24).pipe(
      map((page) => page.content),
      catchError(() => of([])),
    ),
  );
  protected readonly shows = computed(() => this.list() ?? []);
  protected readonly loaded = () => this.list() !== undefined;

  private readonly requested = new Set<number>();

  constructor() {
    effect(() => this.fetchThumbs(this.shows().map((s) => s.id)));
  }

  private fetchThumbs(ids: number[]): void {
    for (const id of ids) {
      if (this.requested.has(id)) {
        continue;
      }
      this.requested.add(id);
      this.api
        .artworks({ exhibitionId: id, size: 4 })
        .pipe(
          map((page) => page.content.slice(0, 4)),
          catchError(() => of([] as ArtworkCard[])),
        )
        .subscribe((content) => this.thumbs.update((current) => ({ ...current, [id]: content })));
    }
  }
}
