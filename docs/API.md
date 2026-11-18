# REST and WebSocket API

Base URL: `http://localhost:8080` (development) or your public URL. All bodies are JSON (`Content-Type: application/json`); dates are ISO-8601 UTC strings; money amounts are JSON numbers with two decimals.

A ready-to-run collection is available in [`postman/ATELIER.postman_collection.json`](../postman/ATELIER.postman_collection.json).

## Conventions

- **Authentication**: `Authorization: Bearer <token>`, where the token comes from `/api/auth/login` or `/api/auth/register`.
- **Pagination**: list endpoints accept `page` (0-based), `size` and `sort` (`field,asc|desc`) and return:

  ```json
  { "content": [], "page": 0, "size": 20, "totalElements": 0, "totalPages": 0 }
  ```

- **Roles**: `—` public, `Auth` any signed-in user, `BIDDER`, `STAFF` (= `ADMIN` or `COLLABORATEUR`), `ADMIN`.
- **Common errors**: 400 `validation_failed`/`bad_request`, 401 `authentication_required`, 403 `forbidden`, 404 `not_found`, 409 business rules (see [Error format](#error-format)). They are not repeated in every table.

## Authentication — `/api/auth`

| Method | Path | Role | Request | Success |
|---|---|---|---|---|
| POST | `/api/auth/register` | — | `RegisterRequest` | 201 `AuthResponse` |
| POST | `/api/auth/login` | — | `LoginRequest` | 200 `AuthResponse` |
| GET | `/api/auth/me` | Auth | — | 200 `UserResponse` |

```jsonc
// RegisterRequest
{ "firstName": "Theo", "lastName": "Collector", "email": "theo@example.com",
  "password": "min 8, max 72 chars", "phone": "+33 6 12 34 56 78" /* optional */ }
// LoginRequest
{ "email": "admin@atelier.local", "password": "Admin123!" }
// AuthResponse
{ "token": "eyJ...", "expiresAt": "2026-11-17T22:00:00Z", "user": { /* UserResponse */ } }
// UserResponse
{ "id": 1, "firstName": "Atelier", "lastName": "Admin", "email": "admin@atelier.local",
  "phone": null, "enabled": true, "roles": ["ADMIN"], "createdAt": "2026-11-17T10:00:00Z" }
```

Errors: register 409 `email_taken`; login 401 `invalid_credentials` (wrong password or disabled account). A successful registration creates a `BIDDER` and emails `ADMIN_EMAIL`.

## Public gallery (no authentication)

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/api/artworks` | `q`, `artistId`, `exhibitionId`, `medium`, paging (default size 24, `id,desc`) | `PageResponse<ArtworkCard>`, published works only |
| GET | `/api/artworks/{slug}` | — | `ArtworkDetail` (404 for drafts and archived) |
| GET | `/api/artists` | `q`, paging (size 24, `name,asc`) | `PageResponse<ArtistSummary>`, active artists only |
| GET | `/api/artists/{id}` | — | `ArtistSummary` |
| GET | `/api/exhibitions` | `q`, `artistId`, paging (size 24, `startsOn`) | `PageResponse<ExhibitionSummary>` |
| GET | `/api/exhibitions/{id}` | — | `ExhibitionSummary` |

```jsonc
// ArtworkCard
{ "id": 5, "slug": "wheat-field", "title": "Wheat Field", "yearCreated": 1889, "medium": "Oil on canvas",
  "imageUrl": "https://...", "artistId": 2, "artistName": "Vincent van Gogh" }
// ArtworkDetail adds: description, dimensions, imageCredit, estimate, artist (ArtistSummary), exhibitionId, exhibitionTitle
// ArtistSummary   { "id", "name", "country", "biography", "photoUrl" }   (no email, phone or address)
// ExhibitionSummary { "id", "title", "description", "durationDays", "startsOn", "endsOn", "venue", "coverUrl", "artistId", "artistName" }   (no budget)
```

## Auctions (public reads, bidding for `BIDDER`)

| Method | Path | Role | Request / query | Success |
|---|---|---|---|---|
| GET | `/api/auctions` | — | `status` (repeatable: `SCHEDULED`, `OPEN`, `CLOSED`, `CANCELLED`), `artworkId`, paging (size 24, `endsAt,asc`) | 200 `PageResponse<AuctionView>` |
| GET | `/api/auctions/{id}` | — | — | 200 `AuctionView` |
| GET | `/api/auctions/{id}/bids` | — | paging (size 20, highest first) | 200 `PageResponse<BidView>` |
| POST | `/api/auctions/{id}/bids` | `BIDDER` | `{ "amount": 550.00 }` (`>= 0.01`, max 2 decimals) | 201 `AuctionEvent` |

```jsonc
// AuctionView
{ "id": 12, "status": "OPEN",
  "artwork": { "id": 5, "slug": "wheat-field", "title": "Wheat Field", "imageUrl": "https://...", "artistId": 2, "artistName": "Vincent van Gogh" },
  "startingPrice": 500.00, "currentPrice": 550.00, "minimumIncrement": 50.00, "minimumNextBid": 600.00,
  "startsAt": "2026-11-17T09:00:00Z", "endsAt": "2026-11-17T18:00:00Z", "bidCount": 2,
  "leadingBidderId": 7, "leadingBidder": "Theo C.", "winnerId": null, "winner": null, "version": 3 }
// BidView
{ "id": 31, "amount": 550.00, "bidderId": 7, "bidder": "Theo C.", "createdAt": "2026-11-17T10:15:00Z" }
```

Bidder names are masked to "First L." in public views.

Bid rules (409 codes): `auction_not_open`, `already_leading` (the leader cannot outbid themselves), `bid_too_low` (below `minimumNextBid`; the first bid may equal the starting price). Staff accounts without the `BIDDER` role receive 403. A bid within the soft-close window extends `endsAt`.

## Account — `/api/account` (any signed-in user)

| Method | Path | Request | Success |
|---|---|---|---|
| PUT | `/api/account/profile` | `{ "firstName", "lastName", "phone" }` (first and last name required, max 80) | 200 `UserResponse` |
| PUT | `/api/account/password` | `{ "currentPassword", "newPassword" }` (new: 8 to 100 chars) | 204; 409 `wrong_password` |
| GET | `/api/account/bids` | paging (size 20) | 200 `PageResponse<MyBidView>` |
| GET | `/api/account/wins` | — | 200 `AuctionView[]` (auctions won) |

```jsonc
// MyBidView
{ "id": 31, "amount": 550.00, "createdAt": "...", "auctionId": 12, "auctionStatus": "OPEN",
  "currentPrice": 550.00, "leading": true, "artworkTitle": "Wheat Field", "artworkSlug": "wheat-field", "imageUrl": "https://..." }
```

## Studio catalogue — `/api/studio/...` (read and create: `STAFF`; update and delete: `ADMIN`)

All studio resources share the same shape of endpoints:

| Method | Path | Role | Success |
|---|---|---|---|
| GET | `/api/studio/{resource}` | STAFF | 200 `PageResponse` (size 20) |
| GET | `/api/studio/{resource}/{id}` | STAFF | 200 response DTO |
| POST | `/api/studio/{resource}` | STAFF | 201 response DTO |
| PUT | `/api/studio/{resource}/{id}` | ADMIN | 200 response DTO |
| DELETE | `/api/studio/{resource}/{id}` | ADMIN | 204 |

Where `{resource}` is `artists`, `exhibitions` or `artworks`. (`GET /{id}` is not offered for auctions.)

### Artists (CDC *Clients*)

List query: `q`. Request `ArtistRequest`:

```jsonc
{ "name": "required, max 120", "email": "required, valid, max 190", "phone": "max 30", "address": "max 255",
  "country": "max 80", "biography": "max 4000", "photoUrl": "max 500", "active": true }
```

Response `ArtistResponse`: all of the above plus `id`, `createdBy` (email), `createdAt`, `version`. Delete returns 409 `integrity_violation` while the artist still has exhibitions or artworks.

### Exhibitions (CDC *Projets*)

List query: `q`, `artistId`. Request `ExhibitionRequest`:

```jsonc
{ "title": "required, max 160", "description": "max 4000", "budget": 45000.00 /* >= 0, required */,
  "durationDays": 45 /* 1..3650, required */, "startsOn": "2026-12-01", "venue": "max 160",
  "coverUrl": "max 500", "artistId": 2 /* required */ }
```

Response `ExhibitionResponse`: request fields plus `id`, `endsOn`, `artistName`, `createdBy`, `createdAt`, `version`.

### Artworks

List query: `q`, `artistId`, `status` (`DRAFT`, `PUBLISHED`, `ARCHIVED`). Request `ArtworkRequest`:

```jsonc
{ "title": "required, max 160", "description": "max 4000", "yearCreated": 1889 /* 1000..2100 */,
  "medium": "max 120", "dimensions": "max 80", "imageUrl": "required, max 500", "imageCredit": "max 255",
  "estimate": 12000.00, "status": "PUBLISHED" /* default */, "artistId": 2 /* required */, "exhibitionId": 4 }
```

Response `ArtworkResponse`: request fields plus `id`, `slug`, `artistName`, `exhibitionTitle`, `createdBy`, `createdAt`, `version`. Error: 409 `exhibition_artist_mismatch` when the exhibition belongs to another artist.

### Auctions — `ADMIN` only

| Method | Path | Request | Success |
|---|---|---|---|
| GET | `/api/studio/auctions` | `status` (repeatable), paging (size 20, `startsAt,desc`) | 200 `PageResponse<AuctionView>` |
| POST | `/api/studio/auctions` | `AuctionRequest` | 201 `AuctionView` |
| PUT | `/api/studio/auctions/{id}` | `AuctionRequest` | 200 `AuctionView` |
| POST | `/api/studio/auctions/{id}/cancel` | — | 200 `AuctionView` |
| DELETE | `/api/studio/auctions/{id}` | — | 204 |

```jsonc
// AuctionRequest
{ "artworkId": 5, "startingPrice": 500.00 /* >= 1 */, "minimumIncrement": 50.00 /* >= 1 */,
  "startsAt": "2026-12-01T09:00:00Z", "endsAt": "2026-12-01T18:00:00Z" /* must be in the future and after startsAt */ }
```

409 codes: `artwork_not_published`, `auction_overlap` (the artwork already has a scheduled or open auction), `invalid_window`, `auction_locked` (edit after the first bid), `artwork_change`, `auction_finished` (cancel on a closed or cancelled auction), `auction_has_bids` (delete; cancel instead).

### Overview — `GET /api/studio/overview` (STAFF)

Dashboard data in one call:

```jsonc
{ "artists": 6, "exhibitions": 6, "publishedArtworks": 18, "draftArtworks": 1,
  "openAuctions": 3, "scheduledAuctions": 2, "closedAuctions": 1, "bids": 14, "users": 4,
  "exhibitionBudget": 270000.00,
  "trends": { "newArtists": 1, "newArtistsPrevious": 0, "newExhibitions": 1, "newExhibitionsPrevious": 0,
              "bids": 9, "bidsPrevious": 5, "bidVolume": 8200.00, "bidVolumePrevious": 4100.00,
              "newUsers": 2, "newUsersPrevious": 1 },
  "bidActivity": [ { "day": "2026-11-16", "bids": 4, "volume": 2100.00 } ],
  "auctionsByStatus": { "OPEN": 3, "SCHEDULED": 2, "CLOSED": 1, "CANCELLED": 0 },
  "topArtists": [ { "artistId": 2, "name": "Vincent van Gogh", "bids": 7, "volume": 4200.00 } ],
  "recentBids": [ { "auctionId": 12, "artworkTitle": "Wheat Field", "imageUrl": "...", "bidder": "Theo C.", "amount": 550.00, "createdAt": "..." } ],
  "endingSoon": [ /* AuctionView[] */ ] }
```

Trends compare the last seven days with the seven days before.

## User administration — `/api/admin/users` (`ADMIN`)

| Method | Path | Request | Success |
|---|---|---|---|
| GET | `/api/admin/users` | — | 200 `UserResponse[]` |
| GET | `/api/admin/users/{id}` | — | 200 `UserResponse` |
| POST | `/api/admin/users` | `CreateUserRequest` | 201 `UserResponse` |
| PUT | `/api/admin/users/{id}` | `UpdateUserRequest` | 200 `UserResponse` |
| DELETE | `/api/admin/users/{id}` | — | 204 |
| PUT | `/api/admin/users/{id}/roles` | `{ "roles": ["COLLABORATEUR"] }` (non-empty set of `ADMIN`, `COLLABORATEUR`, `BIDDER`) | 200 `UserResponse` |
| PUT | `/api/admin/users/{id}/status` | `{ "enabled": false }` | 200 `UserResponse` |
| GET | `/api/admin/roles` | — | 200 `RoleResponse[]` |

Unknown ids return 404 `not_found`.

```jsonc
// CreateUserRequest
{ "firstName": "required, max 80", "lastName": "required, max 80", "email": "required, valid, max 190",
  "phone": "optional, max 30, digits and + ( ) - only", "password": "required, 8 to 72 chars",
  "roles": ["COLLABORATEUR"] /* required, non-empty */, "enabled": true /* optional, default true */ }

// UpdateUserRequest (send the whole profile)
{ "firstName": "required, max 80", "lastName": "required, max 80", "email": "required, valid, max 190",
  "phone": "optional, max 30", "password": "optional: omit or leave empty to keep the current one, otherwise 8 to 72 chars",
  "roles": ["COLLABORATEUR"] /* required, non-empty */, "enabled": true /* required */ }

// RoleResponse (GET /api/admin/roles)
{ "id": 2, "name": "COLLABORATEUR" }
```

Rules:

- `email` is stored in lower case. Creating a user, or changing a user's email, to an address used by another account returns 409 `email_taken`.
- `PUT /{id}` returns 409 `password_too_short` when a supplied password has fewer than 8 characters.
- An admin cannot remove their own `ADMIN` role or disable their own account (409 `self_demotion`, `self_disable`), on either the update or the roles and status endpoints.
- Any change that would leave no enabled administrator returns 409 `last_admin`.
- `DELETE /{id}` returns 204 only for an account with no activity. Otherwise it returns 409:
  - `cannot_delete_self`: the caller's own account;
  - `last_admin`: the last enabled administrator;
  - `user_has_activity`: the user has placed bids, won or leads an auction, or has created artists, exhibitions or artworks. Disable the account with `PUT /{id}/status` instead.

## Health

`GET /actuator/health` and `/actuator/health/readiness` are public (used by the Docker health check and `deploy.sh`).

## WebSocket (STOMP)

- **Endpoint**: `/ws` (STOMP over native WebSocket; allowed origins = `CORS_ORIGINS`). Behind Nginx the `/ws` location must forward the `Upgrade` header (see [DEPLOYMENT.md](DEPLOYMENT.md)).
- **CONNECT**: optional native header `Authorization: Bearer <token>`. An invalid token is rejected; no header means an anonymous read-only connection.
- **Topics** (subscribe only):

| Destination | Receives |
|---|---|
| `/topic/auctions/{id}` | every event of one auction |
| `/topic/auctions` | every event of every auction (used by listings) |

- **SEND is refused.** Bids are placed with `POST /api/auctions/{id}/bids`.
- Events are published **after** the database transaction commits.

Event payload `AuctionEvent`:

```json
{
  "type": "BID_PLACED",
  "auction": { "id": 12, "status": "OPEN", "currentPrice": 600.00, "minimumNextBid": 650.00, "bidCount": 3, "leadingBidder": "Jo P.", "endsAt": "2026-11-17T18:01:00Z", "version": 4 },
  "bid": { "id": 32, "amount": 600.00, "bidderId": 8, "bidder": "Jo P.", "createdAt": "2026-11-17T17:59:30Z" },
  "serverTime": "2026-11-17T17:59:30Z"
}
```

(`auction` is the full `AuctionView`, abbreviated here.) `type` is `BID_PLACED` (with `bid`), `STATUS_CHANGED` (auction opened, closed or cancelled; no `bid`) or `UPDATED` (terms edited or auction created). `serverTime` lets clients correct their countdown for clock drift.

## Error format

Errors are RFC 9457 `application/problem+json` with an additional stable `code`:

```json
{
  "type": "about:blank",
  "title": "Conflict",
  "status": 409,
  "detail": "The minimum bid is now 600.00",
  "instance": "/api/auctions/12/bids",
  "code": "bid_too_low"
}
```

Validation failure (400) adds a `fields` object:

```json
{
  "title": "Bad Request",
  "status": 400,
  "detail": "Some fields are invalid",
  "code": "validation_failed",
  "fields": { "email": "must be a well-formed email address", "name": "must not be blank" }
}
```

| Status | `code` | Meaning |
|---|---|---|
| 400 | `validation_failed`, `bad_request` | Invalid body, parameter or enum value |
| 401 | `authentication_required` | Missing, invalid or expired token |
| 401 | `invalid_credentials` | Wrong email or password, or disabled account |
| 403 | `forbidden` | Role not allowed (including a non-bidder placing a bid) |
| 404 | `not_found` | Unknown resource |
| 409 | `stale_update` | Optimistic lock: the record changed, reload and retry |
| 409 | `integrity_violation` | Record still referenced (for example an artist with exhibitions) |
| 409 | `email_taken`, `wrong_password`, `self_demotion`, `self_disable`, `last_admin`, `password_too_short`, `cannot_delete_self`, `user_has_activity` | Account rules |
| 409 | `exhibition_artist_mismatch`, `artwork_not_published`, `invalid_window`, `auction_overlap`, `auction_locked`, `artwork_change`, `auction_finished`, `auction_has_bids` | Catalogue and auction rules |
| 409 | `auction_not_open`, `already_leading`, `bid_too_low` | Bidding rules |
