# Development guide

How to run, extend and contribute to ATELIER (SmartSoft Solutions).

## 1. Setup with Docker (recommended)

Every teammate gets identical tool versions: MySQL 8.4.13, Mailpit, JDK 17 and Node 22.23.2.

```bash
cp .env.example .env
docker compose up                  # db + mailpit + backend (spring-boot:run) + frontend (ng serve)
docker compose up db mailpit       # only the infrastructure; run the apps from your IDE
docker compose down -v             # stop and delete the database volume
```

| Service | URL |
|---|---|
| Frontend (`ng serve`, proxies `/api` and `/ws` through `frontend/proxy.docker.json`) | http://localhost:4200 |
| Backend | http://localhost:8080 |
| Mailpit UI / SMTP | http://localhost:8025 / localhost:1025 |
| MySQL | localhost:3306 (`atelier` / `atelier_dev_password`) |

The backend container sets `DEMO_DATA=true` and creates the bootstrap admin from `.env` (`admin@atelier.local` / `Admin123!`). Source directories are mounted, so code changes reload (Spring DevTools, Angular dev server).

## 2. Setup without Docker

Prerequisites: **Java 17**, **Node 22.23.2** (see `.nvmrc`; `nvm use`), **MySQL 8** and, for emails, an SMTP catcher such as Mailpit on port 1025.

```bash
# Database
mysql -uroot -p -e "CREATE DATABASE atelier CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
                    CREATE USER 'atelier'@'%' IDENTIFIED BY 'atelier_dev_password';
                    GRANT ALL ON atelier.* TO 'atelier'@'%';"

# Backend (port 8080). Defaults match application.yml; JWT_SECRET is required.
cd backend
export JWT_SECRET=dev-only-secret-change-me-in-production-0123456789
export BOOTSTRAP_ADMIN_EMAIL=admin@atelier.local BOOTSTRAP_ADMIN_PASSWORD='Admin123!'
export DEMO_DATA=true
./mvnw spring-boot:run

# Frontend (port 4200, proxies /api and /ws to localhost:8080 via proxy.conf.json)
cd frontend
npm ci
npm start
```

Flyway creates the schema on first start. All settings and their defaults are in `backend/src/main/resources/application.yml`; typed access is through `config/AtelierProperties`.

Handy commands:

| Task | Command |
|---|---|
| Backend tests | `cd backend && ./mvnw verify` (Docker needed for Testcontainers) |
| Frontend tests | `cd frontend && npm test` |
| Frontend production build | `cd frontend && npm run build` (output `dist/atelier/browser`) |
| Format check | `cd frontend && npm run format:check` |
| Production image | `docker build -t atelier .` |

## 3. Conventions

### Backend
- **Package by feature** under `com.sip.psm`: each feature holds its entity, repository, service, controller(s) and DTOs. Cross-cutting code lives in `common`, `config` and `security`.
- **DTO records**: requests and responses are Java records (nested in a `*Dtos` class), with Bean Validation on requests. Entities are never exposed. Public and studio projections are separate records so that private fields (email, phone, budget) cannot leak.
- **Constructor injection** only; no field `@Autowired`. Lombok is limited to `@Getter`/`@Setter` on entities.
- **Errors**: throw `NotFoundException` or `BusinessRuleException(code, message)` from services; `ApiExceptionHandler` turns them into RFC 9457 `ProblemDetail` with a stable `code`. Add every new code to [API.md](API.md#error-format).
- **Money** is `BigDecimal` (`DECIMAL(14,2)`), never `double`.
- **Time** comes from the injected `Clock` (`TimeConfig`), never `Instant.now()`, so tests can control it; timestamps are UTC.
- **Security**: authorization lives in `SecurityConfig`; update the matrix, `SecurityMatrixIT` and the docs together.
- **Transactions** in services; keep `open-in-view` off. Use optimistic `@Version` for editable records and pessimistic locks only where contention matters (bids).
- **Flyway**: schema changes are new files `V<n>__description.sql`. **A migration is never edited after it has been merged**; fix forward with a new version. Hibernate only validates the schema.
- **Tests**: domain logic gets plain unit tests; HTTP behaviour gets `*IT` tests using `TestFixtures`.

### Frontend
- **Standalone components** only, lazy loaded per route; **zoneless** change detection and **`ChangeDetectionStrategy.OnPush`** everywhere.
- **Signals** for state (`signal`, `computed`, `input()`, `resource`); `inject()` instead of constructor parameters; the new control flow (`@if`, `@for`).
- **Layers**: `core/` (API services, auth, models, realtime, utils; no UI), `shared/` (reusable UI, layouts, animations), `features/` (screens). Code needed by several features goes to `shared/` or `core/`.
- **HTTP**: components call the typed services `gallery.api.ts` and `studio.api.ts`; the `authInterceptor` handles tokens. Error messages come from `core/api/problem.ts`.
- **Styling**: Tailwind CSS 4 utility classes and the design tokens declared in `src/styles.css` (`midnight`, `cobalt`, `sunflower`, `ivory`, `canvas`, `cypress`, `terracotta`, `ink`). Do not hard-code hex colours in components. UI primitives are spartan/ui "hlm" components in `shared/ui`.
- **Motion**: import GSAP only from `shared/animations/motion.ts` and honour `prefersReducedMotion()`.
- **Accessibility**: labelled controls, visible focus, `aria-live` for live prices, no information by colour alone.

### Formatting
- Frontend: Prettier (`printWidth` 100, single quotes, Angular HTML parser) and `.editorconfig` (2 spaces, final newline). Run `npm run format` before committing; CI-friendly check: `npm run format:check`.
- Backend: 4-space indentation, one top-level type per file, no wildcard imports, lines under about 120 characters, Javadoc on non-obvious classes and rules.
- Everything in the repository (code, comments, commit messages, documentation) is written in English.

## 4. Adding a feature end to end

Example: a new `Collection` entity managed in the Studio and shown publicly.

1. **Migration**: add `backend/src/main/resources/db/migration/V3__collections.sql` (table, keys, indexes). Never touch V1 or V2.
2. **Backend feature package** `com/sip/psm/collection/`:
   - `Collection` entity extending `AuditedEntity` (add `@Version`), `CollectionRepository`;
   - `CollectionDtos` with `CollectionRequest`, `CollectionResponse` (studio) and `CollectionSummary` (public);
   - `CollectionService` (transactions, validation of business rules via `BusinessRuleException`);
   - `CollectionController` (`/api/collections`, public GET) and `StudioCollectionController` (`/api/studio/collections`).
3. **Security**: the existing rules already cover `/api/studio/**` (read and create for staff, update and delete for admin) and public `GET`s only for the listed prefixes. Add a matcher in `SecurityConfig` if you introduce a new public prefix, and extend `SecurityMatrixIT`.
4. **Backend tests**: unit tests for domain rules, an `*IT` flow test (use `TestFixtures`), and error-code assertions.
5. **Frontend models and API**: add types to `core/models/api.models.ts` and methods to `core/api/gallery.api.ts` and `core/api/studio.api.ts`.
6. **Frontend screens**: a lazy page under `features/collections/` and a route in `app.routes.ts`; a Studio page under `features/studio/collections/` using the shared CRUD helpers (`crud-page`, `crud-table`, `form-sheet`), a route in `studio.routes.ts` (add `roleGuard('ADMIN')` if admin-only) and a sidebar entry in `studio-layout.ts`. Hide edit and delete actions behind `auth.isAdmin()`.
7. **Frontend tests**: Vitest specs for any pure logic (formatters, mappers).
8. **Docs and Postman**: update [API.md](API.md), [CDC_EQUIVALENCE.md](CDC_EQUIVALENCE.md) if it affects the specification mapping, the manual checklist in [TEST_PLAN.md](TEST_PLAN.md), and add requests to `postman/ATELIER.postman_collection.json`.
9. Run `./mvnw verify`, `npm test`, `npm run build` and `npm run format:check`, then open a pull request.

## 5. Git workflow

- `main` is always releasable and protected: **no direct pushes**.
- Create a **feature branch** from `main` using a short prefix: `feature/auction-soft-close`, `fix/stale-update-message`, `docs/deployment-guide`, `chore/bump-spring-boot`.
- Commit small, focused changes with imperative messages that say what and why ("Reject bids from the current leader"). Keep build output and secrets (`dist`, `target`, `node_modules`, `.env`, `deployment/.env.prod`) out of commits; they are git-ignored.
- Open a **pull request into `main`**. Describe the change, how it was tested and any migration. Update the relevant documentation in the same pull request.
- **CI must pass** (backend `verify`, frontend tests and build, production image build) before merging; resolve review comments, then merge and delete the branch.
- Rebase or merge `main` into your branch if it moved; resolve conflicts locally. Never rewrite history of `main`.
- Releases: bump `ATELIER_VERSION` in `deployment/.env.prod` and the versions in `backend/pom.xml` and `frontend/package.json`, tag the commit and deploy with `deployment/deploy.sh` (see [DEPLOYMENT.md](DEPLOYMENT.md)).
