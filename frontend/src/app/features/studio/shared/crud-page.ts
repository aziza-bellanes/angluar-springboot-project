import { Directive, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable, debounceTime, distinctUntilChanged } from 'rxjs';
import { CrudResource, ListQuery } from '@app/core/api/studio.api';
import { messageOf } from '@app/core/api/problem';
import { AuthStore } from '@app/core/auth/auth.store';
import { Page } from '@app/core/models/api.models';
import { toast } from '@spartan-ng/brain/sonner';
import { applyServerError } from './form-errors';

export const PAGE_SIZE = 20;

/**
 * Shared behaviour of the studio list screens: paginated search, create/edit sheet, delete confirmation.
 * Subclasses supply the resource, the form and the mapping between form and request.
 */
@Directive()
export abstract class CrudPage<T extends { id: number }, R> {
  protected readonly auth = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  protected abstract readonly resource: CrudResource<T, R>;
  protected abstract readonly form: FormGroup;
  protected abstract readonly noun: string;
  protected abstract toRequest(): R;
  protected abstract fill(item: T | null): void;

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly items = signal<T[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly total = signal(0);

  protected readonly sheetOpen = signal(false);
  protected readonly editing = signal<T | null>(null);
  protected readonly saving = signal(false);
  protected readonly toDelete = signal<T | null>(null);
  protected readonly deleting = signal(false);

  protected extraQuery(): Record<string, string | number | undefined> {
    return {};
  }

  protected fetch(query: ListQuery & Record<string, string | number | undefined>): Observable<Page<T>> {
    return this.resource.list(query);
  }

  /** Call once from the subclass constructor. */
  protected init(): void {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(0);
        this.reload();
      });
    this.reload();
    if (this.route.snapshot.queryParamMap.has('new')) {
      this.openCreate();
    }
  }

  protected reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.fetch({ q: this.search.value.trim(), page: this.page(), size: PAGE_SIZE, ...this.extraQuery() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.items.set(result.content);
          this.totalPages.set(result.totalPages);
          this.total.set(result.totalElements);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(messageOf(err));
          this.loading.set(false);
        },
      });
  }

  protected goTo(page: number): void {
    this.page.set(page);
    this.reload();
  }

  protected refilter(): void {
    this.page.set(0);
    this.reload();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.fill(null);
    this.sheetOpen.set(true);
  }

  protected openEdit(item: T): void {
    this.editing.set(item);
    this.fill(item);
    this.sheetOpen.set(true);
  }

  protected closeSheet(): void {
    this.sheetOpen.set(false);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const current = this.editing();
    const request = this.toRequest();
    const call = current ? this.resource.update(current.id, request) : this.resource.create(request);
    this.saving.set(true);
    call.subscribe({
      next: () => {
        this.saving.set(false);
        this.sheetOpen.set(false);
        toast.success(current ? `${this.noun} updated.` : `${this.noun} created.`);
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        if (err?.status === 400) {
          applyServerError(this.form, err);
        } else {
          toast.error(messageOf(err));
        }
      },
    });
  }

  protected confirmDelete(): void {
    const target = this.toDelete();
    if (!target) return;
    this.deleting.set(true);
    this.resource.delete(target.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.toDelete.set(null);
        toast.success(`${this.noun} deleted.`);
        if (this.items().length === 1 && this.page() > 0) this.page.update((p) => p - 1);
        this.reload();
      },
      error: (err) => {
        this.deleting.set(false);
        this.toDelete.set(null);
        toast.error(messageOf(err));
      },
    });
  }
}
