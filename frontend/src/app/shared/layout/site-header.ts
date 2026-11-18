import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMenu } from '@ng-icons/lucide';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { AuthStore } from '@app/core/auth/auth.store';
import { BrandMark } from './brand-mark';
import { UserMenu } from './user-menu';

export const PUBLIC_NAV = [
  { label: 'Discover', path: '/artworks' },
  { label: 'Artists', path: '/artists' },
  { label: 'Exhibitions', path: '/exhibitions' },
  { label: 'Live auctions', path: '/auctions' },
] as const;

/** Floating glass navigation pill. Navigation and sign-in stay one click away on every page. */
@Component({
  selector: 'at-site-header',
  imports: [RouterLink, RouterLinkActive, NgIcon, BrandMark, UserMenu, HlmSheetImports],
  providers: [provideIcons({ lucideMenu })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pointer-events-none fixed inset-x-0 top-3 z-50 px-3 sm:top-4">
      <div
        class="pointer-events-auto mx-auto flex h-14 max-w-5xl items-center justify-between gap-6 rounded-full border border-white/60 bg-[#fbf8f1]/90 pr-2 pl-6 text-midnight shadow-[0_1px_0_rgb(255_255_255/0.7)_inset,0_18px_40px_-22px_rgb(16_29_53/0.45)] backdrop-blur-xl backdrop-saturate-150"
      >
        <at-brand-mark />

        <nav class="hidden items-center gap-8 md:flex" aria-label="Main">
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="!text-midnight after:!scale-x-100"
              class="relative text-sm text-midnight/60 transition-colors after:absolute after:inset-x-0 after:-bottom-1.5 after:h-px after:origin-left after:scale-x-0 after:bg-midnight after:transition-transform after:duration-500 after:ease-gallery hover:text-midnight hover:after:scale-x-100"
            >
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="flex items-center gap-3">
          @if (auth.isAuthenticated()) {
            <at-user-menu />
          } @else {
            <a routerLink="/login" class="hidden text-sm text-midnight/70 hover:text-midnight sm:inline"
              >Sign in</a
            >
            <a routerLink="/register" class="rounded-full bg-midnight px-4 py-2 text-sm font-semibold text-ivory transition-colors hover:bg-cobalt">Join</a>
          }

          <hlm-sheet side="right">
            <button
              hlmSheetTrigger
              type="button"
              class="grid size-10 place-items-center rounded-full text-midnight md:hidden"
              aria-label="Open menu"
            >
              <ng-icon name="lucideMenu" size="22" />
            </button>
            <hlm-sheet-content
              *hlmSheetPortal="let ctx"
              class="night w-80 border-ivory/10 bg-midnight"
            >
              <hlm-sheet-header>
                <h2 hlmSheetTitle class="font-display text-2xl tracking-[0.2em]">ATELIER</h2>
              </hlm-sheet-header>
              <nav class="flex flex-col gap-1 px-4" aria-label="Mobile">
                @for (item of nav; track item.path) {
                  <a
                    [routerLink]="item.path"
                    (click)="ctx.close()"
                    routerLinkActive="text-sunflower"
                    class="border-b border-ivory/10 py-4 font-display text-2xl"
                  >
                    {{ item.label }}
                  </a>
                }
                @if (!auth.isAuthenticated()) {
                  <a routerLink="/login" (click)="ctx.close()" class="py-4 text-sm text-ivory/80"
                    >Sign in</a
                  >
                }
              </nav>
            </hlm-sheet-content>
          </hlm-sheet>
        </div>
      </div>
    </header>
  `,
})
export class SiteHeader {
  protected readonly auth = inject(AuthStore);
  protected readonly nav = PUBLIC_NAV;
}
