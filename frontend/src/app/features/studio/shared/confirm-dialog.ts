import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

@Component({
  selector: 'at-confirm-dialog',
  imports: [HlmDialogImports, HlmButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog [state]="open() ? 'open' : 'closed'" (closed)="cancelled.emit()">
      <hlm-dialog-content *hlmDialogPortal="let ctx">
        <hlm-dialog-header>
          <h2 hlmDialogTitle>{{ heading() }}</h2>
          <p hlmDialogDescription>{{ message() }}</p>
        </hlm-dialog-header>
        <hlm-dialog-footer>
          <button hlmBtn variant="outline" type="button" (click)="cancelled.emit()">Keep</button>
          <button
            hlmBtn
            variant="destructive"
            type="button"
            [disabled]="pending()"
            (click)="confirmed.emit()"
          >
            {{ pending() ? 'Working…' : confirmLabel() }}
          </button>
        </hlm-dialog-footer>
      </hlm-dialog-content>
    </hlm-dialog>
  `,
})
export class ConfirmDialog {
  readonly open = input.required<boolean>();
  readonly heading = input('Are you sure?');
  readonly message = input('');
  readonly confirmLabel = input('Delete');
  readonly pending = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
