import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

/** Public gallery shell. Pages own their top spacing so hero sections can sit under the header. */
@Component({
  selector: 'at-public-layout',
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      href="#main"
      class="sr-only z-[60] rounded bg-sunflower px-4 py-2 text-midnight focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      Skip to content
    </a>
    <at-site-header />
    <main id="main" class="min-h-dvh">
      <router-outlet />
    </main>
    <at-site-footer />
  `,
})
export class PublicLayout {}
