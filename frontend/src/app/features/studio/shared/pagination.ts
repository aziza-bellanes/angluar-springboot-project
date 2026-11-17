import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'at-pagination',
  imports: [HlmButton, NgIcon],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flex items-center justify-between gap-3 text-sm text-muted-foreground" aria-label="Pagination">
      <span>{{ total() }} {{ total() === 1 ? 'result' : 'results' }}</span>
      <span class="flex items-center gap-2">
        <button hlmBtn variant="outline" size="icon-sm" type="button" aria-label="Previous page"
          [disabled]="page() <= 0" (click)="pageChange.emit(page() - 1)">
          <ng-icon name="lucideChevronLeft" />
        </button>
        <span>Page {{ page() + 1 }} of {{ totalPages() || 1 }}</span>
        <button hlmBtn variant="outline" size="icon-sm" type="button" aria-label="Next page"
          [disabled]="page() + 1 >= totalPages()" (click)="pageChange.emit(page() + 1)">
          <ng-icon name="lucideChevronRight" />
        </button>
      </span>
    </nav>
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly total = input.required<number>();
  readonly pageChange = output<number>();
}
