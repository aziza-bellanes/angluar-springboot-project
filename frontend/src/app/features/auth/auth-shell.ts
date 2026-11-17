import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Split layout shared by sign-in and registration: night sky with a quote, ivory form card. */
@Component({
  selector: 'at-auth-shell',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="grid min-h-dvh lg:grid-cols-2">
      <div class="night relative hidden items-end overflow-hidden p-12 pt-28 lg:flex">
        <img
          src="/artworks/olive-trees-437998.jpg"
          alt=""
          class="absolute inset-0 size-full scale-105 object-cover"
          aria-hidden="true"
        />
        <div
          class="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/45 to-midnight/10"
          aria-hidden="true"
        ></div>
        <figure class="relative z-10 max-w-md">
          <blockquote class="font-display text-4xl leading-tight italic">
            “I dream of painting and then I paint my dream.”
          </blockquote>
          <figcaption class="mt-4 text-sm tracking-[0.2em] text-ivory/60 uppercase">
            Vincent van Gogh ·
            <span class="normal-case tracking-normal italic">Olive Trees, 1890</span>
          </figcaption>
        </figure>
      </div>
      <div class="canvas-texture flex items-center justify-center px-4 pt-28 pb-16">
        <div class="w-full max-w-md rounded-md border bg-card p-6 shadow-sm sm:p-10">
          <p class="eyebrow">{{ eyebrow() }}</p>
          <h1 class="mt-2 font-display text-4xl leading-tight">{{ title() }}</h1>
          <div class="mt-8"><ng-content /></div>
        </div>
      </div>
    </section>
  `,
})
export class AuthShell {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
}
