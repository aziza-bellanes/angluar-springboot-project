import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown,
  lucideExternalLink,
  lucideGavel,
  lucideImage,
  lucideLandmark,
  lucideLayoutDashboard,
  lucideLogOut,
  lucideMenu,
  lucidePalette,
  lucidePanelLeftClose,
  lucidePanelLeftOpen,
  lucideSearch,
  lucideShieldCheck,
  lucideUser,
  lucideUsers,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { filter, map, startWith } from 'rxjs';
import { AuthStore } from '@app/core/auth/auth.store';
import { TONES, Tone } from './shared/tones';

/** Where the sidebar's collapsed state is remembered for this browser. */
const COLLAPSED_KEY = 'atelier.studio.sidebar-collapsed';
const SIDEBAR_WIDTH = { open: 256, collapsed: 80 };

interface NavItem {
  path: string;
  label: string;
  caption?: string;
  icon: string;
  tone: Tone;
  adminOnly?: boolean;
  exact?: boolean;
}

const GALLERY_LINKS: NavItem[] = [
  { path: '/', label: 'View public site', icon: 'lucideExternalLink', tone: 'neutral' },
  { path: '/studio/profile', label: 'My profile', icon: 'lucideUser', tone: 'neutral' },
];

const NAV: NavItem[] = [
  {
    path: '/studio',
    label: 'Overview',
    icon: 'lucideLayoutDashboard',
    tone: 'overview',
    exact: true,
  },
  {
    path: '/studio/artists',
    label: 'Artists',
    caption: 'Clients',
    icon: 'lucidePalette',
    tone: 'artists',
  },
  {
    path: '/studio/exhibitions',
    label: 'Exhibitions',
    caption: 'Projets',
    icon: 'lucideLandmark',
    tone: 'exhibitions',
  },
  { path: '/studio/artworks', label: 'Artworks', icon: 'lucideImage', tone: 'artworks' },
  {
    path: '/studio/auctions',
    label: 'Auctions',
    icon: 'lucideGavel',
    tone: 'auctions',
    adminOnly: true,
  },
  {
    path: '/studio/users',
    label: 'Users',
    caption: 'Accounts',
    icon: 'lucideUsers',
    tone: 'users',
    adminOnly: true,
  },
  {
    path: '/studio/roles',
    label: 'Roles',
    caption: 'Permissions',
    icon: 'lucideShieldCheck',
    tone: 'users',
    adminOnly: true,
  },
];

/** Argon-style dashboard shell: collapsible sidenav, top bar, ivory content area. */
@Component({
  selector: 'at-studio-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgTemplateOutlet,
    NgIcon,
    HlmButton,
    HlmDropdownMenuImports,
    HlmSheetImports,
  ],
  providers: [
    provideIcons({
      lucideChevronDown,
      lucideExternalLink,
      lucideGavel,
      lucideImage,
      lucideLandmark,
      lucideLayoutDashboard,
      lucideLogOut,
      lucideMenu,
      lucidePalette,
      lucidePanelLeftClose,
      lucidePanelLeftOpen,
      lucideSearch,
      lucideShieldCheck,
      lucideUser,
      lucideUsers,
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
  protected readonly tones = TONES;

  /** Desktop sidebar shows icons only when collapsed; the mobile drawer is always full. */
  protected readonly collapsed = signal(readCollapsed());
  protected readonly sidebarWidth = computed(() =>
    this.collapsed() ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.open,
  );

  protected toggleSidebar(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, String(next));
    } catch {
      // Storage unavailable (private mode): the choice simply is not remembered.
    }
  }
  protected readonly items = computed(() =>
    NAV.filter((item) => !item.adminOnly || this.auth.isAdmin()),
  );

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

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}
