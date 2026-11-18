import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBan, lucidePencil, lucideTrash2 } from '@ng-icons/lucide';
import { Observable } from 'rxjs';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { messageOf } from '@app/core/api/problem';
import { ListQuery, StudioApi } from '@app/core/api/studio.api';
import { Artwork, Auction, AuctionRequest, AuctionStatus, Page } from '@app/core/models/api.models';
import { DateTimePipe, PricePipe } from '@app/core/util/format.pipes';
import { AuctionStatusBadge } from '@app/shared/components/auction-status-badge';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { CrudPage } from '../shared/crud-page';
import { CrudTable } from '../shared/crud-table';
import { FormField } from '../shared/form-field';
import { FormSheet } from '../shared/form-sheet';

type Tab = 'ALL' | AuctionStatus;
const TABS: { value: Tab; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'Live' },
  { value: 'SCHEDULED', label: 'Upcoming' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

/** "2026-11-17T18:30" (local) from an ISO instant, for datetime-local inputs. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function endsAfterStart(control: AbstractControl): ValidationErrors | null {
  const group = control.parent;
  const start = group?.get('startsAt')?.value as string | undefined;
  if (!start || !control.value) return null;
  return new Date(control.value).getTime() > new Date(start).getTime() ? null : { order: true };
}

@Component({
  selector: 'at-studio-auctions-page',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    HlmButton,
    HlmInput,
    HlmTableImports,
    PricePipe,
    DateTimePipe,
    AuctionStatusBadge,
    ConfirmDialog,
    CrudTable,
    FormField,
    FormSheet,
  ],
  providers: [provideIcons({ lucideBan, lucidePencil, lucideTrash2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-auctions-page.html',
})
export default class StudioAuctionsPage extends CrudPage<Auction, AuctionRequest> {
  private readonly api = inject(StudioApi);
  protected readonly resource = this.api.auctions;
  protected readonly noun = 'Auction';
  protected readonly tabs = TABS;
  protected readonly tab = signal<Tab>('ALL');
  protected readonly published = signal<Artwork[]>([]);
  protected readonly toCancel = signal<Auction | null>(null);
  protected readonly cancelling = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    artworkId: [null as number | null, Validators.required],
    startingPrice: [null as number | null, [Validators.required, Validators.min(1)]],
    minimumIncrement: [null as number | null, [Validators.required, Validators.min(1)]],
    startsAt: ['', Validators.required],
    endsAt: ['', [Validators.required, endsAfterStart]],
  });

  /** Artworks offered in the select; the edited auction's artwork is always present. */
  protected readonly artworkOptions = computed(() => {
    const current = this.editing()?.artwork;
    const list = this.published();
    return current && !list.some((a) => a.id === current.id)
      ? [{ id: current.id, title: current.title }, ...list]
      : list;
  });

  constructor() {
    super();
    this.api
      .artworksByStatus('PUBLISHED', undefined, 0, 200)
      .subscribe((p) => this.published.set(p.content));
    this.form.controls.startsAt.valueChanges.subscribe(() =>
      this.form.controls.endsAt.updateValueAndValidity(),
    );
    this.init();
  }

  protected override fetch(query: ListQuery): Observable<Page<Auction>> {
    const tab = this.tab();
    return this.api.auctionsByStatus(tab === 'ALL' ? [] : [tab], query.page ?? 0, query.size ?? 20);
  }

  protected setTab(tab: Tab): void {
    this.tab.set(tab);
    this.refilter();
  }

  protected editable(a: Auction): boolean {
    return a.bidCount === 0 && (a.status === 'SCHEDULED' || a.status === 'OPEN');
  }

  protected live(a: Auction): boolean {
    return a.status === 'SCHEDULED' || a.status === 'OPEN';
  }

  protected fill(item: Auction | null): void {
    this.form.reset({
      artworkId: item?.artwork.id ?? null,
      startingPrice: item?.startingPrice ?? null,
      minimumIncrement: item?.minimumIncrement ?? null,
      startsAt: item ? toLocalInput(item.startsAt) : '',
      endsAt: item ? toLocalInput(item.endsAt) : '',
    });
  }

  protected toRequest(): AuctionRequest {
    const v = this.form.getRawValue();
    return {
      artworkId: v.artworkId as number,
      startingPrice: Number(v.startingPrice),
      minimumIncrement: Number(v.minimumIncrement),
      startsAt: new Date(v.startsAt).toISOString(),
      endsAt: new Date(v.endsAt).toISOString(),
    };
  }

  protected confirmCancel(): void {
    const target = this.toCancel();
    if (!target) return;
    this.cancelling.set(true);
    this.api.cancelAuction(target.id).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.toCancel.set(null);
        toast.success('Auction cancelled.');
        this.reload();
      },
      error: (err) => {
        this.cancelling.set(false);
        this.toCancel.set(null);
        toast.error(messageOf(err));
      },
    });
  }
}
