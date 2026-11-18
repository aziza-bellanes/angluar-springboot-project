import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucideTrash2 } from '@ng-icons/lucide';
import { startWith } from 'rxjs';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { messageOf, problemOf } from '@app/core/api/problem';
import { StudioApi } from '@app/core/api/studio.api';
import { RoleInfo, RoleName } from '@app/core/models/api.models';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { CrudTable } from '../shared/crud-table';
import { applyServerError } from '../shared/form-errors';
import { FormField } from '../shared/form-field';
import { FormSheet } from '../shared/form-sheet';
import { ROLE_PROFILES, roleErrorMessage } from './role-form';

@Component({
  selector: 'at-studio-roles-page',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    HlmBadge,
    HlmButton,
    HlmInput,
    HlmTableImports,
    ConfirmDialog,
    CrudTable,
    FormField,
    FormSheet,
  ],
  providers: [provideIcons({ lucidePencil, lucideTrash2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-roles-page.html',
})
export default class StudioRolesPage {
  private readonly api = inject(StudioApi);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly profiles = ROLE_PROFILES;
  protected readonly profileNames = Object.keys(ROLE_PROFILES) as RoleName[];
  protected readonly roles = signal<RoleInfo[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly search = new FormControl('', { nonNullable: true });
  private readonly term = toSignal(this.search.valueChanges.pipe(startWith('')), {
    initialValue: '',
  });
  protected readonly visible = computed(() => {
    const term = this.term().trim().toLowerCase();
    return this.roles().filter((role) =>
      `${role.name} ${role.profile}`.toLowerCase().includes(term),
    );
  });
  protected readonly sheetOpen = signal(false);
  protected readonly editing = signal<RoleInfo | null>(null);
  protected readonly saving = signal(false);
  protected readonly toDelete = signal<RoleInfo | null>(null);
  protected readonly deleting = signal(false);
  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(32)],
    }),
    profile: new FormControl<RoleName>('COLLABORATEUR', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .roles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          this.roles.set(roles);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(messageOf(err));
          this.loading.set(false);
        },
      });
  }

  protected open(role: RoleInfo | null): void {
    this.editing.set(role);
    this.form.reset({ name: role?.name ?? '', profile: role?.profile ?? 'COLLABORATEUR' });
    const profile = this.form.controls.profile;
    if (role && (role.system || role.userCount > 0)) profile.disable();
    else profile.enable();
    this.sheetOpen.set(true);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const current = this.editing();
    const raw = this.form.getRawValue();
    const body = { name: raw.name.trim(), profile: raw.profile };
    this.saving.set(true);
    const call = current ? this.api.updateRole(current.id, body) : this.api.createRole(body);
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.sheetOpen.set(false);
        toast.success(current ? 'Role updated.' : 'Role created.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const problem = problemOf(err);
        if (problem.status === 400) applyServerError(this.form, err);
        else if (problem.code === 'role_name_taken') {
          this.form.controls.name.setErrors({ server: roleErrorMessage(problem.code, '') });
          this.form.controls.name.markAsTouched();
        } else toast.error(roleErrorMessage(problem.code, messageOf(err)));
      },
    });
  }

  protected confirmDelete(): void {
    const role = this.toDelete();
    if (!role) return;
    this.deleting.set(true);
    this.api
      .deleteRole(role.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.toDelete.set(null);
          toast.success('Role deleted.');
          this.load();
        },
        error: (err) => {
          this.deleting.set(false);
          this.toDelete.set(null);
          toast.error(roleErrorMessage(problemOf(err).code, messageOf(err)));
          this.load();
        },
      });
  }
}
