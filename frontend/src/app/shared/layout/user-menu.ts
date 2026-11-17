import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown,
  lucideGavel,
  lucideLayoutDashboard,
  lucideLogOut,
} from '@ng-icons/lucide';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { AuthStore } from '@app/core/auth/auth.store';

/** Profile dropdown shown in the header when signed in. */
@Component({
  selector: 'at-user-menu',
  imports: [RouterLink, NgIcon, HlmDropdownMenuImports],
  providers: [
    provideIcons({ lucideChevronDown, lucideGavel, lucideLayoutDashboard, lucideLogOut }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [hlmDropdownMenuTrigger]="menu"
      align="end"
      class="inline-flex items-center gap-2 rounded-full border border-ivory/20 py-1 pr-3 pl-1 text-sm transition-colors hover:border-ivory/50"
    >
      <span
        class="grid size-8 place-items-center rounded-full bg-sunflower text-xs font-bold text-midnight"
      >
        {{ initials() }}
      </span>
      <span class="hidden sm:inline">{{ auth.user()?.firstName }}</span>
      <ng-icon name="lucideChevronDown" size="14" />
    </button>
    <ng-template #menu>
      <hlm-dropdown-menu class="w-56">
        <hlm-dropdown-menu-label>
          <span class="block truncate text-xs text-muted-foreground">{{ auth.user()?.email }}</span>
        </hlm-dropdown-menu-label>
        <hlm-dropdown-menu-separator />
        <a hlmDropdownMenuItem routerLink="/account">
          <ng-icon name="lucideGavel" /> My bids &amp; collection
        </a>
        @if (auth.isStaff()) {
          <a hlmDropdownMenuItem routerLink="/studio">
            <ng-icon name="lucideLayoutDashboard" /> Management studio
          </a>
        }
        <hlm-dropdown-menu-separator />
        <button hlmDropdownMenuItem (click)="signOut()">
          <ng-icon name="lucideLogOut" /> Sign out
        </button>
      </hlm-dropdown-menu>
    </ng-template>
  `,
})
export class UserMenu {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly initials = computed(() => {
    const user = this.auth.user();
    return user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() : '';
  });

  protected signOut(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/');
  }
}
