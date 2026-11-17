import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown, lucideExternalLink, lucideGavel, lucideImage, lucideLandmark, lucideLayoutDashboard,
  lucideLogOut, lucideMenu, lucidePalette, lucideUsers,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { filter, map, startWith } from 'rxjs';
import { AuthStore } from '@app/core/auth/auth.store';

interface NavItem {
  path: string;
  label: string;
  caption?: string;
  icon: string;
  adminOnly?: boolean;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { path: '/studio', label: 'Overview', icon: 'lucideLayoutDashboard', exact: true },
  { path: '/studio/artists', label: 'Artists', caption: 'Clients', icon: 'lucidePalette' },
  { path: '/studio/exhibitions', label: 'Exhibitions', caption: 'Projets', icon: 'lucideLandmark' },
  { path: '/studio/artworks', label: 'Artworks', icon: 'lucideImage' },
  { path: '/studio/auctions', label: 'Auctions', icon: 'lucideGavel', adminOnly: true },
  { path: '/studio/users', label: 'Users', icon: 'lucideUsers', adminOnly: true },
];

/** Argon-style dashboard shell: fixed sidenav, top bar, ivory content area. */
@Component({
  selector: 'at-studio-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, NgIcon, HlmButton, HlmDropdownMenuImports, HlmSheetImports],
  providers: [
    provideIcons({
      lucideChevronDown, lucideExternalLink, lucideGavel, lucideImage, lucideLandmark, lucideLayoutDashboard,
      lucideLogOut, lucideMenu, lucidePalette, lucideUsers,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-layout.html',
})
export class StudioLayout {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly mobileNavOpen = signal(false);
  protected readonly items = computed(() => NAV.filter((item) => !item.adminOnly || this.auth.isAdmin()));

  protected readonly heading = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let current = this.route;
        while (current.firstChild) current = current.firstChild;
        return (current.snapshot?.data?.['heading'] as string | undefined) ?? 'Studio';
      }),
    ),
    { initialValue: 'Studio' },
  );

  protected readonly initials = computed(() => {
    const user = this.auth.user();
    return user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() : '';
  });

  protected readonly roleLabel = computed(() => (this.auth.isAdmin() ? 'Admin' : 'Collaborator'));

  protected signOut(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/');
  }
}
