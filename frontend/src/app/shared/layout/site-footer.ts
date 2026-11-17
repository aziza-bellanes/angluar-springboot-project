import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandMark } from './brand-mark';
import { PUBLIC_NAV } from './site-header';

@Component({
  selector: 'at-site-footer',
  imports: [RouterLink, BrandMark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="night border-t border-ivory/10">
      <div class="container-gallery grid gap-10 py-14 md:grid-cols-[2fr_1fr_1fr]">
        <div class="max-w-sm space-y-4">
          <at-brand-mark />
          <p class="text-sm leading-relaxed text-ivory/60">
            An immersive gallery where artworks move, artists come forward and collectors bid in real time.
          </p>
          <p class="text-xs tracking-[0.2em] text-ivory/45 uppercase">A SmartSoft Solutions platform</p>
        </div>
        <nav class="space-y-3 text-sm" aria-label="Footer">
          <p class="eyebrow">Explore</p>
          @for (item of nav; track item.path) {
            <a [routerLink]="item.path" class="block text-ivory/70 hover:text-sunflower">{{ item.label }}</a>
          }
        </nav>
        <div class="space-y-3 text-sm text-ivory/60">
          <p class="eyebrow">About</p>
          <p>Images: The Metropolitan Museum of Art, Open Access (CC0).</p>
          <p>Auctions use demonstration money only.</p>
        </div>
      </div>
      <div class="border-t border-ivory/10 py-6 text-center text-xs text-ivory/40">
        © {{ year }} SmartSoft Solutions · ATELIER
      </div>
    </footer>
  `,
})
export class SiteFooter {
  protected readonly nav = PUBLIC_NAV;
  protected readonly year = new Date().getFullYear();
}
