import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ArtistSummary,
  ArtworkCard,
  ArtworkDetail,
  Auction,
  AuctionStatus,
  Bid,
  ExhibitionSummary,
  MyBid,
  Page,
} from '../models/api.models';
import { toParams } from './http-params';

export interface ArtworkFilter {
  q?: string;
  artistId?: number;
  exhibitionId?: number;
  medium?: string;
  page?: number;
  size?: number;
}

/** Public gallery endpoints: artworks, artists, exhibitions, auctions, plus the collector's account. */
@Injectable({ providedIn: 'root' })
export class GalleryApi {
  private readonly http = inject(HttpClient);

  artworks(filter: ArtworkFilter = {}): Observable<Page<ArtworkCard>> {
    return this.http.get<Page<ArtworkCard>>('/api/artworks', { params: toParams({ ...filter }) });
  }

  artwork(slug: string): Observable<ArtworkDetail> {
    return this.http.get<ArtworkDetail>(`/api/artworks/${encodeURIComponent(slug)}`);
  }

  artists(q?: string, page = 0, size = 48): Observable<Page<ArtistSummary>> {
    return this.http.get<Page<ArtistSummary>>('/api/artists', { params: toParams({ q, page, size }) });
  }

  artist(id: number): Observable<ArtistSummary> {
    return this.http.get<ArtistSummary>(`/api/artists/${id}`);
  }

  exhibitions(artistId?: number, page = 0, size = 24): Observable<Page<ExhibitionSummary>> {
    return this.http.get<Page<ExhibitionSummary>>('/api/exhibitions', { params: toParams({ artistId, page, size }) });
  }

  exhibition(id: number): Observable<ExhibitionSummary> {
    return this.http.get<ExhibitionSummary>(`/api/exhibitions/${id}`);
  }

  auctions(status: AuctionStatus[] = [], artworkId?: number, size = 24): Observable<Page<Auction>> {
    return this.http.get<Page<Auction>>('/api/auctions', { params: toParams({ status, artworkId, size }) });
  }

  auction(id: number): Observable<Auction> {
    return this.http.get<Auction>(`/api/auctions/${id}`);
  }

  bids(auctionId: number, size = 20): Observable<Page<Bid>> {
    return this.http.get<Page<Bid>>(`/api/auctions/${auctionId}/bids`, { params: toParams({ size }) });
  }

  placeBid(auctionId: number, amount: number): Observable<unknown> {
    return this.http.post(`/api/auctions/${auctionId}/bids`, { amount });
  }

  myBids(page = 0, size = 20): Observable<Page<MyBid>> {
    return this.http.get<Page<MyBid>>('/api/account/bids', { params: toParams({ page, size }) });
  }

  myWins(): Observable<Auction[]> {
    return this.http.get<Auction[]>('/api/account/wins');
  }
}
