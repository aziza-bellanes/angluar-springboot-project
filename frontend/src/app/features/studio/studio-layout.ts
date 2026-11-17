import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown, lucideExternalLink, lucideGavel, lucideImage, lucideLandmark, lucideLayoutDashboard,
  lucideLogOut, lucideMenu, lucidePalette, lucideSearch, lucideUser, lucideUsers,
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
  tone: string;
  adminOnly?: boolean;
  exact?: boolean;
}

const GALLERY_LINKS = [
  { path: '/', label: 'View public site', icon: 'lucideExternalLink', tone: 'text-sunflower' },
  { path: '/studio/profile', label: 'My profile', icon: 'lucideUser', tone: 'text-sky-300' },
];

const NAV: NavItem[] = [
  { path: '/studio', label: 'Overview', icon: 'lucideLayoutDashboard', tone: 'text-sunflower', exact: true },
  { path: '/studio/artists', label: 'Artists', caption: 'Clients', icon: 'lucidePalette', tone: 'text-terracotta' },
  { path: '/studio/exhibitions', label: 'Exhibitions', caption: 'Projets', icon: 'lucideLandmark', tone: 'text-sky-300' },
  { path: '/studio/artworks', label: 'Artworks', icon: 'lucideImage', tone: 'text-emerald-300' },
  { path: '/studio/auctions', label: 'Auctions', icon: 'lucideGavel', tone: 'text-amber-500', adminOnly: true },
  { path: '/studio/users', label: 'Users', icon: 'lucideUsers', tone: 'text-rose-300', adminOnly: true },
];

/** Argon-style dashboard shell: fixed sidenav, top bar, ivory content area. */
@Component({
  selector: 'at-studio-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, NgIcon, HlmButton, HlmDropdownMenuImports, HlmSheetImports],
  providers: [
    provideIcons({
      lucideChevronDown, lucideExternalLink, lucideGavel, lucideImage, lucideLandmark, lucideLayoutDashboard,
      lucideLogOut, lucideMenu, lucidePalette, lucideSearch, lucideUser, lucideUsers,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-layout.html',
})
export class StudioLayout {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly galleryLinks = GALLERY_LINKS;
  protected readonly year = new Date().getFullYear();
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

  protected search(term: string): void {
    const q = term.trim();
    if (q) void this.router.navigate(['/studio/artworks'], { queryParams: { q } });
  }

  protected signOut(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/');
  }
}
