# ATELIER

**SmartSoft Solutions · ATELIER** — an immersive digital art gallery with live auctions.

ATELIER is a SmartSoft Solutions product. SmartSoft Solutions builds and operates the platform: a public gallery where visitors browse artworks in a cinematic scroll experience, and collectors bid in real time in live auction rooms. Behind it sits the **Studio**, SmartSoft's back-office tool to manage the gallery's clients (**Artists**) and projects (**Exhibitions**), as well as artworks, auctions and users.

The project also fulfils a course specification (cahier des charges) that asks for a "PSM" application with `User`, `Role`, `Client` and `Projet`. Every requirement is kept, with a documented equivalent, in [docs/CDC_EQUIVALENCE.md](docs/CDC_EQUIVALENCE.md).

## Features

**Public gallery**
- Riffle-style homepage: a scroll-driven sequence (pile, ring, corridor, featured painting) built with GSAP ScrollTrigger, with a calm fallback for reduced motion.
- Searchable gallery of published artworks, artist profiles and exhibitions.
- Artwork-to-detail transition animated with GSAP Flip.

**Live auctions**
- Auction rooms with countdown, bid history (bidder names masked) and quick-bid buttons.
- Real-time updates over STOMP/WebSocket: price, leader and status change instantly for everyone.
- Bids placed under a pessimistic row lock; a soft close extends an auction when a bid lands near the end. Bidder confirmations and outbid notices follow committed bids.
- A scheduler opens and closes auctions on time and records the winner; settlement sends the winner and administrator branded result emails.

**Accounts**
- Public registration creates a collector (`BIDDER`) account, sends a branded welcome email and notifies the administrator (async, after commit). Admin-created enabled user accounts also receive a welcome email and administrator notification.
- Stateless JWT authentication, "My collection" page with bids and won works, profile and password change.

**Studio (back-office)**
- Argon-inspired dashboard: gradient header with KPI cards and weekly trends, Chart.js line and bar charts, ranking tables with progress bars.
- Artists (Clients), Exhibitions (Projets), Artworks, Auctions, Users, Roles, profile page.
- Editable role catalogue with full admin CRUD, permission profiles and dynamic assignment by role ID.
- Role-based access: `ADMIN` has full CRUD; `COLLABORATEUR` can view and create catalogue items only.

**Engineering**
- Flyway migrations, ProblemDetail errors with stable codes, Testcontainers integration tests, GitHub Actions CI, Docker for development and production, VPS deployment scripts, Postman collection.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.5.16 (Web, Data JPA, Security, Validation, WebSocket, Mail, Actuator), JJWT 0.12.6, Flyway, Lombok |
| Database | MySQL 8.4 |
| Frontend | Angular 22 (standalone, zoneless, signals), TypeScript 6, Tailwind CSS 4, spartan/ui (brain 1.9), RxJS 7.8 |
| Motion and charts | GSAP 3 (ScrollTrigger, Flip), Chart.js 4.5.1 |
| Realtime | STOMP over WebSocket (`@stomp/stompjs` 7.5) |
| Tests | JUnit 5, Spring Test, Testcontainers (MySQL), Vitest 5 + jsdom |
| Tooling | Maven Wrapper, npm 10, Node 22.23.2 (`.nvmrc`), Docker, GitHub Actions, Mailpit, Nginx + certbot |

## Quick start (Docker)

Prerequisites: Docker with the Compose plugin.

```bash
cp .env.example .env
docker compose up
```

The first start downloads dependencies and may take a few minutes.

| Service | URL |
|---|---|
| Application (Angular dev server, proxies `/api` and `/ws`) | http://localhost:4200 |
| REST API | http://localhost:8080 |
| Mailpit (catches outgoing emails) | http://localhost:8025 |
| MySQL | localhost:3306 |

The development stack starts with `DEMO_DATA=true`, which loads a demonstration gallery (public-domain works from The Met Open Access) with auctions in every state.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Administrator (bootstrap account from `.env.example`) | `admin@atelier.local` | `Admin123!` |
| Collaborateur | `curator@atelier.demo` | `Atelier2026!` |
| Bidder | `collector@atelier.demo` | `Atelier2026!` |
| Bidder | `patron@atelier.demo` | `Atelier2026!` |

The demo accounts exist only when `DEMO_DATA=true`. Change every credential before exposing an instance.

Local `.env` configures development Compose. Production uses a separate private `deployment/.env.prod`; neither file nor the MySQL data volume travels through Git. See [email configuration](docs/EMAIL.md) and [migration to another machine or VPS](docs/DEPLOYMENT.md#moving-to-another-machine-or-vps).

## Production build

```bash
docker build -t atelier .
```

The multi-stage `Dockerfile` builds the Angular app, copies it into the Spring Boot resources (`static/`) and produces a single executable `psm.jar` that serves the API, the WebSocket endpoint and the single-page app. For a VPS deployment with Nginx and HTTPS, or to run `psm.jar` directly, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

The [18 November CDC audit](docs/CDC_AUDIT.md) distinguishes verified behavior from adaptations and remaining work. The required database cardinalities are implemented and tested. **Live VPS deployment (CDC step 12) remains pending**; the deployment kit and the locally tested production image are available.

The guide, report, database reference and slides follow the BigDataZaaa document structure with ATELIER's midnight, cobalt, sunflower and ivory colors.

| Document | Content |
|---|---|
| [docs/guide.pdf](docs/guide.pdf) | Illustrated guide explaining the tools, startup and every role |
| [docs/report.pdf](docs/report.pdf) | Project report, implementation and verification results |
| [docs/database.pdf](docs/database.pdf) | Complete 72-column database reference, keys, indexes, constraints and cardinalities |
| [docs/slides.pdf](docs/slides.pdf) / [editable PowerPoint](docs/slides.pptx) | 18-slide presentation with source notes and an editable core database diagram |
| [docs/CDC_AUDIT.md](docs/CDC_AUDIT.md) | Evidence and status for every requirement, including pending VPS deployment |
| [docs/DATABASE.md](docs/DATABASE.md) | Searchable database dictionary and relationship explanations |
| [docs/diagrams/database.svg](docs/diagrams/database.svg) | Full database relationship graph |
| [docs/evidence/verification.json](docs/evidence/verification.json) | Dated test counts and environment |
| [docs/DOCUMENTATION_BUILD.md](docs/DOCUMENTATION_BUILD.md) | Rebuilding the PDFs, captures and presentation |
| [docs/CDC_EQUIVALENCE.md](docs/CDC_EQUIVALENCE.md) | Course specification mapped to ATELIER, requirement by requirement, plus extensions |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Walkthroughs for visitors, bidders, collaborateurs and administrators |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Diagrams, packages, domain model, security, bid flow, frontend structure |
| [docs/API.md](docs/API.md) | Every REST endpoint, WebSocket topics, error format |
| [docs/EMAIL.md](docs/EMAIL.md) | Welcome and auction emails, Mailpit and real SMTP configuration |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | VPS deployment, HTTPS, backups, running `psm.jar` directly |
| [docs/TEST_PLAN.md](docs/TEST_PLAN.md) | Automated tests, Postman/Newman, CI, manual checklists |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local setup, conventions, adding a feature, git workflow |
| [postman/ATELIER.postman_collection.json](postman/ATELIER.postman_collection.json) | Postman collection for the REST API |

## Project structure

```
.
├── backend/                      Spring Boot 3.5 application (artifact psm.jar)
│   ├── src/main/java/com/sip/psm/
│   │   ├── auth/ user/ account/  Registration, login, users, roles, profile
│   │   ├── artist/ exhibition/   Clients and Projets of the specification
│   │   ├── artwork/ auction/     Catalogue, auctions, bids, scheduler, broadcaster
│   │   ├── studio/               Dashboard aggregates
│   │   ├── security/ config/     JWT, STOMP auth, security matrix, properties
│   │   └── common/ demo/ web/    Errors, paging, demo data, SPA fallback
│   ├── src/main/resources/db/migration/   Flyway migrations (V1, V2, V3)
│   └── src/test/                 Unit and integration tests
├── frontend/                     Angular 22 application
│   └── src/app/{core,shared,features}
├── deployment/                   compose.prod.yaml, nginx/atelier.conf, deploy.sh, .env.prod.example
├── postman/                      API collection
├── docs/                         Documentation
├── .github/workflows/ci.yml      Continuous integration
├── compose.yaml                  Development stack
├── Dockerfile                    Production image (psm.jar with Angular in static/)
└── .env.example                  Development environment variables
```

## Deployable JAR

After successful GitHub Actions tests and image build, the `atelier-psm-jar` workflow artifact contains `psm.jar` (with Angular included) and its SHA-256 checksum. Private configuration and database data are transferred separately as described in [Deployment](docs/DEPLOYMENT.md).

## Team

**Aymen Jedidi and Aziza Bellanes — SmartSoft Solutions**
