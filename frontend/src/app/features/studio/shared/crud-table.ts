import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideSearch } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { Pagination } from './pagination';

/**
 * Frame shared by the studio list screens: search box, filter slot, gold "New" button,
 * loading / error / empty states and pagination. The table itself is projected.
 */
@Component({
  selector: 'at-crud-table',
  imports: [ReactiveFormsModule, NgIcon, HlmButton, HlmInput, HlmSkeleton, Pagination],
  providers: [provideIcons({ lucidePlus, lucideSearch })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex flex-wrap items-center gap-3">
      @if (search(); as searchControl) {
        <div class="relative min-w-52 flex-1 sm:max-w-sm">
          <ng-icon name="lucideSearch" class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
          <input hlmInput type="search" class="w-full pl-9" [formControl]="searchControl" [placeholder]="placeholder()"
            aria-label="Search" />
        </div>
      }
      <ng-content select="[filters]" />
      @if (canCreate()) {
        <button type="button" class="btn-gold ml-auto" (click)="create.emit()">
          <ng-icon name="lucidePlus" /> {{ newLabel() }}
        </button>
      }
    </div>

    <div class="overflow-hidden rounded-xl border bg-card">
      @if (loading()) {
        <div class="grid gap-3 p-5" aria-busy="true">
          @for (i of rows; track i) {
            <hlm-skeleton class="h-10 w-full" />
          }
        </div>
      } @else if (error()) {
        <div class="p-8 text-center">
          <p class="text-destructive">{{ error() }}</p>
          <button hlmBtn variant="outline" class="mt-3" type="button" (click)="retry.emit()">Try again</button>
        </div>
      } @else if (empty()) {
        <p class="p-10 text-center text-muted-foreground">{{ emptyText() }}</p>
      } @else {
        <div class="overflow-x-auto"><ng-content /></div>
      }
    </div>
    @if (!loading() && !error() && !empty()) {
      <div class="mt-4">
        <at-pagination [page]="page()" [totalPages]="totalPages()" [total]="total()" (pageChange)="pageChange.emit($event)" />
      </div>
    }
  `,
})
export class CrudTable {
  readonly search = input<FormControl<string> | null>(null);
  readonly placeholder = input('Search…');
  readonly newLabel = input('New');
  readonly canCreate = input(true);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly empty = input(false);
  readonly emptyText = input('Nothing here yet.');
  readonly page = input(0);
  readonly totalPages = input(0);
  readonly total = input(0);
  readonly create = output<void>();
  readonly retry = output<void>();
  readonly pageChange = output<number>();
  protected readonly rows = [1, 2, 3, 4, 5];
}
