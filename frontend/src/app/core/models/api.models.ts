/** TypeScript mirrors of the Spring Boot DTOs. Keep in sync with the backend `*Dtos.java` records. */

export type RoleName = 'ADMIN' | 'COLLABORATEUR' | 'BIDDER';

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  enabled: boolean;
  roles: RoleName[];
  /** Assigned database roles. Optional only for sessions restored from older releases. */
  roleIds?: number[];
  createdAt: string;
}

/** Body of the administrator create and update calls; an empty password on update keeps the current one. */
export interface UserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  password?: string | null;
  roleIds: number[];
  enabled: boolean;
}

export interface RoleInfo {
  id: number;
  name: string;
  profile: RoleName;
  system: boolean;
  userCount: number;
}

export interface RoleRequest {
  name: string;
  profile: RoleName;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: UserProfile;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/* ---------- Artists (specification: Client) ---------- */

export interface ArtistSummary {
  id: number;
  name: string;
  country?: string;
  biography?: string;
  photoUrl?: string;
}

export interface Artist extends ArtistSummary {
  email: string;
  phone?: string;
  address?: string;
  active: boolean;
  createdBy?: string;
  createdAt: string;
  version: number;
}

export interface ArtistRequest {
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  biography?: string | null;
  photoUrl?: string | null;
  active?: boolean;
}

/* ---------- Exhibitions (specification: Projet) ---------- */

export interface ExhibitionSummary {
  id: number;
  title: string;
  description?: string;
  durationDays: number;
  startsOn?: string;
  endsOn?: string;
  venue?: string;
  coverUrl?: string;
  artistId: number;
  artistName: string;
}

export interface Exhibition extends ExhibitionSummary {
  budget: number;
  createdBy?: string;
  createdAt: string;
  version: number;
}

export interface ExhibitionRequest {
  title: string;
  description?: string | null;
  budget: number;
  durationDays: number;
  startsOn?: string | null;
  venue?: string | null;
  coverUrl?: string | null;
  artistId: number;
}

/* ---------- Artworks ---------- */

export type ArtworkStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface ArtworkCard {
  id: number;
  slug: string;
  title: string;
  yearCreated?: number;
  medium?: string;
  imageUrl: string;
  artistId: number;
  artistName: string;
}

export interface ArtworkDetail {
  id: number;
  slug: string;
  title: string;
  yearCreated?: number;
  medium?: string;
  imageUrl: string;
  description?: string;
  dimensions?: string;
  imageCredit?: string;
  estimate?: number;
  artist: ArtistSummary;
  exhibitionId?: number;
  exhibitionTitle?: string;
}

export interface Artwork extends ArtworkCard {
  description?: string;
  dimensions?: string;
  imageCredit?: string;
  estimate?: number;
  status: ArtworkStatus;
  exhibitionId?: number;
  exhibitionTitle?: string;
  createdBy?: string;
  createdAt: string;
  version: number;
}

export interface ArtworkRequest {
  title: string;
  description?: string | null;
  yearCreated?: number | null;
  medium?: string | null;
  dimensions?: string | null;
  imageUrl: string;
  imageCredit?: string | null;
  estimate?: number | null;
  status?: ArtworkStatus;
  artistId: number;
  exhibitionId?: number | null;
}

/* ---------- Auctions ---------- */

export type AuctionStatus = 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface ArtworkRef {
  id: number;
  slug: string;
  title: string;
  imageUrl: string;
  artistId: number;
  artistName: string;
}

export interface Auction {
  id: number;
  status: AuctionStatus;
  artwork: ArtworkRef;
  startingPrice: number;
  currentPrice: number;
  minimumIncrement: number;
  minimumNextBid: number;
  startsAt: string;
  endsAt: string;
  bidCount: number;
  leadingBidderId?: number;
  leadingBidder?: string;
  winnerId?: number;
  winner?: string;
  version: number;
}

export interface AuctionRequest {
  artworkId: number;
  startingPrice: number;
  minimumIncrement: number;
  startsAt: string;
  endsAt: string;
}

export interface Bid {
  id: number;
  amount: number;
  bidderId: number;
  bidder: string;
  createdAt: string;
}

export type AuctionEventType = 'BID_PLACED' | 'STATUS_CHANGED' | 'UPDATED';

export interface AuctionEvent {
  type: AuctionEventType;
  auction: Auction;
  bid?: Bid;
  serverTime: string;
}

export interface MyBid {
  id: number;
  amount: number;
  createdAt: string;
  auctionId: number;
  auctionStatus: AuctionStatus;
  currentPrice: number;
  leading: boolean;
  artworkTitle: string;
  artworkSlug: string;
  imageUrl: string;
}

export interface StudioOverview {
  artists: number;
  exhibitions: number;
  publishedArtworks: number;
  draftArtworks: number;
  openAuctions: number;
  scheduledAuctions: number;
  closedAuctions: number;
  bids: number;
  users: number;
  exhibitionBudget: number;
  trends: OverviewTrends;
  bidActivity: BidActivityPoint[];
  auctionsByStatus: Record<AuctionStatus, number>;
  topArtists: TopArtist[];
  recentBids: RecentBid[];
  endingSoon: Auction[];
}

export interface OverviewTrends {
  newArtists: number;
  newArtistsPrevious: number;
  newExhibitions: number;
  newExhibitionsPrevious: number;
  bids: number;
  bidsPrevious: number;
  bidVolume: number;
  bidVolumePrevious: number;
  newUsers: number;
  newUsersPrevious: number;
}

export interface BidActivityPoint {
  day: string;
  bids: number;
  volume: number;
}

export interface TopArtist {
  artistId: number;
  name: string;
  bids: number;
  volume: number;
}

export interface RecentBid {
  auctionId: number;
  artworkTitle: string;
  imageUrl: string;
  bidder: string;
  amount: number;
  createdAt: string;
}

export interface ProfileRequest {
  firstName: string;
  lastName: string;
  phone: string | null;
}

export interface PasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** RFC 9457 problem detail returned by the API. */
export interface ApiProblem {
  status: number;
  code?: string;
  detail?: string;
  fields?: Record<string, string>;
}
