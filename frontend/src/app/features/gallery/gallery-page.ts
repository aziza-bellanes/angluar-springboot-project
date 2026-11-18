import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, skip } from 'rxjs';
import { GalleryApi } from '@app/core/api/gallery.api';
import { messageOf } from '@app/core/api/problem';
import { ArtworkCard as ArtworkCardModel } from '@app/core/models/api.models';
import { Flip, prefersReducedMotion } from '@app/shared/animations/motion';
import { ArtworkCard } from '@app/shared/components/artwork-card';

type Density = 'gallery' | 'salon';
const PAGE_SIZE = 24;

/** "Discover art": the full collection with search, artist filter and a two-density hang. */
@Component({
  selector: 'at-gallery-page',
  imports: [ReactiveFormsModule, ArtworkCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gallery-page.html',
})
export default class GalleryPage {
  private readonly api = inject(GalleryApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly medium = new FormControl('', { nonNullable: true });
  protected readonly artistId = signal<number | undefined>(undefined);
  protected readonly density = signal<Density>('gallery');

  protected readonly artists = toSignal(
    this.api.artists(undefined, 0, 200).pipe(
      map((page) => page.content),
      catchError(() => of([])),
    ),
    { initialValue: [] },
  );

  protected readonly items = signal<ArtworkCardModel[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly skeletons = Array.from({ length: 8 }, (_, i) => i);
  protected readonly hasMore = computed(() => this.items().length < this.total());

  private q = '';
  private request = 0;

  protected readonly gridClass = computed(() =>
    this.density() === 'gallery'
      ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12'
      : 'grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-x-3 gap-y-7',
  );

  constructor() {
    const initial = this.route.snapshot.queryParamMap.get('q') ?? '';
    this.q = initial;
    this.search.setValue(initial, { emitEvent: false });

    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { q: value.trim() || null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });

    this.route.queryParamMap
      .pipe(
        map((params) => params.get('q') ?? ''),
        distinctUntilChanged(),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe((value) => {
        this.q = value;
        if (this.search.value.trim() !== value) {
          this.search.setValue(value, { emitEvent: false });
        }
        this.reload();
      });

    this.medium.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.reload());

    this.load(0);
  }

  protected onArtist(value: string): void {
    this.artistId.set(value ? Number(value) : undefined);
    this.reload();
  }

  protected loadMore(): void {
    this.load(this.page() + 1);
  }

  protected setDensity(next: Density): void {
    if (next === this.density()) {
      return;
    }
    if (prefersReducedMotion()) {
      this.density.set(next);
      return;
    }
    const cards = Array.from(this.host.querySelectorAll('at-artwork-card'));
    const state = Flip.getState(cards);
    this.density.set(next);
    afterNextRender(
      () => {
        Flip.from(state, { duration: 0.6, ease: 'power2.inOut', stagger: 0.01 });
      },
      { injector: this.injector },
    );
  }

  private reload(): void {
    this.load(0);
  }

  private load(page: number): void {
    const id = ++this.request;
    this.loading.set(true);
    this.error.set(null);
    this.api
      .artworks({
        q: this.q || undefined,
        artistId: this.artistId(),
        medium: this.medium.value.trim() || undefined,
        page,
        size: PAGE_SIZE,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (id !== this.request) {
            return;
          }
          this.items.update((current) => (page === 0 ? result.content : [...current, ...result.content]));
          this.total.set(result.totalElements);
          this.page.set(page);
          this.loading.set(false);
        },
        error: (err) => {
          if (id !== this.request) {
            return;
          }
          this.error.set(messageOf(err));
          this.loading.set(false);
        },
      });
  }
}
