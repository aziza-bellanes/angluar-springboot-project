import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucideTrash2 } from '@ng-icons/lucide';
import { startWith } from 'rxjs';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { StudioApi } from '@app/core/api/studio.api';
import {
  Artist,
  Artwork,
  ArtworkRequest,
  ArtworkStatus,
  Exhibition,
} from '@app/core/models/api.models';
import { PricePipe } from '@app/core/util/format.pipes';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { CrudPage } from '../shared/crud-page';
import { CrudTable } from '../shared/crud-table';
import { blankToNull } from '../shared/form-errors';
import { FormField } from '../shared/form-field';
import { FormSheet } from '../shared/form-sheet';

const STATUSES: ArtworkStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

@Component({
  selector: 'at-studio-artworks-page',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    HlmBadge,
    HlmButton,
    HlmInput,
    HlmTableImports,
    PricePipe,
    ConfirmDialog,
    CrudTable,
    FormField,
    FormSheet,
  ],
  providers: [provideIcons({ lucidePencil, lucideTrash2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-artworks-page.html',
})
export default class StudioArtworksPage extends CrudPage<Artwork, ArtworkRequest> {
  private readonly api = inject(StudioApi);
  protected readonly resource = this.api.artworks;
  protected readonly noun = 'Artwork';
  protected readonly statuses = STATUSES;
  protected readonly statusFilter = signal<ArtworkStatus | ''>('');
  protected readonly artists = signal<Artist[]>([]);
  private readonly exhibitions = signal<Exhibition[]>([]);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    artistId: [null as number | null, Validators.required],
    exhibitionId: [null as number | null],
    yearCreated: [null as number | null, [Validators.min(1000), Validators.max(2100)]],
    medium: ['', Validators.maxLength(120)],
    dimensions: ['', Validators.maxLength(80)],
    imageUrl: ['', [Validators.required, Validators.maxLength(500)]],
    imageCredit: ['', Validators.maxLength(255)],
    estimate: [null as number | null, Validators.min(0)],
    status: ['DRAFT' as ArtworkStatus],
    description: ['', Validators.maxLength(4000)],
  });

  private readonly chosenArtist = toSignal(
    this.form.controls.artistId.valueChanges.pipe(startWith(null)),
    {
      initialValue: null,
    },
  );
  private readonly imageValue = toSignal(
    this.form.controls.imageUrl.valueChanges.pipe(startWith('')),
    {
      initialValue: '',
    },
  );
  protected readonly preview = computed(() => (this.imageValue() ?? '').trim());
  protected readonly artistExhibitions = computed(() => {
    const artistId = this.chosenArtist() ?? this.form.controls.artistId.value;
    return this.exhibitions().filter((e) => e.artistId === artistId);
  });

  constructor() {
    super();
    this.api.artists.list({ size: 200 }).subscribe((p) => this.artists.set(p.content));
    this.api.exhibitions.list({ size: 200 }).subscribe((p) => this.exhibitions.set(p.content));
    this.form.controls.artistId.valueChanges.subscribe(() => {
      const current = this.form.controls.exhibitionId.value;
      if (current !== null && !this.artistExhibitions().some((e) => e.id === current)) {
        this.form.controls.exhibitionId.setValue(null);
      }
    });
    this.init();
  }

  protected override extraQuery() {
    return { status: this.statusFilter() || undefined };
  }

  protected setStatus(value: string): void {
    this.statusFilter.set(value as ArtworkStatus | '');
    this.refilter();
  }

  protected fill(item: Artwork | null): void {
    this.form.reset({
      title: item?.title ?? '',
      artistId: item?.artistId ?? null,
      exhibitionId: item?.exhibitionId ?? null,
      yearCreated: item?.yearCreated ?? null,
      medium: item?.medium ?? '',
      dimensions: item?.dimensions ?? '',
      imageUrl: item?.imageUrl ?? '',
      imageCredit: item?.imageCredit ?? '',
      estimate: item?.estimate ?? null,
      status: item?.status ?? 'DRAFT',
      description: item?.description ?? '',
    });
  }

  protected toRequest(): ArtworkRequest {
    const v = this.form.getRawValue();
    return {
      title: v.title.trim(),
      artistId: v.artistId as number,
      exhibitionId: v.exhibitionId,
      yearCreated:
        v.yearCreated === null || (v.yearCreated as unknown) === '' ? null : Number(v.yearCreated),
      medium: blankToNull(v.medium),
      dimensions: blankToNull(v.dimensions),
      imageUrl: v.imageUrl.trim(),
      imageCredit: blankToNull(v.imageCredit),
      estimate: v.estimate === null || (v.estimate as unknown) === '' ? null : Number(v.estimate),
      status: v.status,
      description: blankToNull(v.description),
    };
  }
}
