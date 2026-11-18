# Test plan

ATELIER is tested at four levels: backend unit tests, backend integration tests against a real MySQL, frontend unit tests, and API scenario tests with Postman/Newman. A GitHub Actions pipeline runs the automated levels on every push to `main` and every pull request. A manual checklist per role covers the user experience.

## 1. Backend

Location: `backend/src/test/java/com/sip/psm/`. Unit tests are `*Test` (Surefire); integration tests are `*IT` (Failsafe), both run by `./mvnw verify`.

### Test infrastructure (`support/`)

| Class | Role |
|---|---|
| `MySqlTestContainer` | Starts a real MySQL 8.4 container (Testcontainers) so Flyway migrations, constraints and row locks behave as in production |
| `IntegrationTest` | Meta-annotation: full Spring context, MockMvc, `test` profile (`src/test/resources/application-test.yml`: fixed JWT secret, no bootstrap admin, scheduler interval `PT1H` so tests drive the lifecycle explicitly) |
| `TestFixtures` | Creates persisted users, artists, exhibitions, artworks and open auctions with unique values, and issues bearer tokens, so tests stay independent |

### Unit tests

| Class | Covers |
|---|---|
| `auction/AuctionTest` | Pure domain rules of `Auction`, no Spring: opens at start time, first bid may equal the starting price, bids below the minimum increment are rejected, the leader cannot outbid themselves, no bids before opening or after closing, a late bid extends the auction (soft close), closing records the winner, a cancelled auction rejects bids |

### Integration tests

| Class | Covers |
|---|---|
| `auth/AuthIT` | Registration creates a `BIDDER` and returns a token; duplicate email 409; invalid payload returns field errors; **exactly one email is sent to the admin**; registration still succeeds when the mail server fails; login success, wrong password 401, disabled user 401; `/api/auth/me` with and without a token |
| `security/SecurityMatrixIT` | Parameterized authorization matrix of `SecurityConfig` for anonymous, `BIDDER`, `COLLABORATEUR` and `ADMIN` across public, studio, admin and bidding endpoints |
| `catalog/CatalogFlowIT` | A collaborateur builds the catalogue; visitors see only public fields (no contact details, no budget); draft artworks are hidden; duplicate titles get distinct slugs; exhibition of another artist rejected; artist with exhibitions cannot be deleted; admin updates; invalid payload field errors |
| `catalog/DatabaseRelationshipsIT` | Flushes and reloads actual MySQL rows to prove several roles per user, a shared role across users, and two exhibitions belonging to the same artist through both JPA navigation directions |
| `auction/AuctionFlowIT` | Second live auction for one artwork rejected; end before start (`invalid_window`) and end in the past (validation); draft artwork cannot be auctioned; bidding rules, bids ordered highest first with masked names; account bids report the leading bid; cancelled auctions reject bids; auctions with bids cannot be deleted; auctions without bids can; the lifecycle scheduler closes an expired auction and records the winner |
| `auction/ConcurrentBiddingIT` | **Concurrency**: many collectors submit the same amount at the same instant on parallel threads; exactly one request gets 201, all others 409, and the stored price, bid count and bid rows stay consistent (validates the pessimistic lock) |
| `account/ProfileIT` | Profile update, invalid profile rejected, password change requires the current password and then allows login with the new one, anonymous access refused |
| `studio/StudioOverviewIT` | Dashboard aggregates: trends, two weeks of daily activity, rankings, recent bids |
| `user/AdminUserIT` | Admin creates, reads, updates and deletes users under `/api/admin/users`: duplicate email 409 `email_taken`, invalid create rejected, update changes fields and the login uses the new password, empty password keeps the current one, taken email refused on update, deletion of a user without activity, own account refused (`cannot_delete_self`), user with bids refused (`user_has_activity`), Collaborateur forbidden on the new endpoints, role list |
| `demo/DemoDataIT` | The demonstration gallery loads completely, with auctions in every state |

### Running

```bash
cd backend
./mvnw -B test                          # unit tests only (no Docker needed)
./mvnw -B verify                        # unit + integration tests (Docker required for Testcontainers)
./mvnw -B verify -Dit.test=AuthIT       # one integration class
./mvnw -B -Dtest=AuctionTest test       # one unit class
```

Reports: `backend/target/surefire-reports/` and `backend/target/failsafe-reports/`.

## 2. Frontend (Vitest)

Specs sit next to the code (`*.spec.ts`) and run with Angular's test builder (Vitest + jsdom).

| Spec | Covers |
|---|---|
| `core/auth/guards.spec.ts` | `authGuard` redirects to `/login` with `returnUrl`; `roleGuard` sends a bidder to `/forbidden`, lets an admin through, sends a signed-out visitor to `/login`; `guestGuard` sends staff to `/studio` and bidders to `/account` |
| `core/auth/auth.interceptor.spec.ts` | Bearer token added to `/api/` calls only when signed in; not added to other URLs; 401 on a normal call ends the session; 401 from the login call keeps it |
| `core/auth/auth.store.spec.ts` | Signed out by default; login stores the session and exposes roles; logout clears state and storage; expired stored sessions ignored; valid stored sessions restored |
| `core/api/problem.spec.ts` | Reading `code`, `detail` and `fields` from problem bodies; offline (status 0); status text fallback; non-HTTP errors |
| `core/api/http-params.spec.ts` | Query parameter building: skips null/empty, keeps `0` and `false`, repeats array keys |
| `core/util/format.spec.ts` | Countdown formatting and euro price formatting |
| `features/studio/overview/overview-metrics.spec.ts` | Trend percentages, shares for ranking progress bars, compact euro ticks, chart datasets and status bar order |
| `shared/animations/riffle-formations.spec.ts` | Riffle poses: compact on phones, deterministic bounded jitter, ring, pile, corridor and featured formations, finite poses for all sizes |

```bash
cd frontend
npm ci
npm test               # single run (ng test --watch=false)
npm run test:watch     # watch mode
npm run build          # production build must also succeed
npm run format:check   # Prettier
```

## 3. Postman and Newman

`postman/ATELIER.postman_collection.json` contains requests with `pm.test` assertions, chained through collection variables (`adminToken`, `curatorToken`, `bidderToken`, `artistId`, `auctionId`, ...). Folders:

`0 · Auth`, `1 · Clients — Artists`, `2 · Projets — Exhibitions`, `3 · Artworks`, `4 · Auctions`, `5 · Account`, `6 · Users (admin)`, `7 · Public gallery`, `8 · Security checks`.

Prerequisites: the backend running with `DEMO_DATA=true` (the development Docker stack does this) and the bootstrap admin of `.env.example`.

- **Postman**: import the collection, check the `baseUrl` variable (default `http://localhost:8080`) and run the collection in order with the Collection Runner.
- **Newman** (CLI, also suitable for CI):

```bash
npx newman run postman/ATELIER.postman_collection.json --env-var baseUrl=http://localhost:8080
```

Folder 6 also covers user administration: it creates a temporary Collaborateur with a unique email, checks the duplicate-email refusal (409 `email_taken`), reads and updates the user, checks that a Collaborateur cannot create users (403), checks that an admin cannot delete their own account (409 `cannot_delete_self`), deletes the temporary user (204), and lists the roles.

The collection exercises the CDC checklist: login and registration, Client (Artist) and Projet (Exhibition) resources before and after security, role restrictions (collaborateur cannot update or delete, bidder cannot use the studio), and the security checks that anonymous calls are refused.

## 4. Continuous integration

`.github/workflows/ci.yml`, triggered on push to `main` and on pull requests (a new push cancels the previous run of the same ref):

| Job | Steps |
|---|---|
| `backend` | Java 17 (Temurin) with Maven cache, `./mvnw -B verify` (unit + Testcontainers integration tests on the runner's Docker) |
| `frontend` | Node from `.nvmrc`, `npm ci`, `npm test`, `npm run build` |
| `image` | After both succeed: Docker Buildx builds the production image (`psm.jar` with Angular) without pushing |

A pull request may be merged only when all three jobs pass.

## 5. Manual test checklist

Start the stack (`docker compose up`) and use the accounts listed in the [README](../README.md#demo-accounts).

### Visitor (not signed in)
- [ ] Homepage plays the opening shuffle, then scrolling moves through ring, pile, corridor and featured painting; with reduced motion enabled a calm row is shown instead.
- [ ] `/artworks` lists artworks; search and filters narrow the results; an artwork opens with a grow-from-card transition.
- [ ] Artist and exhibition pages show no email, phone, address or budget.
- [ ] `/auctions` lists auctions; an auction room shows price, countdown and bid history with masked names; the bid panel asks to sign in.
- [ ] `/studio` and `/account` redirect to the sign-in page.

### Bidder
- [ ] Register with a new email: you land signed in; Mailpit (http://localhost:8025) shows one email to the admin.
- [ ] Registering the same email again shows a clear error.
- [ ] Sign in as `collector@atelier.demo`; open an open auction; place a valid bid after the confirmation dialog; price, leader and history update immediately.
- [ ] A bid below the minimum is refused; bidding while already leading is refused.
- [ ] With two browsers (collector and patron), a bid by one updates the other's room live; the first user sees they are outbid.
- [ ] A bid in the last minute extends the countdown.
- [ ] `/account` shows "My bids" with leading flags and "Won works"; profile and password changes work; the new password signs in.
- [ ] `/studio` shows the access-denied page.

### Collaborateur (`curator@atelier.demo`)
- [ ] Signs in and lands in the Studio; sidebar shows Overview, Artists, Exhibitions, Artworks (no Auctions, no Users).
- [ ] Dashboard shows KPI cards, trends, the line and bar charts and ranking tables.
- [ ] Can view and add an artist, an exhibition and an artwork; no edit or delete buttons are shown.
- [ ] Navigating by URL to `/studio/auctions` or `/studio/users` is denied.

### Administrator (`admin@atelier.local`)
- [ ] Edit and delete artists, exhibitions and artworks; deleting an artist that still has exhibitions shows a clear conflict message.
- [ ] Create an auction for a published artwork; a second live auction for the same artwork is refused; edit it before bids; cancel it; delete one without bids; an auction with bids cannot be deleted.
- [ ] Users page: change a user's roles; disable and re-enable an account (a disabled user cannot sign in); trying to remove your own admin role or disable yourself is refused.
- [ ] Profile page updates name and phone.

### Cross-cutting
- [ ] Reload on a deep link (`/artworks/<slug>`, `/studio/artists`) works.
- [ ] Stop the backend while on the auctions list: the indicator changes from "Live updates on" to "Connecting…" and live updates resume after restart.
- [ ] Keyboard navigation reaches dialogs and forms; focus is visible.
- [ ] Layout is usable at phone width.
