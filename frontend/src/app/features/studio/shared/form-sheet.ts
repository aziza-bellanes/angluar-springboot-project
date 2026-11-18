import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';

/** Right-hand sheet wrapping a reactive form. Fields are projected and bind with [formControl]. */
@Component({
  selector: 'at-form-sheet',
  imports: [HlmSheetImports, HlmButton, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-sheet side="right" [state]="open() ? 'open' : 'closed'" (closed)="closed.emit()">
      <hlm-sheet-content *hlmSheetPortal="let ctx" class="w-full sm:max-w-lg">
        <hlm-sheet-header class="border-b">
          <h2 hlmSheetTitle class="font-display text-2xl">{{ heading() }}</h2>
          @if (description()) {
            <p class="text-sm text-muted-foreground">{{ description() }}</p>
          }
        </hlm-sheet-header>
        <form
          [formGroup]="form()"
          (ngSubmit)="submitted.emit()"
          class="flex min-h-0 flex-1 flex-col"
          novalidate
        >
          <div class="grid flex-1 content-start gap-4 overflow-y-auto px-4 pb-4">
            <ng-content />
          </div>
          <hlm-sheet-footer class="border-t sm:flex-row sm:justify-end">
            <button hlmBtn variant="outline" type="button" (click)="closed.emit()">Cancel</button>
            <button hlmBtn type="submit" [disabled]="saving()">
              {{ saving() ? 'Saving…' : submitLabel() }}
            </button>
          </hlm-sheet-footer>
        </form>
      </hlm-sheet-content>
    </hlm-sheet>
  `,
})
export class FormSheet {
  readonly open = input.required<boolean>();
  readonly heading = input.required<string>();
  readonly description = input('');
  readonly form = input.required<FormGroup>();
  readonly saving = input(false);
  readonly submitLabel = input('Save');
  readonly closed = output<void>();
  readonly submitted = output<void>();
}
