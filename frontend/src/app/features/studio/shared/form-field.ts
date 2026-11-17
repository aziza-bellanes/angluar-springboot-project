import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { map, startWith, switchMap } from 'rxjs';

/** Label + projected control + inline validation message. The label wraps the control for implicit association. */
@Component({
  selector: 'at-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="grid gap-1.5">
      <span class="text-sm font-medium">
        {{ label() }}
        @if (required()) {
          <span class="text-terracotta" aria-hidden="true">*</span>
        }
      </span>
      <ng-content />
    </label>
    @if (message(); as text) {
      <p class="mt-1 text-xs text-destructive" role="alert">{{ text }}</p>
    } @else if (hint()) {
      <p class="mt-1 text-xs text-muted-foreground">{{ hint() }}</p>
    }
  `,
})
export class FormField {
  readonly label = input.required<string>();
  readonly control = input.required<AbstractControl>();
  readonly required = input(false);
  readonly hint = input('');

  private readonly tick = toSignal(
    toObservable(this.control).pipe(
      switchMap((control) => control.events.pipe(startWith(null))),
      map(() => ({})),
    ),
  );

  protected readonly message = computed(() => {
    this.tick();
    const control = this.control();
    const errors = control.errors;
    if (!errors || !(control.touched || control.dirty)) {
      return '';
    }
    if (errors['server']) return String(errors['server']);
    if (errors['required']) return `${this.label()} is required.`;
    if (errors['email']) return 'Enter a valid email address.';
    if (errors['maxlength']) return `At most ${errors['maxlength'].requiredLength} characters.`;
    if (errors['minlength']) return `At least ${errors['minlength'].requiredLength} characters.`;
    if (errors['min']) return `Must be at least ${errors['min'].min}.`;
    if (errors['max']) return `Must be at most ${errors['max'].max}.`;
    if (errors['future']) return 'Must be in the future.';
    if (errors['order']) return 'The end must be after the start.';
    return 'Invalid value.';
  });
}
