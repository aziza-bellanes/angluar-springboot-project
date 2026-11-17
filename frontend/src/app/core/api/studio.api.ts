import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Artist,
  ArtistRequest,
  Artwork,
  ArtworkRequest,
  ArtworkStatus,
  Auction,
  AuctionRequest,
  AuctionStatus,
  Exhibition,
  ExhibitionRequest,
  Page,
  RoleName,
  StudioOverview,
  UserProfile,
} from '../models/api.models';
import { toParams } from './http-params';

export interface ListQuery {
  q?: string;
  page?: number;
  size?: number;
  sort?: string;
}

/**
 * Generic CRUD client for one studio resource. GET/POST are open to ADMIN and COLLABORATEUR,
 * PUT/DELETE to ADMIN only (enforced by the API).
 */
export class CrudResource<T, R> {
  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
  ) {}

  list(query: ListQuery & Record<string, string | number | undefined> = {}): Observable<Page<T>> {
    return this.http.get<Page<T>>(this.baseUrl, { params: toParams(query) });
  }

  get(id: number): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${id}`);
  }

  create(body: R): Observable<T> {
    return this.http.post<T>(this.baseUrl, body);
  }

  update(id: number, body: R): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class StudioApi {
  private readonly http = inject(HttpClient);

  /** Specification "Clients". */
  readonly artists = new CrudResource<Artist, ArtistRequest>(this.http, '/api/studio/artists');
  /** Specification "Projets". */
  readonly exhibitions = new CrudResource<Exhibition, ExhibitionRequest>(this.http, '/api/studio/exhibitions');
  readonly artworks = new CrudResource<Artwork, ArtworkRequest>(this.http, '/api/studio/artworks');
  readonly auctions = new CrudResource<Auction, AuctionRequest>(this.http, '/api/studio/auctions');

  overview(): Observable<StudioOverview> {
    return this.http.get<StudioOverview>('/api/studio/overview');
  }

  auctionsByStatus(status: AuctionStatus[], page = 0, size = 20): Observable<Page<Auction>> {
    return this.http.get<Page<Auction>>('/api/studio/auctions', { params: toParams({ status, page, size }) });
  }

  cancelAuction(id: number): Observable<Auction> {
    return this.http.post<Auction>(`/api/studio/auctions/${id}/cancel`, {});
  }

  artworksByStatus(status?: ArtworkStatus, q?: string, page = 0, size = 20): Observable<Page<Artwork>> {
    return this.http.get<Page<Artwork>>('/api/studio/artworks', { params: toParams({ status, q, page, size }) });
  }

  users(): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>('/api/admin/users');
  }

  updateRoles(id: number, roles: RoleName[]): Observable<UserProfile> {
    return this.http.put<UserProfile>(`/api/admin/users/${id}/roles`, { roles });
  }

  updateStatus(id: number, enabled: boolean): Observable<UserProfile> {
    return this.http.put<UserProfile>(`/api/admin/users/${id}/status`, { enabled });
  }
}
