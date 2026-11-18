# Course specification equivalence

The course specification ("CDC: Projects Manager", version 1.0, course *Formation FullStack Spring Boot & Angular*) describes a **PSM** application that manages clients and their projects. SmartSoft Solutions delivers it as **ATELIER**, a digital art gallery with live auctions. The back-office (the **Studio**) is the PSM application: *Clients* are **Artists**, *Projets* are **Exhibitions**.

The mapping below describes the implementation. The [dated CDC audit](CDC_AUDIT.md) records verification and qualifications: **live VPS deployment remains pending**, the Angular dashboard is an Argon-inspired rebuild. These adaptations must be acknowledged rather than counted as exact reproduction of every training step. Paths are relative to the repository root; `BE` stands for `backend/src/main/java/com/sip/psm` and `FE` for `frontend/src/app`.

## 1. Domain model

| CDC item | ATELIER implementation | Where in code |
|---|---|---|
| `User` (id, email, password, tel, nom, prénom) | `User` entity: `id`, `email` (unique), `password` (BCrypt hash), `phone`, `lastName`, `firstName`, plus `enabled` and audit timestamps | `BE/user/User.java`, table `users` in `backend/src/main/resources/db/migration/V1__core_schema.sql` |
| `Role` (id, libellé) | `Role` has an editable unique `libelle` and a fixed permission `profile`. Full ADMIN CRUD at `/api/admin/roles` and `/studio/roles`; users select actual role IDs. Required system roles retain their profile and cannot be deleted. Assigned custom roles must be unassigned before profile changes or deletion. `BIDDER` extends the CDC profiles for collectors. | `BE/user/Role.java`, `RoleService.java`, `AdminRoleController.java`, `V3__dynamic_roles.sql`, `FE/features/studio/roles/` |
| `User` *..* `Role` (Many-to-Many) | `User.roles` mapped with join table `user_roles` (`user_id`, `role_id`) | `BE/user/User.java`, `V1__core_schema.sql` |
| `Client` (id, nom, tel, email, adresse) | `Artist` entity: `name`, `phone`, `email`, `address`, `photoUrl`, `active`, plus extra `biography` and `country`. Public pages see only name, country, biography and photo; contact details stay in the Studio | `BE/artist/Artist.java`, `BE/artist/ArtistDtos.java`, table `artists` |
| `Projet` (id, libellé, budget, durée, description, idClient) | `Exhibition` entity: `title` (libellé), `budget` (`BigDecimal`), `durationDays` (durée), `description`, `artist` (idClient), plus `startsOn`, `venue`, `coverUrl`. The public projection hides the budget | `BE/exhibition/Exhibition.java`, `BE/exhibition/ExhibitionDtos.java`, table `exhibitions` |
| `Client` 1..* `Projet` (One-to-Many / Many-to-One) | `Artist` 1..* `Exhibition`; `Exhibition.artist` is a mandatory many-to-one with foreign key `fk_exhibitions_artist`. An artist with exhibitions cannot be deleted (409 `integrity_violation`) | `BE/exhibition/Exhibition.java`, `V1__core_schema.sql` |
| Class diagram (Fig. 1) | Mermaid class diagram, extended with artworks, auctions and bids | [ARCHITECTURE.md](ARCHITECTURE.md#domain-model) |

## 2. Roles and permissions

Named roles select one of the stable permission profiles below. Display labels remain editable and do not define authority.

The CDC: **Admin** performs every CRUD operation on clients and projects; **Collaborateur** may only view and add them.

Authoritative matrix, enforced server-side in `BE/config/SecurityConfig.java` and verified by `backend/src/test/java/com/sip/psm/security/SecurityMatrixIT.java`:

| Resource | Anonymous | BIDDER | COLLABORATEUR | ADMIN |
|---|---|---|---|---|
| Public reads: `GET /api/artworks/**`, `/api/artists/**`, `/api/exhibitions/**`, `/api/auctions/**` | yes | yes | yes | yes |
| `POST /api/auth/register`, `POST /api/auth/login` | yes | yes | yes | yes |
| `POST /api/auctions/{id}/bids` | no | **yes** | no | no |
| `GET /api/studio/**` (artists, exhibitions, artworks, overview) | no | no | yes | yes |
| `POST /api/studio/**` (create artist, exhibition, artwork) | no | no | yes | yes |
| `PUT` / `DELETE /api/studio/**` (update, delete) | no | no | no | yes |
| `/api/studio/auctions/**` (any method) | no | no | no | yes |
| `/api/admin/**` (users and roles) | no | no | no | yes |
| Other `/api/**` (`/api/auth/me`, `/api/account/**`) | no | yes | yes | yes |

The Angular UI mirrors the matrix (it is a convenience, not a security boundary): Collaborateurs do not see edit or delete actions, nor the Auctions, Users and Roles pages.

## 3. Part 1 — Spring

| CDC item | ATELIER implementation | Where in code |
|---|---|---|
| 1. Spring Boot project with Web, Data JPA, DevTools, MySQL Driver | Spring Boot 3.5 with `spring-boot-starter-web`, `-data-jpa`, `spring-boot-devtools`, `mysql-connector-j` (plus Security, Validation, Mail, WebSocket, Actuator, Flyway, JJWT) | `backend/pom.xml` |
| 2. CRUD for the entities, without security | Layered by feature: controller, service, repository, DTO records. Clients and Projets CRUD are `StudioArtistController` and `StudioExhibitionController`; users via `AdminUserController`. **User and Role CRUD is complete**: list, read, create, update and delete under `/api/admin/users` and `/api/admin/roles` (see [API.md](API.md#user-administration--apiadminusers-admin)) | `BE/artist/`, `BE/exhibition/`, `BE/user/` |
| 3. Test the APIs in Postman | Postman collection covering every endpoint and role, runnable with Newman | `postman/ATELIER.postman_collection.json`, [TEST_PLAN.md](TEST_PLAN.md#postman-and-newman) |
| 4. Add the security layer and JWT | Stateless Spring Security with a `JwtAuthenticationFilter` and `JwtService` (JJWT, HS256, expiry `JWT_EXPIRATION`, default 12 h); BCrypt passwords | `BE/config/SecurityConfig.java`, `BE/security/JwtAuthenticationFilter.java`, `BE/security/JwtService.java` |
| 5. After a registration, send an email to the admin | `AuthService.register` publishes `UserRegisteredEvent`; `RegistrationMailListener` sends a branded welcome to the user and a separate notification to `ADMIN_EMAIL` **asynchronously after commit**. SMTP failure does not roll back registration. Enabled admin-created accounts also receive a welcome. Client contacts, accepted bids, outbid notices and auction results use the same ATELIER HTML/plain-text identity; see [EMAIL.md](EMAIL.md). | `BE/auth/AuthService.java`, `BE/auth/RegistrationMailListener.java`, `BE/mail/`, `BE/config/AsyncConfig.java`; tests `AuthIT`, `GalleryMailIT` |
| 6. Test login and registration | `POST /api/auth/register` and `/login` covered by integration tests and the Postman collection | `backend/src/test/java/com/sip/psm/auth/AuthIT.java` |
| 7. Test Client and Projet resources under security | Authorization matrix tested for anonymous, BIDDER, COLLABORATEUR and ADMIN | `backend/src/test/java/com/sip/psm/security/SecurityMatrixIT.java`, `CatalogFlowIT.java` |

## 4. Part 2 — Angular

| CDC item | ATELIER implementation | Where in code |
|---|---|---|
| 8. Components and navigation menu for Clients, Projets, Users, following the Argon mockup | Studio sidebar: **Artists** (caption "Clients"), **Exhibitions** (caption "Projets"), Artworks, Auctions, Users, Roles | `FE/features/studio/studio-layout.ts`, `FE/features/studio/studio.routes.ts`, pages in `FE/features/studio/{artists,exhibitions,users,roles}/` |
| Mockup: [Argon Dashboard Angular](https://www.creative-tim.com/product/argon-dashboard-angular) | The studio is **inspired by Argon**: gradient header with KPI cards and weekly trends, Chart.js line and bar charts, ranking tables with progress bars, a profile page and a footer. It is re-implemented from scratch with Tailwind CSS 4 and spartan/ui in the ATELIER palette (midnight, cobalt, sunflower, ivory); no template code is copied | `FE/features/studio/overview/` (page, metrics), `FE/features/studio/shared/chart-canvas.ts`, `FE/features/studio/profile/`, `FE/styles.css` (tokens) |
| 9. Guards | `authGuard` (signed-in only), `roleGuard(...roles)` (role-restricted routes, redirects to `/forbidden`), `guestGuard` (keeps signed-in users off login/register) | `FE/core/auth/guards.ts`, applied in `FE/app.routes.ts` and `FE/features/studio/studio.routes.ts` |
| 9. Interceptor | `authInterceptor` adds `Authorization: Bearer <jwt>` to `/api/` calls and ends the session on a 401 | `FE/core/auth/auth.interceptor.ts`, registered in `FE/app.config.ts` |
| 10. The application takes roles into account | `AuthStore` exposes `isAdmin()`, `isStaff()`, `hasRole()` as signals; the studio hides actions and menu entries accordingly; the backend enforces the same rules | `FE/core/auth/auth.store.ts`, `FE/features/studio/**/*.html` |
| Registration and login screens | Standalone pages with form validation and server-side error mapping | `FE/features/auth/` |

## 5. Part 3 — Deployment

| CDC item | ATELIER implementation | Where in code |
|---|---|---|
| 11. Build `psm.jar` containing the Angular distribution in `static/` | The `Dockerfile` builds Angular in a Node stage, copies `dist/atelier/browser/` to `src/main/resources/static/` and runs `./mvnw package`; the jar is named `psm.jar`. Maven alone can also do it: `cd backend && ./mvnw -Pwith-frontend -DskipTests package` (opt-in `with-frontend` profile: Node install, `npm ci`, `npm run build`, copy of `dist/atelier/browser/` into `static/` inside the jar). `SpaWebConfig` forwards client-side routes to `index.html` | `Dockerfile`, `backend/pom.xml` (final name), `BE/web/SpaWebConfig.java` |
| 12. Deploy to the VPS | **PENDING live deployment verification.** Production stack (app + MySQL), Nginx HTTPS/WebSocket configuration and a deployment script with smoke checks are prepared. A local production-image test does not establish deployment to a VPS | `deployment/compose.prod.yaml`, `deployment/nginx/atelier.conf`, `deployment/deploy.sh`, [DEPLOYMENT.md](DEPLOYMENT.md), [CDC_AUDIT.md](CDC_AUDIT.md) |
| Identical versions for the team | Development stack in Docker (MySQL 8.4.13, Mailpit, JDK 17, Node 22.23.2) and `.nvmrc` | `compose.yaml`, `.nvmrc`, `.env.example` |

## 6. Vocabulary map

| CDC term | ATELIER term | UI label |
|---|---|---|
| PSM, Projects Manager | The Studio (SmartSoft back-office of ATELIER); artifact `psm.jar` | Studio |
| Client | Artist | Artists (caption "Clients") |
| Projet | Exhibition | Exhibitions (caption "Projets") |
| libellé (project) | `title` | Title |
| durée | `durationDays` | Duration (days) |
| idClient | `artistId` | Artist |
| nom, prénom (user) | `lastName`, `firstName` | Last name, First name |
| tel | `phone` | Phone |
| adresse | `address` | Address |
| Admin | `ADMIN` | Admin |
| Collaborateur | `COLLABORATEUR` | Collaborator |

## 7. Extensions beyond the specification

| Extension | Description | Where |
|---|---|---|
| Artworks | Catalogue of works linked to an artist and optionally an exhibition; statuses `DRAFT`, `PUBLISHED`, `ARCHIVED`; only published works are public; unique slugs | `BE/artwork/` |
| Live auctions | Auctions with starting price, minimum increment, start and end; statuses `SCHEDULED`, `OPEN`, `CLOSED`, `CANCELLED` | `BE/auction/` |
| Real-time bidding | STOMP over WebSocket at `/ws`, topics `/topic/auctions` and `/topic/auctions/{id}`, broadcast only after the transaction commits | `BE/config/WebSocketConfig.java`, `BE/auction/AuctionBroadcaster.java`, `FE/core/realtime/auction-socket.service.ts` |
| Safe concurrent bids | Pessimistic row lock on the auction, domain validation, unique `(auction_id, amount)` constraint, soft close | `BE/auction/BidService.java`, `BE/auction/Auction.java` |
| Lifecycle scheduler | Opens and closes auctions on time, records the winner | `BE/auction/AuctionLifecycleScheduler.java` |
| `BIDDER` role and public registration | Collectors register themselves; staff accounts are created by an admin | `BE/auth/`, `BE/user/` |
| Collector area | Own bids with leading flag, won works, profile and password change | `BE/account/`, `FE/features/account/` |
| Riffle-style homepage | Scroll-driven GSAP sequence with Flip transitions and a reduced-motion fallback | `FE/features/home/`, `FE/shared/animations/` |
| Studio dashboard data | Aggregated KPIs, weekly trends, daily activity, rankings | `BE/studio/`, `FE/features/studio/overview/` |
| Flyway migrations | Versioned schema, Hibernate runs in `validate` mode | `backend/src/main/resources/db/migration/` |
| ProblemDetail errors | RFC 9457 responses with stable `code` values and field errors | `BE/common/ApiExceptionHandler.java` |
| Demo data | Public-domain gallery loaded with `DEMO_DATA=true` | `BE/demo/`, `backend/src/main/resources/demo/` |
| Testcontainers tests | Integration tests against real MySQL 8.4, including a concurrency test | `backend/src/test/` |
| Continuous integration | Backend, frontend and image build on every push and pull request | `.github/workflows/ci.yml` |
| Vitest unit tests | Guards, interceptor, store, helpers, riffle formations | `FE/**/*.spec.ts` |

## 8. Argon Dashboard template

The studio follows the structure of Argon Dashboard Angular by Creative Tim (MIT licence, https://www.creative-tim.com/product/argon-dashboard-angular). Its source targets Angular 14, Bootstrap 4.6, ng-bootstrap 12 and Chart.js 2.9; the project runs Angular 22, Tailwind CSS 4 and Chart.js 4, so the components were rebuilt rather than copied (ng-bootstrap 12 does not compile on Angular 22, and Bootstrap's global classes would clash with the public site).

| Argon page | ATELIER studio equivalent |
|---|---|
| Sidebar, navbar with user menu, footer | Collapsible sidebar, top bar with search and user menu, footer |
| Dashboard (gradient header, 4 stat cards, dark line chart, bar chart, two tables) | Overview (gradient header, 4 KPI cards with weekly trends, daily bid volume chart, auctions-by-status doughnut, recent bids, top artists, ending soon, quick actions) |
| Tables | CRUD tables for Artists (Clients), Exhibitions (Projets), Artworks, Auctions, Users and Roles with the relevant list controls |
| User profile | My profile (edit details, change password) |
| Login / Register | Sign in / Register (registration emails the admin) |
| Icons, Maps | Not used (template showcase pages) |
