import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
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
import { AuthStore } from '@app/core/auth/auth.store';
import { RoleName, UserProfile } from '@app/core/models/api.models';
import { LongDatePipe } from '@app/core/util/format.pipes';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { CrudTable } from '../shared/crud-table';
import { applyServerError } from '../shared/form-errors';
import { FormField } from '../shared/form-field';
import { FormSheet } from '../shared/form-sheet';
import { ROLE_OPTIONS, toUserFormValue, toUserRequest, userErrorMessage } from './user-form';

@Component({
  selector: 'at-studio-users-page',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    HlmBadge,
    HlmButton,
    HlmInput,
    HlmTableImports,
    LongDatePipe,
    ConfirmDialog,
    CrudTable,
    FormField,
    FormSheet,
  ],
  providers: [provideIcons({ lucidePencil, lucideTrash2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-users-page.html',
})
export default class StudioUsersPage {
  private readonly api = inject(StudioApi);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthStore);

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly users = signal<UserProfile[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly search = new FormControl('', { nonNullable: true });
  private readonly term = toSignal(this.search.valueChanges.pipe(startWith('')), {
    initialValue: '',
  });
  protected readonly visible = computed(() => {
    const term = this.term().trim().toLowerCase();
    return term
      ? this.users().filter((u) =>
          `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(term),
        )
      : this.users();
  });

  protected readonly sheetOpen = signal(false);
  protected readonly editing = signal<UserProfile | null>(null);
  protected readonly saving = signal(false);
  protected readonly toDelete = signal<UserProfile | null>(null);
  protected readonly deleting = signal(false);

  protected readonly form = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(190)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30), Validators.pattern(/^[+0-9 ()-]*$/)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.minLength(8), Validators.maxLength(72)],
    }),
    roles: new FormControl<RoleName[]>([], { nonNullable: true, validators: [Validators.required] }),
    enabled: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .users()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users.set(users);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(messageOf(err));
          this.loading.set(false);
        },
      });
  }

  protected isSelf(user: UserProfile): boolean {
    return user.id === this.auth.user()?.id;
  }

  protected openCreate(): void {
    this.open(null);
  }

  protected openEdit(user: UserProfile): void {
    this.open(user);
  }

  private open(user: UserProfile | null): void {
    this.editing.set(user);
    this.form.reset(toUserFormValue(user));
    const password = this.form.controls.password;
    password.setValidators(
      user
        ? [Validators.minLength(8), Validators.maxLength(72)]
        : [Validators.required, Validators.minLength(8), Validators.maxLength(72)],
    );
    password.updateValueAndValidity();
    this.sheetOpen.set(true);
  }

  protected closeSheet(): void {
    this.sheetOpen.set(false);
  }

  protected hasRole(role: RoleName): boolean {
    return this.form.controls.roles.value.includes(role);
  }

  /** Admins cannot drop their own Admin role or disable themselves (the server refuses it too). */
  protected lockedRole(role: RoleName): boolean {
    const user = this.editing();
    return role === 'ADMIN' && !!user && this.isSelf(user);
  }

  protected toggleRole(role: RoleName, checked: boolean): void {
    const control = this.form.controls.roles;
    control.setValue(
      checked ? [...new Set([...control.value, role])] : control.value.filter((r) => r !== role),
    );
    control.markAsTouched();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const current = this.editing();
    const request = toUserRequest(this.form.getRawValue());
    const call = current ? this.api.updateUser(current.id, request) : this.api.createUser(request);
    this.saving.set(true);
    call.subscribe({
      next: () => {
        this.saving.set(false);
        this.sheetOpen.set(false);
        toast.success(current ? 'User updated.' : 'User created.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const problem = problemOf(err);
        if (problem.status === 400) {
          applyServerError(this.form, err);
        } else if (problem.code === 'email_taken') {
          const email = this.form.controls.email;
          email.setErrors({ server: userErrorMessage(problem.code, '') });
          email.markAsTouched();
        } else {
          toast.error(userErrorMessage(problem.code, messageOf(err)));
        }
      },
    });
  }

  protected confirmDelete(): void {
    const target = this.toDelete();
    if (!target) return;
    this.deleting.set(true);
    this.api.deleteUser(target.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.toDelete.set(null);
        toast.success('User deleted.');
        this.load();
      },
      error: (err) => {
        this.deleting.set(false);
        this.toDelete.set(null);
        toast.error(userErrorMessage(problemOf(err).code, messageOf(err)));
      },
    });
  }

  protected toggleEnabled(user: UserProfile): void {
    this.api.updateStatus(user.id, !user.enabled).subscribe({
      next: (updated) => {
        this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
        toast.success(updated.enabled ? 'Account enabled.' : 'Account disabled.');
      },
      error: (err) => toast.error(userErrorMessage(problemOf(err).code, messageOf(err))),
    });
  }
}
