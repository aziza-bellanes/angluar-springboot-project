# ATELIER — local links and accounts

Everything you can open in the browser when the project runs on your own computer.

Start everything from the repository folder:

```bash
cp .env.example .env      # first time only
docker compose up -d      # starts MySQL, Mailpit, phpMyAdmin, the backend and the frontend
docker compose ps         # every service should be "running" (the first start takes a few minutes)
```

## The main links

| What | Link | Login |
| --- | --- | --- |
| **The application** (public site + Studio) | http://localhost:4200 | see [Accounts](#accounts) |
| **phpMyAdmin** (the MySQL database in the browser) | http://localhost:8090 | automatic (user `atelier`) |
| **Mailpit** (every email the app sends) | http://localhost:8025 | none |
| Backend API (Spring Boot, direct) | http://localhost:8080/api/artworks | none for public data |
| Backend health | http://localhost:8080/actuator/health | none |

## Accounts

| Role | Email | Password | What it can do |
| --- | --- | --- | --- |
| Admin | `admin@atelier.local` | `Admin123!` | Everything: edit and delete, auctions, users, roles |
| Collaborateur | `curator@atelier.demo` | `Atelier2026!` | Studio: view and add artists, exhibitions, artworks (no edit or delete) |
| Bidder | `collector@atelier.demo` | `Atelier2026!` | Bid in auctions, see "My collection" |
| Bidder | `patron@atelier.demo` | `Atelier2026!` | A second bidder, to bid against the first one |

- The admin account comes from `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` in `.env`. If you changed them, use your values.
- The admin is created only once, at the first start. Changing `.env` later does not change an existing account. Use `docker compose down -v` to start again with a fresh database.
- The demo accounts exist because `DEMO_DATA=true` in development.
- You can also create your own bidder account at http://localhost:4200/register.

## The database

| What | Value |
| --- | --- |
| Browser | http://localhost:8090 (phpMyAdmin) |
| Host / port (Workbench, DBeaver) | `127.0.0.1` / `3306` |
| Database | `atelier` |
| User / password | `atelier` / `atelier_dev_password` |
| Root password | `atelier_root_dev` |
| Terminal | `docker compose exec db mysql -uatelier -patelier_dev_password atelier` |

In phpMyAdmin:
- Click **atelier** on the left to see the tables. Click a table to see its rows. Press **F5** after an action in the app to see the change.
- **SQL** tab: run your own queries.
- **atelier → More → Designer**: diagram of the tables and their foreign keys.
- **Edit**, **Delete**, **Empty** and **Drop** really change the database.

Useful queries:

```sql
SELECT * FROM bids ORDER BY id DESC LIMIT 10;
SELECT id, status, current_price, ends_at FROM auctions WHERE status = 'OPEN';
SELECT u.email, r.libelle FROM users u
  JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id;
SELECT a.id, a.name, COUNT(e.id) AS exhibitions
  FROM artists a LEFT JOIN exhibitions e ON e.artist_id = a.id GROUP BY a.id;
SELECT version, description, installed_on FROM flyway_schema_history;
```

## Public site pages

| Page | Link |
| --- | --- |
| Home | http://localhost:4200/ |
| Artworks | http://localhost:4200/artworks |
| Artists | http://localhost:4200/artists |
| Exhibitions | http://localhost:4200/exhibitions |
| Auctions | http://localhost:4200/auctions |
| Login | http://localhost:4200/login |
| Register | http://localhost:4200/register |
| My collection (bidder) | http://localhost:4200/account |

## Studio pages (log in as admin or collaborateur)

| Page | Link | Who |
| --- | --- | --- |
| Dashboard | http://localhost:4200/studio | Admin, Collaborateur |
| Clients (artists) | http://localhost:4200/studio/artists | Admin, Collaborateur |
| Projets (exhibitions) | http://localhost:4200/studio/exhibitions | Admin, Collaborateur |
| Artworks | http://localhost:4200/studio/artworks | Admin, Collaborateur |
| Auctions | http://localhost:4200/studio/auctions | Admin |
| Users | http://localhost:4200/studio/users | Admin |
| Roles | http://localhost:4200/studio/roles | Admin |
| Profile | http://localhost:4200/studio/profile | Admin, Collaborateur |

## Public API links (open directly in the browser)

| Data | Link |
| --- | --- |
| Artworks | http://localhost:8080/api/artworks |
| Artists | http://localhost:8080/api/artists |
| Exhibitions | http://localhost:8080/api/exhibitions |
| Open auctions | http://localhost:8080/api/auctions?status=OPEN |
| Closed auctions | http://localhost:8080/api/auctions?status=CLOSED |

The Studio and admin APIs (`/api/studio/...`, `/api/admin/...`, `/api/account`) need a token. Use Postman for them: import `postman/ATELIER.postman_collection.json` and set `baseUrl` to `http://localhost:8080`. The live updates use the WebSocket endpoint `ws://localhost:8080/ws`.

## Try it: an action in the app, the change in MySQL

| Do this at http://localhost:4200 | Then look in phpMyAdmin |
| --- | --- |
| Register a new account | `users` and `user_roles` have a new row; Mailpit has the emails |
| Bid as `collector@atelier.demo` | `bids` has a new row; `auctions.current_price` and `version` changed |
| Add an artist as admin | `artists` has a new row |
| Add an exhibition to that artist | `exhibitions` has a new row with that `artist_id` |
| Try to delete that artist | Refused in the app (409); the row is still in `artists` |

## Start, stop, reset

| Command | Effect |
| --- | --- |
| `docker compose up -d` | Start everything in the background |
| `docker compose ps` | See what is running |
| `docker compose logs -f backend` | Follow the backend log |
| `docker compose stop` | Stop everything, keep the data |
| `docker compose down` | Remove the containers, keep the data |
| `docker compose down -v` | Remove the containers **and the database** (fresh demo data at next start) |

More details: [OPEN_EVERYTHING.md](OPEN_EVERYTHING.md).
