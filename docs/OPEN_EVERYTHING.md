# Open everything: a guide for a first-time reader

This guide shows how to start ATELIER on your own computer and look at every part of it: the website, the Studio (back office), the database, the emails, the API, the code, the documents and the live deployment. You do not need to know the project. Follow the steps in order.

Every command below was checked against the files of this repository (`compose.yaml`, `.env.example`, `backend/src/main/resources/application.yml`, `backend/pom.xml`, `frontend/package.json`, `postman/`, `docs/`). The database queries were run against a real development database.

## What runs where

When you finish section 3, this is what is on your computer.

| Part | Container name | Port | URL or address | Login |
|---|---|---|---|---|
| Public site and Studio (Angular dev server) | `atelier-frontend-1` | 4200 | http://localhost:4200 | see the accounts table in section 4 |
| REST API and WebSocket (Spring Boot) | `atelier-backend-1` | 8080 | http://localhost:8080 | JWT token from `POST /api/auth/login` |
| Database (MySQL 8.4.13) | `atelier-db-1` | 3306 | `localhost:3306`, database `atelier` | user `atelier`, password `atelier_dev_password` |
| Email catcher (Mailpit) | `atelier-mailpit-1` | 8025 (web), 1025 (SMTP) | http://localhost:8025 | none |

Notes:

- Docker names containers after the Compose project, which is `atelier` (`name: atelier` in `compose.yaml`). The exact names can differ slightly on your machine; `docker compose ps` shows them.
- The project has no Swagger or OpenAPI page (the springdoc library is not in `backend/pom.xml`). The API is documented in `docs/API.md` and in the Postman collection (section 7).

---

## 1. What you need to install

| Tool | Needed for | Required? | Download |
|---|---|---|---|
| Git | Download the code | Yes | https://git-scm.com/downloads |
| Docker Desktop (Windows, macOS) or Docker Engine with the Compose plugin (Linux) | Run the whole project with one command | Yes | https://docs.docker.com/get-started/get-docker/ |
| A MySQL viewer: DBeaver Community or MySQL Workbench | Look inside the database with a window instead of a terminal | Recommended | https://dbeaver.io/download/ or https://dev.mysql.com/downloads/workbench/ |
| Postman | Send API requests and run the test collection | Recommended | https://www.postman.com/downloads/ |
| Java 17 (JDK) | Only to run the backend or the tests outside Docker | Optional | https://adoptium.net/temurin/releases/?version=17 |
| Node 22.23.2 | Only to run the frontend, Newman or the PDF build outside Docker | Optional | https://nodejs.org/en/download (the exact version is in `.nvmrc`; with nvm run `nvm use`) |
| An IDE: IntelliJ IDEA or VS Code | Read and edit the code | Optional | https://www.jetbrains.com/idea/download/ or https://code.visualstudio.com/ |

Check that Docker works before going on:

```bash
docker --version
docker compose version
```

Windows users: the Maven wrapper has a `mvnw.cmd` file, so use `mvnw.cmd` where this guide writes `./mvnw`. The shell commands (`cp`, `export`) are written for Linux, macOS, WSL or Git Bash; in PowerShell use `Copy-Item` and `$env:NAME = "value"`.

---

## 2. Get the code and create the `.env` file

```bash
git clone https://github.com/aziza-bellanes/angluar-springboot-project.git
cd angluar-springboot-project
cp .env.example .env
```

The `.env` file is read by Docker Compose. It is ignored by Git, so your copy stays on your computer. The values in `.env.example` are made for local development only and contain no real secret. You can keep them as they are.

| Variable | Meaning | Default in `.env.example` |
|---|---|---|
| `MYSQL_DATABASE` | Name of the database created at first start | `atelier` |
| `MYSQL_USER`, `MYSQL_PASSWORD` | Database account used by the backend and by you | `atelier`, `atelier_dev_password` |
| `MYSQL_ROOT_PASSWORD` | Password of the MySQL `root` account | `atelier_root_dev` |
| `JWT_SECRET` | Key used to sign login tokens. The backend refuses to start without one | a development text, never reuse it in production |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | The first administrator, created at startup if this email does not exist yet | `admin@atelier.local`, `Admin123!` |
| `ADMIN_EMAIL` | Address that receives the "new registration" and "auction result" emails | `admin@atelier.local` |
| `PUBLIC_URL` | Address used inside email links | `http://localhost:4200` |
| `CORS_ORIGINS` | Browser address allowed to call the API | `http://localhost:4200` |
| `MAIL_FROM` | Sender address of emails | `noreply@atelier.local` |
| `SMTP_HOST`, `SMTP_PORT` | Where the backend sends emails (Mailpit inside Docker) | `mailpit`, `1025` |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_AUTH`, `SMTP_TLS` | Only for a real email provider | empty, empty, `false`, `false` |

`DEMO_DATA` is not in `.env`: `compose.yaml` sets it to `true` for you. It loads a demonstration gallery (30 artworks, artists, exhibitions, auctions in every state) and three demo accounts.

---

## 3. Start everything with one command

From the repository root:

```bash
docker compose up
```

Leave this terminal open: it shows the logs of all containers. To start in the background instead, use `docker compose up -d`.

| Container | What it does |
|---|---|
| `db` | MySQL 8.4.13. Stores everything in the Docker volume `mysql_data`. The other containers wait until its health check passes |
| `mailpit` | Catches every email the application sends, so nothing leaves your computer |
| `backend` | Java 17 image that runs `./mvnw spring-boot:run` on the `backend/` folder. It creates the tables with Flyway, loads the demo data and serves the API on 8080. Changes in `backend/` reload automatically |
| `frontend` | Node 22.23.2 image that runs `npm ci` and then `ng serve` on 4200. It forwards `/api` and `/ws` to the backend through `frontend/proxy.docker.json`. Changes in `frontend/` reload automatically |

How long does it take? The first start downloads the images, the Maven libraries and the npm packages, so allow several minutes (the README says "a few minutes"). Later starts are much faster because the libraries are kept in the volumes `maven_cache` and `frontend_node_modules`.

It is ready when:

```bash
curl http://localhost:8080/actuator/health
```

answers `{"status":"UP", ...}`, and http://localhost:4200 shows the site.

Useful commands (always from the repository root):

| Goal | Command |
|---|---|
| See which containers run | `docker compose ps` |
| Follow all logs | `docker compose logs -f` |
| Follow one container | `docker compose logs -f backend` |
| Stop and keep your data | `docker compose down` |
| Stop and **delete the database** | `docker compose down -v` |
| Start only the database and Mailpit (to run the apps from an IDE) | `docker compose up db mailpit` |

`down` removes the containers but keeps the volumes, so the database content is still there at the next `up`. `down -v` also deletes the three volumes: `mysql_data` (the whole database: accounts, bids, artworks), `maven_cache` and `frontend_node_modules` (downloaded libraries, which will be downloaded again). After `down -v`, the next start recreates a fresh database and reloads the demo data.

---

## 4. Open the application

| What | URL |
|---|---|
| Public site | http://localhost:4200 |
| Login page | http://localhost:4200/login |
| Studio (back office, staff only) | http://localhost:4200/studio |
| API (direct) | http://localhost:8080 |

### Accounts

| Role | Email | Password | Where it comes from |
|---|---|---|---|
| Administrator (ADMIN) | `admin@atelier.local` | `Admin123!` | `BOOTSTRAP_ADMIN_*` in `.env` / `compose.yaml` |
| Collaborateur (COLLABORATEUR) | `curator@atelier.demo` | `Atelier2026!` | demo data |
| Bidder (BIDDER) | `collector@atelier.demo` | `Atelier2026!` | demo data |
| Bidder (BIDDER) | `patron@atelier.demo` | `Atelier2026!` | demo data |

The demo accounts exist only because `DEMO_DATA=true`. Public registration (http://localhost:4200/register) creates a new BIDDER account.

### What to try with each role

| Role | What to try |
|---|---|
| Visitor (no login) | Browse the home page scroll animation, `/artworks`, `/artists`, `/exhibitions`, `/auctions`. Open an auction room: you see the price and history, but the bid panel asks you to sign in |
| BIDDER | Log in as `collector@atelier.demo`, open an open auction, place a bid (the confirmation dialog asks you to confirm). Open a second browser window as `patron@atelier.demo` and outbid the first one: the price changes live in both windows. Open `/account` to see your bids and won works. Staff accounts cannot bid |
| COLLABORATEUR | Log in as `curator@atelier.demo`. You land in the Studio. You can view and create artists, exhibitions and artworks, but you cannot edit or delete them, and you cannot create users |
| ADMIN | Log in as `admin@atelier.local`. Full Studio: dashboard charts, artists, exhibitions, artworks, auctions (create, edit, cancel), users (create, disable) and the role catalogue |

More walkthroughs are in `docs/USER_GUIDE.md`.

---

## 5. Open the database

Connection values for every tool below:

| Field | Value |
|---|---|
| Host | `localhost` |
| Port | `3306` |
| Database | `atelier` |
| User | `atelier` |
| Password | `atelier_dev_password` (or your `MYSQL_PASSWORD`) |

The stack must be running (section 3). Only `db` is needed.

### 5a. From the terminal

```bash
docker compose exec db mysql -uatelier -patelier_dev_password atelier
```

You get a `mysql>` prompt. Type queries ending with `;`. Type `exit` to leave. For a single query without the prompt:

```bash
docker compose exec db mysql -uatelier -patelier_dev_password atelier -e "SHOW TABLES"
```

(MySQL prints a warning about using a password on the command line. It is harmless here.)

### 5b. DBeaver, step by step

1. Install and open DBeaver Community.
2. Click **Database** then **New Database Connection** (or the plug icon with a plus).
3. Choose **MySQL** and click **Next**.
4. On the **Main** tab fill: Server Host `localhost`, Port `3306`, Database `atelier`, Username `atelier`, Password `atelier_dev_password`.
5. Click **Test Connection**. If DBeaver offers to download the MySQL driver, accept.
6. If you get the error `Public Key Retrieval is not allowed`, open the **Driver properties** tab, find `allowPublicKeyRetrieval` and set it to `true`. If you get an SSL error, set `useSSL` to `false`.
7. Click **Finish**. Expand the connection, then `atelier`, then **Tables**. Double-click a table, then use the **Data** tab to see rows.
8. To run queries: select the connection and press `Ctrl+]` (new SQL script), paste a query, and press `Ctrl+Enter`.

### 5c. MySQL Workbench

1. Open MySQL Workbench. Next to **MySQL Connections** click the **+** button.
2. Connection Name: `ATELIER`. Hostname `127.0.0.1`, Port `3306`, Username `atelier`.
3. Click **Store in Vault...** (or **Store in Keychain**) and enter `atelier_dev_password`. Click **Test Connection**, then **OK**.
4. Double-click the new connection. In the left panel, **SCHEMAS**, double-click `atelier`. Right-click a table and choose **Select Rows - Limit 1000**.
5. For queries, open a SQL tab, paste the query and click the lightning icon.

### Queries to explore

All queries below were run read-only on the development database and work. They only read data.

**List the tables.** You should see 9: `artists`, `artworks`, `auctions`, `bids`, `exhibitions`, `flyway_schema_history`, `roles`, `user_roles`, `users`.

```sql
SHOW TABLES;
```

**See the columns of a table** (replace `bids` by another table name).

```sql
SHOW COLUMNS FROM bids;
```

**The 13 foreign keys with their delete rule.** `CASCADE` means the child rows are deleted with the parent, `SET NULL` means the link is cleared, `NO ACTION` means the parent cannot be deleted while children exist.

```sql
SELECT kcu.TABLE_NAME, kcu.COLUMN_NAME,
       kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME, rc.DELETE_RULE
FROM information_schema.KEY_COLUMN_USAGE kcu
JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
  ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
 AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
WHERE kcu.TABLE_SCHEMA = 'atelier'
  AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY kcu.TABLE_NAME, kcu.COLUMN_NAME;
```

**Users with their roles** (many-to-many through `user_roles`). Passwords are stored as BCrypt hashes, never in clear text.

```sql
SELECT u.id, u.email, u.enabled,
       GROUP_CONCAT(r.libelle ORDER BY r.libelle) AS roles
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r ON r.id = ur.role_id
GROUP BY u.id, u.email, u.enabled
ORDER BY u.id;
```

**The role catalogue.**

```sql
SELECT id, libelle, profile, system_key FROM roles;
```

**Artists with their number of exhibitions** (one artist, many exhibitions).

```sql
SELECT a.id, a.name, COUNT(e.id) AS exhibitions
FROM artists a
LEFT JOIN exhibitions e ON e.artist_id = a.id
GROUP BY a.id, a.name
ORDER BY exhibitions DESC, a.name;
```

**Auctions by status.** The statuses are `SCHEDULED`, `OPEN`, `CLOSED` and `CANCELLED`.

```sql
SELECT status, COUNT(*) AS auctions FROM auctions GROUP BY status;
```

**Open auctions with their current price.**

```sql
SELECT au.id, aw.title, au.status, au.starting_price,
       au.current_price, au.bid_count, au.ends_at
FROM auctions au
JOIN artworks aw ON aw.id = au.artwork_id
WHERE au.status = 'OPEN'
ORDER BY au.ends_at;
```

If this returns no row, the demo auctions have ended; create one in the Studio (Auctions) or reset with `docker compose down -v`.

**The 10 last bids** (run it, place a bid on the site, run it again).

```sql
SELECT b.id, b.auction_id, u.email, b.amount, b.created_at
FROM bids b
JOIN users u ON u.id = b.bidder_id
ORDER BY b.created_at DESC
LIMIT 10;
```

**Which migrations created the schema** (Flyway keeps its own history table; versions 1, 2 and 3 exist).

```sql
SELECT installed_rank, version, description, success, installed_on
FROM flyway_schema_history
ORDER BY installed_rank;
```

### See the ER diagram

- **DBeaver**: expand the connection, then `atelier`, then **Tables**. Double-click a table (for example `auctions`) and open the **ER Diagram** tab at the top of the editor. To draw all tables, select the `atelier` database node and open the **ER Diagram** tab there, or select all tables, right-click and choose **View Diagram**.
- **MySQL Workbench**: choose **Database** then **Reverse Engineer...**, pick your `ATELIER` connection, keep clicking **Next**, select the `atelier` schema and finish. Workbench draws an EER diagram you can move around.
- Without any tool: the project already contains the diagram, in `docs/diagrams/database.svg` (open it in a browser) and in `docs/database.pdf`.

The database is explained table by table in `docs/DATABASE.md`.

---

## 6. Open the emails

Mailpit catches every email sent by the backend. Open http://localhost:8025. It is empty until something sends a message.

| What you do | Email you should see |
|---|---|
| Register a new account at http://localhost:4200/register | A welcome email to the new user and a registration notice to `admin@atelier.local` |
| Create an enabled user in Studio, Users (as ADMIN) | A welcome email to that user and a notice to the administrator |
| Place a bid as a bidder | A bid confirmation to you; if someone else was leading, an outbid notice to them |
| An auction ends or is cancelled | The winner gets a congratulations email and the administrator gets the result |
| Create an artist, or change an artist's email, in the Studio | A welcome message to the artist's address and a notice to the administrator |

Emails are sent after the action is saved and in the background, so wait a few seconds and refresh Mailpit. More details are in `docs/EMAIL.md`.

---

## 7. Open and run the API in Postman

The collection `postman/ATELIER.postman_collection.json` has 103 requests in 10 folders and 175 assertions (`pm.test`). It needs the backend running with the demo data (the Docker stack does this).

1. Open Postman. Click **Import** and select `postman/ATELIER.postman_collection.json`.
2. Open the collection **ATELIER REST API**, then its **Variables** tab. Check that `baseUrl` is `http://localhost:8080`. The variables `adminEmail`, `adminPassword`, `curatorEmail`, `bidderEmail` and `demoPassword` already hold the accounts of section 4.
3. Click the three dots next to the collection and choose **Run collection**. Keep the requests in their order and click **Run**.
4. Expect every request to pass: 103 requests, 175 assertions.

How the tokens work: the folder `0 · Auth` logs in as the administrator, the collaborateur and a bidder, and stores the three tokens in the collection variables `adminToken`, `curatorToken` and `bidderToken`. Later requests send the right token in their `Authorization: Bearer ...` header. Other variables such as `artistId`, `exhibitionId`, `artworkId` and `auctionId` are filled by the request that creates the item and reused by the next ones. That is why the order matters and why you should run the whole collection, not single requests from the middle, the first time.

The folders are: `0 · Auth`, `1 · Clients — Artists`, `2 · Projets — Exhibitions`, `3 · Artworks`, `4 · Auctions`, `5 · Account`, `6 · Users (admin)`, `7 · Public gallery`, `8 · Security checks` and `9 · Roles (admin CRUD)`.

The run creates and deletes its own test records and places bids and users in the database. Run it only on a development database. Registration requests also produce emails you can see in Mailpit.

**Newman (command line instead of Postman)**, from the repository root, with Node installed:

```bash
npx newman run postman/ATELIER.postman_collection.json --env-var baseUrl=http://localhost:8080
```

---

## 8. Run the backend or the frontend outside Docker

You can keep only the database and Mailpit in Docker and run the two applications from your IDE.

```bash
docker compose up -d db mailpit
```

If the full stack is also running, stop its `backend` and `frontend` first (`docker compose stop backend frontend`), or the ports 8080 and 4200 will be taken.

**Backend** (Java 17, port 8080):

```bash
cd backend
export JWT_SECRET=dev-only-secret-change-me-in-production-0123456789
export BOOTSTRAP_ADMIN_EMAIL=admin@atelier.local BOOTSTRAP_ADMIN_PASSWORD='Admin123!'
export DEMO_DATA=true
./mvnw spring-boot:run
```

The defaults in `application.yml` already point to `localhost:3306` (database `atelier`, user `atelier`, password `atelier_dev_password`) and to SMTP `localhost:1025`, which are the ports Docker exposes. Only `JWT_SECRET` is required. In IntelliJ you can instead open the `backend/` folder, run the class with the Spring Boot run configuration and put the same variables in **Run, Edit Configurations, Environment variables**. Spring DevTools restarts the app when classes change.

**Frontend** (Node 22.23.2, port 4200):

```bash
cd frontend
npm ci
npm start
```

`npm start` runs `ng serve` with `frontend/proxy.conf.json`, which sends `/api` and `/ws` to `http://localhost:8080`. (Inside Docker the proxy file is `proxy.docker.json` and points to `http://backend:8080`.) The browser reloads when you save a file. Open the folder `frontend/` in VS Code or IntelliJ.

**Tests:**

| What | Command | Needs |
|---|---|---|
| Backend unit tests | `cd backend && ./mvnw -B test` | Java 17 |
| Backend unit and integration tests | `cd backend && ./mvnw -B verify` | Java 17 and Docker running (Testcontainers starts its own temporary MySQL) |
| One integration class | `cd backend && ./mvnw -B verify -Dit.test=AuthIT` | same |
| Frontend tests (Vitest) | `cd frontend && npm test` | Node 22.23.2 |
| Frontend production build | `cd frontend && npm run build` | Node 22.23.2 |

The test plan is in `docs/TEST_PLAN.md`.

---

## 9. Build and run `psm.jar` alone

`psm.jar` is the production form of the project: one Java file that contains the API, the WebSocket and the Angular site. You need Java 17 and a running MySQL. The simplest MySQL is the one from Docker:

```bash
docker compose stop backend frontend      # free port 8080 if the full stack is running
docker compose up -d db mailpit
```

Build the jar (Maven downloads its own Node and builds Angular; the first build takes a few minutes):

```bash
cd backend
./mvnw -Pwith-frontend -DskipTests package
```

The result is `backend/target/psm.jar`. Run it:

```bash
export DB_URL='jdbc:mysql://localhost:3306/atelier?serverTimezone=UTC'
export DB_USER=atelier
export DB_PASSWORD=atelier_dev_password
export JWT_SECRET=dev-only-secret-change-me-in-production-0123456789
export BOOTSTRAP_ADMIN_EMAIL=admin@atelier.local
export BOOTSTRAP_ADMIN_PASSWORD='Admin123!'
export DEMO_DATA=true
java -jar target/psm.jar
```

Open http://localhost:8080: the whole site is served by the jar on that single port (there is no 4200 in this mode). Emails go to Mailpit on `localhost:1025` by default. Stop the jar with `Ctrl+C`.

Do not use these example values on a public server.

---

## 10. Open the documents

All documents are in the `docs/` folder of the repository.

| File | What it is |
|---|---|
| `docs/cahier-des-charges.pdf` | The requirements specification |
| `docs/technical-report.pdf` | The technical project report (formerly `compte-rendu.pdf`), with screenshots, test results and deployment |
| `docs/requirements-detailed.pdf` | A more detailed requirements document (the documents in `docs/` are being reorganised, so file names may change; check `ls docs/*.pdf`) |
| `docs/study-guide.pdf` | A study guide: Spring Boot, Angular, security, database, deployment, likely questions |
| `docs/database.pdf` | How the database works: tables, relations, delete rules, locks, real MySQL output |
| `docs/guide.pdf` | An illustrated guide to the tools, the startup and every role |
| `docs/report.pdf` | Implementation and verification report |
| `docs/slides.pdf` and `docs/slides.pptx` | The 18-slide presentation (PDF and editable PowerPoint) |

Important Markdown files (open them on GitHub or in an editor):

| File | Content |
|---|---|
| `README.md` | Overview, features, quick start, structure |
| `docs/USER_GUIDE.md` | What each kind of user can do |
| `docs/ARCHITECTURE.md` | Packages, security, bid flow, frontend structure |
| `docs/API.md` | Every REST endpoint, WebSocket topics, error format |
| `docs/DATABASE.md` | Database dictionary |
| `docs/EMAIL.md` | Emails and SMTP |
| `docs/DEPLOYMENT.md` | Server deployment and running the jar |
| `docs/DEVELOPMENT.md` | Local setup, conventions, git workflow |
| `docs/TEST_PLAN.md` | Automated tests and manual checklists |
| `docs/CDC_EQUIVALENCE.md` and `docs/CDC_AUDIT.md` | How the course requirements map to the project, and the evidence |
| `docs/DEMO.md` | The demonstration script |

**Rebuilding the PDFs** is optional; the PDFs are already in the repository. The PDFs that have a `.md` source in `docs/pack/` (cahier des charges, requirements, technical report, study guide, database) are built from the Markdown files in `docs/pack/`. You need Node 22.23.2, Python 3, Graphviz (`dot`), Poppler (`pdftotext`, `pdfunite`) and ImageMagick. Then:

```bash
cd docs/build
npm ci
npx playwright install chromium
cd ../..
node docs/build/pack.mjs                  # every document in docs/pack/
node docs/build/pack.mjs study-guide      # one document (name of its .md file in docs/pack/)
```

The guide and report PDFs use `node docs/build/render.mjs`. Details are in `docs/DOCUMENTATION_BUILD.md`. Do not run the capture scripts of that folder against anything but a disposable database.

---

## 11. The live deployment

The project also runs on the internet: on an AWS EC2 server (Ubuntu, Docker Compose with the application container and a MySQL container), reached over HTTPS through a Cloudflare Quick Tunnel. A Quick Tunnel address is temporary and changes whenever the tunnel restarts, so it is not written in this guide. Ask the project owner for the current address, and for the demo credentials, which are private. The recorded checks of the live site are in `docs/evidence/vps-smoke.json`, and the demo script is `docs/DEMO.md`. The deployment files (`deployment/compose.prod.yaml`, `deployment/nginx/atelier.conf`, `deployment/deploy.sh`) are explained in `docs/DEPLOYMENT.md`.

Do not run anything that changes data on the live site while exploring.

---

## 12. Troubleshooting

| Problem | Cause and fix |
|---|---|
| `port is already allocated` or `address already in use` (3306, 8080, 4200, 8025, 1025) | Another program uses the port. Typical: a local MySQL on 3306, or another ATELIER stack. Stop it, or find the user with `lsof -i :3306` (Linux, macOS) or `netstat -ano \| findstr 3306` (Windows) |
| `Cannot connect to the Docker daemon` / `docker: command not found` | Docker is not running or not installed. Start Docker Desktop and wait until it says it is running, then retry |
| The backend logs `Communications link failure` or `Connection refused` at first | MySQL is still starting. The backend waits for the database health check; if you run it from an IDE, wait until `docker compose ps` shows `db` as `healthy` and start again |
| The site loads but shows no artworks, or the page is blank on first start | The frontend is still running `npm ci` and the backend is still starting. Watch `docker compose logs -f backend frontend` and wait for the backend to log that it started, then reload |
| Login gives `401` | Wrong email or password (check section 4, passwords are case-sensitive). Demo accounts exist only if `DEMO_DATA=true`. The bootstrap admin is created only if its email does not exist yet, and changing `BOOTSTRAP_ADMIN_PASSWORD` later does not change an existing password. To start clean, use `docker compose down -v` then `docker compose up` |
| API requests from Postman answer `401` on protected routes | The token variables are empty. Run the `0 · Auth` folder first, or the whole collection |
| Mailpit is empty | Wait a few seconds and refresh. Check you are on http://localhost:8025. Check `SMTP_HOST=mailpit` and `SMTP_PORT=1025` in `.env` (for a backend outside Docker use `localhost`). Email failures are only logged as warnings: see `docker compose logs backend` |
| `./mvnw verify` fails with a Docker or Testcontainers error | Testcontainers needs Docker running. Start Docker, then retry. `./mvnw test` (unit tests only) does not need Docker |
| `./mvnw: Permission denied` (Linux, macOS) | Run `chmod +x backend/mvnw` |
| DBeaver: `Public Key Retrieval is not allowed` | Driver properties, set `allowPublicKeyRetrieval` to `true` (and `useSSL` to `false` if SSL errors continue) |
| `JWT_SECRET` error when starting the backend outside Docker | Export `JWT_SECRET` first (section 8) |
| The Docker stack is slow or the first build seems stuck | The first start downloads many libraries. Check `docker compose logs -f` for progress. |
| Apple Silicon (M1/M2/M3) or other ARM computers | The images used (`mysql:8.4.13`, `eclipse-temurin:17-jdk`, `node:22.23.2-alpine`, `axllent/mailpit`) are published for ARM64 too, so no change should be needed. This guide was not run on an ARM machine |
| Changes to `.env` have no effect | Recreate the containers: `docker compose up -d --force-recreate` |
| You want to start over from zero | `docker compose down -v`, then `docker compose up` (this deletes the database) |
