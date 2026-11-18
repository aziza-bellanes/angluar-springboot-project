# Deployment

ATELIER ships as one Docker image (`Dockerfile`) that contains `psm.jar`: the Spring Boot application with the Angular build in `static/`. This guide covers a VPS deployment with Docker Compose, host Nginx and HTTPS, and running the jar directly.

```
Internet --HTTPS--> Nginx (host, 80/443) --> 127.0.0.1:8080 app container (psm.jar) --> db container (MySQL 8.4, volume mysql_data)
```

Files in `deployment/`:

| File | Purpose |
|---|---|
| `compose.prod.yaml` | Production stack: `app` (built from the root `Dockerfile`), `db` (MySQL 8.4.13) and an optional `mailpit` profile |
| `.env.prod.example` | Template for `deployment/.env.prod` (never committed; ignored by git) |
| `nginx/atelier.conf` | Reverse proxy with WebSocket upgrade, gzip and static caching |
| `deploy.sh` | Syncs the sources over SSH, builds on the server, restarts the stack and runs smoke checks |
| `database.sh` | Streams a database backup or restores one, using credentials already inside the database container |

## 1. Prerequisites

On the VPS (Debian or Ubuntu assumed):

```bash
# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"        # log out and back in

# Nginx, certbot, rsync
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx rsync curl
```

Also required: a DNS `A` record for your domain pointing at the VPS, ports 80 and 443 open, SSH access with a key. On your workstation: `ssh` and `rsync`.

## 2. Configure the environment

Create the remote directory and the environment file (the file is never synced by `deploy.sh`):

```bash
ssh user@host 'sudo mkdir -p /opt/atelier/deployment && sudo chown -R "$USER" /opt/atelier'
scp deployment/.env.prod.example user@host:/opt/atelier/deployment/.env.prod
ssh user@host nano /opt/atelier/deployment/.env.prod
```

| Variable | Meaning |
|---|---|
| `PUBLIC_URL` | Public origin, e.g. `https://atelier.example.com`. Used for email links and as `CORS_ORIGINS` (also used for WebSocket origins). Required |
| `APP_PORT` | Local port bound on `127.0.0.1` (default 8080); keep it in sync with Nginx |
| `ATELIER_VERSION` | Tag of the built image `smartsoft/atelier:<version>` |
| `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` | Database credentials; use strong values |
| `JWT_SECRET` | Signing key, at least 32 random bytes: `openssl rand -base64 48` |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | Initial administrator, created only if the email does not exist (password at least 8 characters); changing these values does not reset an existing password |
| `ADMIN_EMAIL` | Recipient of registration notifications and auction result emails |
| `MAIL_FROM` | Sender address of notification emails |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_AUTH`, `SMTP_TLS` | SMTP provider. For a local catcher use `SMTP_HOST=mailpit`, `SMTP_PORT=1025` and start the `mailpit` profile |
| `DEMO_DATA` | `true` loads the demonstration gallery and demo accounts on first start (only if the catalogue is empty). Set `false` for a real gallery |

Never reuse the demo passwords on a public server. If `DEMO_DATA=true`, change or disable the `*@atelier.demo` accounts from the Studio (Users page).

Root `.env` belongs to the development stack (`docker compose up`). `deployment/.env.prod` belongs to the production stack and must be explicitly selected with `--env-file deployment/.env.prod`. They are separate configurations, not synchronized copies. Do not paste private SMTP values into tracked templates. See [EMAIL.md](EMAIL.md) for Mailpit and authenticated SMTP, including Gmail app passwords.

Restrict the private file after editing: `chmod 600 /opt/atelier/deployment/.env.prod`.

## 3. Deploy

From your workstation, at the repository root:

```bash
deployment/deploy.sh user@host            # remote dir defaults to /opt/atelier
deployment/deploy.sh user@host /srv/atelier
```

The script:

1. `rsync`s the sources (excluding `.git`, `node_modules`, `target`, `dist`, `.angular`, `deployment/.env.prod`);
2. checks that `deployment/.env.prod` exists, then runs `docker compose -f deployment/compose.prod.yaml --env-file deployment/.env.prod up -d --build --remove-orphans` and prunes dangling images;
3. waits (up to about 3 minutes) for `http://127.0.0.1:8080/actuator/health/readiness`;
4. runs smoke checks: the home page and `/artworks` return the Angular shell, `/api/artworks?size=1` returns JSON, and `/api/studio/artists` returns 401 without a token.

Flyway applies the migrations on startup, so the schema is created automatically.

## 4. Nginx and HTTPS

```bash
sudo cp /opt/atelier/deployment/nginx/atelier.conf /etc/nginx/sites-available/atelier.conf
sudo sed -i 's/atelier.example.com/your.domain.tld/' /etc/nginx/sites-available/atelier.conf
sudo ln -s /etc/nginx/sites-available/atelier.conf /etc/nginx/sites-enabled/atelier.conf
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d your.domain.tld     # obtains the certificate and enables HTTPS redirect
sudo systemctl status certbot.timer         # automatic renewal
```

What the configuration does:

- `location /ws` proxies to `127.0.0.1:8080` with `proxy_http_version 1.1`, `Upgrade` and `Connection` headers (through the `$connection_upgrade` map) and a one-hour `proxy_read_timeout`. **Without this block live bidding silently falls back to a broken connection.**
- Static assets (`js`, `css`, fonts, images) are cached for 30 days.
- Everything else, including the Angular routes and `/api`, goes to the application with `X-Forwarded-*` headers (the app runs with `forward-headers-strategy: framework`).

If you change `APP_PORT`, update the three `proxy_pass` lines.

## 5. Backups

User data lives in the MySQL volume `atelier-prod_mysql_data` (the project name is `atelier-prod`). Back up with a logical dump:

```bash
# Backup
umask 077
ssh user@host 'cd /opt/atelier && deployment/database.sh backup' \
  | gzip > atelier-$(date +%F).sql.gz

# Restore into a running stack
gunzip -c atelier-2026-11-17.sql.gz | ssh user@host 'cd /opt/atelier && deployment/database.sh restore'
```

Schedule the backup with cron on a trusted machine and keep copies off the VPS. To snapshot the raw volume instead, stop the stack first (`docker compose ... stop db`) and archive `/var/lib/docker/volumes/atelier-prod_mysql_data`.

## 6. Updating

Commit or merge to `main`, check out the revision you want to ship, and run `deployment/deploy.sh user@host` again. The database volume is preserved; new Flyway migrations run on startup. Logs:

```bash
ssh user@host 'cd /opt/atelier && docker compose -f deployment/compose.prod.yaml --env-file deployment/.env.prod logs -f app'
```

## 7. Rollback

1. Check out the previous known-good revision locally (`git switch --detach <tag-or-sha>`) and run `deployment/deploy.sh user@host`. Set `ATELIER_VERSION` in `.env.prod` to tag images by release if you want to keep several on the server.
2. Flyway migrations are forward-only and are never edited after merge. If a release added a migration that must be reverted, restore the pre-deployment database dump (section 5) before redeploying the old version. Take a dump before every deployment that adds a migration.

## 8. Troubleshooting

| Symptom | Check |
|---|---|
| `deploy.sh` stops with "Missing deployment/.env.prod" | Create the file on the VPS (section 2) |
| Compose fails with `Set JWT_SECRET` (or similar) | A required variable is empty in `.env.prod` |
| App restarts in a loop | `docker compose ... logs app`: wrong DB credentials, `JWT_SECRET` too short, or `BOOTSTRAP_ADMIN_PASSWORD` under 8 characters |
| Browser shows CORS or WebSocket origin errors | `PUBLIC_URL` must equal the exact origin (scheme and host) users type |
| Auction room never turns "live", console shows `/ws` failures | The Nginx `/ws` block with `Upgrade` headers is missing or `nginx -t` was not reloaded |
| Registration works but no email arrives | Check `SMTP_*`; failures are logged as warnings and never block a registration. With the Mailpit profile: `docker compose ... --profile mailpit up -d` and browse to `http://127.0.0.1:8025` through an SSH tunnel |
| 502 from Nginx | The container is not ready yet or `APP_PORT` differs from the Nginx upstream; `curl http://127.0.0.1:8080/actuator/health/readiness` on the VPS |
| Deep links such as `/artworks/some-slug` return 404 | Requests are bypassing the app; all paths must be proxied to port 8080 |

## Build psm.jar with Maven

The opt-in `with-frontend` profile installs Node.js (into `backend/target/node-install`), runs `npm ci` and `npm run build` in `frontend/`, and copies `frontend/dist/atelier/browser/` into the jar under `BOOT-INF/classes/static/`. Nothing is written into `src/`.

```bash
cd backend
./mvnw -Pwith-frontend -DskipTests package      # produces target/psm.jar with Angular included
unzip -l target/psm.jar | grep BOOT-INF/classes/static/index.html
```

Without the profile (`./mvnw verify`, the `Dockerfile`) the build is unchanged and the jar contains only what is already in `src/main/resources/static/`.

## 9. Running `psm.jar` directly

Without Docker you need Java 17, a MySQL 8 database and (for email) an SMTP server.

Build the jar (Angular included):

```bash
# 1. Build Angular
cd frontend && npm ci && npm run build -- --configuration production && cd ..
# 2. Copy it into the Spring Boot static resources (git-ignored) and package
mkdir -p backend/src/main/resources/static
cp -r frontend/dist/atelier/browser/. backend/src/main/resources/static/
cd backend && ./mvnw -B -DskipTests package       # produces backend/target/psm.jar
```

Or extract it from the image: `docker build -t atelier . && docker create --name atelier-extract atelier && docker cp atelier-extract:/app/psm.jar . && docker rm atelier-extract`.

Run it:

```bash
export DB_URL='jdbc:mysql://localhost:3306/atelier?serverTimezone=UTC'
export DB_USER=atelier DB_PASSWORD='...'
export JWT_SECRET="$(openssl rand -base64 48)"
export BOOTSTRAP_ADMIN_EMAIL=admin@example.com BOOTSTRAP_ADMIN_PASSWORD='ChangeMe123!'
export ADMIN_EMAIL=admin@example.com
export PUBLIC_URL=https://atelier.example.com
export CORS_ORIGINS=https://atelier.example.com
export SMTP_HOST=smtp.example.com SMTP_PORT=587 SMTP_AUTH=true SMTP_TLS=true SMTP_USER=... SMTP_PASSWORD=...
java -jar psm.jar
```

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP port |
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | local MySQL, `atelier` | Database |
| `JWT_SECRET` | empty (**required**) | JWT signing key, 32+ bytes |
| `JWT_EXPIRATION` | `PT12H` | Token lifetime (ISO-8601 duration) |
| `CORS_ORIGINS` | `http://localhost:4200` | Allowed origins, comma separated |
| `ADMIN_EMAIL`, `MAIL_FROM` | `admin@atelier.local`, `noreply@smartsoft-solutions.local` | Notification recipient and sender |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_AUTH`, `SMTP_TLS` | `localhost`, `1025`, empty, empty, `false`, `false` | SMTP |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | empty | First administrator |
| `AUCTION_SOFT_CLOSE` | `PT60S` | Extension window for late bids |
| `AUCTION_LIFECYCLE_INTERVAL` | `PT5S` | Scheduler delay |
| `DEMO_DATA` | `false` | Load the demonstration gallery |

To run as a service, create a systemd unit with `ExecStart=/usr/bin/java -jar /opt/atelier/psm.jar`, an `EnvironmentFile=` holding the variables above, and a dedicated unprivileged user. Put Nginx in front exactly as in section 4.

## Upgrading an existing V2 database

The application applies `V3__dynamic_roles.sql` through Flyway at startup. It adds `roles.profile` and `roles.system_key`, fills them from the existing built-in labels, then makes `profile` mandatory. Existing role IDs and `user_roles` assignments remain intact. `RoleMigrationIT` exercises this populated V2-to-V3 path against MySQL. Keep V1 and V2 unchanged and back up the database before the normal deployment upgrade.

After upgrade, administrators manage named roles under **Studio → Roles** and assign them from the live catalogue in **Users**. Renamed system roles retain stable system keys and permission profiles across restarts. No manual SQL rename or role recreation is required.


## Moving to another machine or VPS

Git or a Docker image transfers the program, not your accounts, bids, artworks or secrets. Docker volumes are local to each Docker host. Copying `.env.prod` alone does not preserve accounts; copying the database alone does not configure email or public links.

1. Record the source Git commit or exact image digest, take a database backup, and arrange a maintenance window that prevents writes and auction settlement during the final dump and cutover. Keep the old instance stopped until cutover is complete so two schedulers cannot operate independently.
2. Install Docker/Compose on the destination. Deploy the same source revision or load/pull the same image version. A release tag is useful only if it identifies the same built image. Keep MySQL compatible (the supplied stack uses 8.4.13).
3. Transfer the private configuration separately over SSH, for example `scp deployment/.env.prod user@new-host:/opt/atelier/deployment/.env.prod`, then `chmod 600` it on the destination. If the source is a development instance, create `.env.prod` from the production template and enter the required settings privately; do not rename the development file and assume it is production-ready. Never commit or attach the real file to a report.
4. Set destination-specific `PUBLIC_URL`, SMTP settings, `MAIL_FROM`, `ADMIN_EMAIL`, database credentials and Nginx domain. Production Compose maps `PUBLIC_URL` to REST/WebSocket `CORS_ORIGINS`; when running the jar directly set both variables. Retain the existing `JWT_SECRET` if existing tokens must remain valid; rotating it requires users to log in again. Set `DEMO_DATA=false` for a real installation.
5. Start only the destination database: `docker compose -f deployment/compose.prod.yaml --env-file deployment/.env.prod up -d db`. Wait for it to become healthy. Restore the SQL dump using section 5 before starting the app. The source dump command uses root `.env` and root `compose.yaml` for a development source, or the production paths for a production source. Do not use `down -v`, which deletes the database volume.
6. Start the application with the production Compose command in section 3, configure Nginx/HTTPS, and point DNS at the destination. Flyway runs at app startup; starting with the same app version avoids introducing a schema upgrade during the move.
7. Verify readiness, existing-account login, stored catalogue and bids, secured Studio access, Angular deep links, WebSocket bidding and fresh email delivery with the new URL. Retain the encrypted or access-restricted backup and the old host until the move is accepted.

Restored users retain their BCrypt passwords and role assignments. `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` only create a missing initial administrator; they do not change a restored user's password. Use the existing administrator account and normal account-management flow to update credentials.
