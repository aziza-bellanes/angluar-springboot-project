import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NightSky } from '@app/shared/animations/night-sky';

@Component({
  selector: 'at-forbidden-page',
  imports: [RouterLink, NightSky],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="night relative flex min-h-dvh items-center justify-center overflow-hidden px-5 text-center">
      <at-night-sky />
      <div class="relative z-10 max-w-xl">
        <p class="eyebrow !text-sunflower">Access denied</p>
        <h1 class="mt-4 font-display text-[clamp(7rem,24vw,16rem)] leading-none font-medium">403</h1>
        <p class="mt-4 text-lg leading-relaxed text-ivory/75">This room is reserved. Sign in with an account that has access, or return to the public galleries.</p>
        <div class="mt-10 flex flex-wrap justify-center gap-3">
          <a routerLink="/" class="btn-gold">Back to the gallery</a>
          <a routerLink="/login" class="btn-ghost-light">Sign in</a>
        </div>
      </div>
    </section>
  `,
})
export default class ForbiddenPage {}
