import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucideTrash2 } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { StudioApi } from '@app/core/api/studio.api';
import { Artist, Exhibition, ExhibitionRequest } from '@app/core/models/api.models';
import { LongDatePipe, PricePipe } from '@app/core/util/format.pipes';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { CrudPage } from '../shared/crud-page';
import { CrudTable } from '../shared/crud-table';
import { blankToNull } from '../shared/form-errors';
import { FormField } from '../shared/form-field';
import { FormSheet } from '../shared/form-sheet';

/** Specification "Projets". */
@Component({
  selector: 'at-studio-exhibitions-page',
  imports: [
    ReactiveFormsModule, NgIcon, HlmButton, HlmInput, HlmTableImports, LongDatePipe, PricePipe,
    ConfirmDialog, CrudTable, FormField, FormSheet,
  ],
  providers: [provideIcons({ lucidePencil, lucideTrash2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-exhibitions-page.html',
})
export default class StudioExhibitionsPage extends CrudPage<Exhibition, ExhibitionRequest> {
  private readonly api = inject(StudioApi);
  protected readonly resource = this.api.exhibitions;
  protected readonly noun = 'Exhibition';
  protected readonly artists = signal<Artist[]>([]);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    artistId: [null as number | null, Validators.required],
    budget: [null as number | null, [Validators.required, Validators.min(0)]],
    durationDays: [null as number | null, [Validators.required, Validators.min(1), Validators.max(3650)]],
    startsOn: [''],
    venue: ['', Validators.maxLength(160)],
    coverUrl: ['', Validators.maxLength(500)],
    description: ['', Validators.maxLength(4000)],
  });

  constructor() {
    super();
    this.api.artists.list({ size: 200 }).subscribe((page) => this.artists.set(page.content));
    this.init();
  }

  protected fill(item: Exhibition | null): void {
    this.form.reset({
      title: item?.title ?? '',
      artistId: item?.artistId ?? null,
      budget: item?.budget ?? null,
      durationDays: item?.durationDays ?? 30,
      startsOn: item?.startsOn ?? '',
      venue: item?.venue ?? '',
      coverUrl: item?.coverUrl ?? '',
      description: item?.description ?? '',
    });
  }

  protected toRequest(): ExhibitionRequest {
    const v = this.form.getRawValue();
    return {
      title: v.title.trim(),
      artistId: v.artistId as number,
      budget: Number(v.budget),
      durationDays: Number(v.durationDays),
      startsOn: blankToNull(v.startsOn),
      venue: blankToNull(v.venue),
      coverUrl: blankToNull(v.coverUrl),
      description: blankToNull(v.description),
    };
  }
}
