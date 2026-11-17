import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { formatCountdown } from '@app/core/util/format';

/** Live countdown to an ISO timestamp, ticking once per second. */
@Component({
  selector: 'at-countdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<time class="price" [attr.datetime]="until()">{{ text() }}</time>`,
})
export class Countdown {
  readonly until = input.required<string>();

  private readonly now = signal(Date.now());
  protected readonly remaining = computed(() => new Date(this.until()).getTime() - this.now());
  protected readonly text = computed(() => formatCountdown(this.remaining()));

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
