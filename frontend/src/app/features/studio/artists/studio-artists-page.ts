import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucideTrash2 } from '@ng-icons/lucide';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { StudioApi } from '@app/core/api/studio.api';
import { Artist, ArtistRequest } from '@app/core/models/api.models';
import { LongDatePipe } from '@app/core/util/format.pipes';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { CrudPage } from '../shared/crud-page';
import { CrudTable } from '../shared/crud-table';
import { blankToNull } from '../shared/form-errors';
import { FormField } from '../shared/form-field';
import { FormSheet } from '../shared/form-sheet';

/** Specification "Clients". */
@Component({
  selector: 'at-studio-artists-page',
  imports: [
    ReactiveFormsModule, NgIcon, HlmBadge, HlmButton, HlmInput, HlmTableImports, LongDatePipe,
    ConfirmDialog, CrudTable, FormField, FormSheet,
  ],
  providers: [provideIcons({ lucidePencil, lucideTrash2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-artists-page.html',
})
export default class StudioArtistsPage extends CrudPage<Artist, ArtistRequest> {
  protected readonly resource = inject(StudioApi).artists;
  protected readonly noun = 'Artist';
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(190)]],
    phone: ['', Validators.maxLength(30)],
    address: ['', Validators.maxLength(255)],
    country: ['', Validators.maxLength(80)],
    biography: ['', Validators.maxLength(4000)],
    photoUrl: ['', Validators.maxLength(500)],
    active: [true],
  });

  constructor() {
    super();
    this.init();
  }

  protected fill(item: Artist | null): void {
    this.form.reset({
      name: item?.name ?? '',
      email: item?.email ?? '',
      phone: item?.phone ?? '',
      address: item?.address ?? '',
      country: item?.country ?? '',
      biography: item?.biography ?? '',
      photoUrl: item?.photoUrl ?? '',
      active: item?.active ?? true,
    });
  }

  protected toRequest(): ArtistRequest {
    const v = this.form.getRawValue();
    return {
      name: v.name.trim(),
      email: v.email.trim(),
      phone: blankToNull(v.phone),
      address: blankToNull(v.address),
      country: blankToNull(v.country),
      biography: blankToNull(v.biography),
      photoUrl: blankToNull(v.photoUrl),
      active: v.active,
    };
  }
}
