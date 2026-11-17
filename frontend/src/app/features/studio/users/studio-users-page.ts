import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideShieldCheck } from '@ng-icons/lucide';
import { startWith } from 'rxjs';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { messageOf } from '@app/core/api/problem';
import { StudioApi } from '@app/core/api/studio.api';
import { AuthStore } from '@app/core/auth/auth.store';
import { RoleName, UserProfile } from '@app/core/models/api.models';
import { LongDatePipe } from '@app/core/util/format.pipes';
import { CrudTable } from '../shared/crud-table';
import { FormSheet } from '../shared/form-sheet';

const ROLES: { name: RoleName; hint: string }[] = [
  { name: 'ADMIN', hint: 'Full access, auctions and users.' },
  { name: 'COLLABORATEUR', hint: 'Can view and create artists, exhibitions and artworks.' },
  { name: 'BIDDER', hint: 'Can place bids in auctions.' },
];

@Component({
  selector: 'at-studio-users-page',
  imports: [ReactiveFormsModule, NgIcon, HlmBadge, HlmButton, HlmTableImports, LongDatePipe, CrudTable, FormSheet],
  providers: [provideIcons({ lucideShieldCheck })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-users-page.html',
})
export default class StudioUsersPage {
  private readonly api = inject(StudioApi);
  protected readonly auth = inject(AuthStore);

  protected readonly roles = ROLES;
  protected readonly users = signal<UserProfile[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly search = new FormControl('', { nonNullable: true });
  private readonly term = toSignal(this.search.valueChanges.pipe(startWith('')), { initialValue: '' });
  protected readonly visible = computed(() => {
    const term = this.term().trim().toLowerCase();
    return term
      ? this.users().filter((u) => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(term))
      : this.users();
  });

  protected readonly editing = signal<UserProfile | null>(null);
  protected readonly saving = signal(false);
  protected readonly selected = signal<RoleName[]>([]);
  protected readonly form = new FormGroup({});
  protected readonly noRoles = computed(() => this.selected().length === 0);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.users().pipe(takeUntilDestroyed()).subscribe({
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

  protected openRoles(user: UserProfile): void {
    this.editing.set(user);
    this.selected.set([...user.roles]);
  }

  protected closeRoles(): void {
    this.editing.set(null);
  }

  protected toggleRole(role: RoleName, checked: boolean): void {
    this.selected.update((current) => (checked ? [...new Set([...current, role])] : current.filter((r) => r !== role)));
  }

  /** Admins cannot drop their own ADMIN role (the server refuses it too). */
  protected locked(role: RoleName): boolean {
    const user = this.editing();
    return role === 'ADMIN' && !!user && this.isSelf(user);
  }

  protected saveRoles(): void {
    const user = this.editing();
    if (!user || this.noRoles()) return;
    this.saving.set(true);
    this.api.updateRoles(user.id, this.selected()).subscribe({
      next: (updated) => this.afterUpdate(updated, 'Roles updated.', true),
      error: (err) => {
        this.saving.set(false);
        toast.error(messageOf(err));
      },
    });
  }

  protected toggleEnabled(user: UserProfile): void {
    this.api.updateStatus(user.id, !user.enabled).subscribe({
      next: (updated) => this.afterUpdate(updated, updated.enabled ? 'Account enabled.' : 'Account disabled.', false),
      error: (err) => toast.error(messageOf(err)),
    });
  }

  private afterUpdate(updated: UserProfile, message: string, closeSheet: boolean): void {
    this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
    this.saving.set(false);
    if (closeSheet) this.editing.set(null);
    toast.success(message);
  }
}
