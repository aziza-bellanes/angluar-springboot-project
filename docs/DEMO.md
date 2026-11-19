# Record the ATELIER demo

Target length: 9 to 11 minutes. ATELIER is an art gallery with live auctions and a back-office called the Studio. It was built for a course specification where Client = Artist and Projet = Exhibition, with three roles: ADMIN, COLLABORATEUR and BIDDER.

Parts 1 to 6 run on the live deployment. Part 7 (Newman) and part 8 (MySQL, jar) run on the local stack.

## Before recording

1. **Live URL.** The deployment is on an AWS EC2 t3.small (Ubuntu) running Docker Compose with an app container and a MySQL 8.4 container, exposed through a Cloudflare Quick Tunnel:

   https://fruits-libraries-strand-scenic.trycloudflare.com

   This is a temporary Quick Tunnel address. It changes if the tunnel restarts. To get the new one, connect to the server and read the logs of the cloudflared container (`docker logs <cloudflared container>`), then look for the line containing `trycloudflare.com`. The repository's `deployment/` files do not define that container, so use the name shown by `docker ps`.
2. **Accounts.**

   | Role | Account | Password |
   |---|---|---|
   | COLLABORATEUR | curator@atelier.demo | Atelier2026! |
   | BIDDER | collector@atelier.demo | Atelier2026! |
   | ADMIN (deployed) | the deployed admin account | kept outside the repository (given to the presenter separately) |
   | ADMIN (local) | admin@atelier.local | Admin123! |

   The two demo accounts come from the restored demo dataset. Do not show the real admin email or password on screen.
3. **Windows.** Two browser windows side by side, the second one in a private window so it has no session. Keep a third tab on the admin inbox (the address set as `ADMIN_EMAIL`) and one on the inbox of the address you will register.
4. **Pick an auction** that is open and has a few minutes left, so a bid and the countdown are both visible. Note its minimum next bid.
5. **Local stack for parts 7 and 8.** From the repository root: `docker compose up -d`, then check `http://localhost:4200` and `http://localhost:8080`. Node must be available for `npx newman`.
6. Record at 1080p. Zoom the browser to 110% so the price changes are readable.

## 1. Visitor tour (about 1 min 30)

Open the live URL while signed out.

1. **Homepage.** Let the opening animation play, scroll once through the featured works.
2. **Gallery** (`/artworks`). Scroll, open one artwork (`/artworks/:slug`): image, artist, price or auction status.
3. **Artists** (`/artists`, the "Clients" of the specification). Open one profile.
4. **Exhibitions** (`/exhibitions`, the "Projets").
5. **Auctions** (`/auctions`). Show the list with current prices and countdowns.

Say:

> This is the public side, open to anyone. The specification's Clients are the artists and its Projets are the exhibitions; the public pages show the same records the back-office manages. Auctions are listed with their current price and time left.

## 2. Register a new account (about 1 min)

1. Click **Sign up** (`/register`). Create an account with an address you can read.
2. After registration, open the account page (`/account`, "My collection").
3. Switch to the two inboxes: the welcome message to the new user, and the registration notification to the admin.

Say:

> Registration is public and gives the BIDDER role automatically; nobody can pick a role here. After the database commit, the application sends two emails asynchronously: a welcome message to the new user and a notification to the administrator. This is the course step "send an email to the admin after registration". If the mail server fails, the registration still succeeds and the failure is only logged.

## 3. Live bidding (about 2 min)

Window A: signed in as collector@atelier.demo. Window B: private window, signed out or signed in as another bidder, on the same auction page (`/auctions/:id`).

1. In window A, enter a bid below the minimum next bid and submit. Show the error message.
2. Enter exactly the minimum next bid (current price plus the minimum increment, or the starting price if there are no bids) and submit.
3. Look at window B without touching it: the price, the leader and the bid history update on their own.
4. Optional: if another bidder is leading, show that the leader cannot outbid themselves.

Say:

> Each auction has a minimum increment. A bid under the minimum is refused with an error, and the leader cannot outbid themselves. When a bid is accepted, the server pushes the new state over a WebSocket, so the second window changed without a refresh. Bids are written under a row lock, so two simultaneous bids cannot both win. There is also a soft close: a bid placed near the end extends the auction by 60 seconds, so last-second bidding does not decide the result. After the bid, the bidder gets a confirmation email and the previous leader gets an outbid notice.

## 4. Studio dashboard as administrator (about 2 min)

Sign in with the deployed admin account. The Studio opens on **Overview** (`/studio`). Go through the dashboard from top to bottom:

| Area | What to show | What it means |
|---|---|---|
| Header | Greeting and today's date | The page is personal to the signed-in staff member. |
| KPI cards | Artists, Exhibitions, Bids placed, Users, each with "new this week" | Counts come from the API (`GET /api/studio/overview`), not from the browser. |
| Bid activity | Bar chart of daily bid volume; switch between **7 days** and **14 days** | The volume, number of bids, average bid and busiest day are recomputed for the chosen range. |
| Auctions by status | Ring chart: Scheduled, Open, Closed, Cancelled, with percentages | The scheduler moves auctions between these states automatically every 5 seconds. |
| Recent bids | Latest bids with bidder, artwork, amount and time | The same bids that the auction rooms receive live. |
| Top artists | Artists ranked by activity with progress bars | Ranking table in the Argon dashboard style. |
| Stat tiles | Artworks, Live auctions, Total exhibition budget | The budget is the sum of the exhibitions' budgets (course field *budget*). |
| Ending soon | Open auctions closest to their end, with **See auctions** | Shortcut to the auction management page. |
| Quick actions | New artist, New exhibition, New artwork, New auction | Each opens the matching form directly. |

Then show that the numbers are live data:

1. Note the **Bids placed** card and the **Recent bids** list.
2. In the collector's window (part 3), place one more bid.
3. Reload the overview. The bid count, the bid activity bar for today and the recent bids list include the new bid.

Say:

> The dashboard follows the Argon template from the specification: key figures at the top, a chart of activity, a status breakdown, ranking tables and quick actions. Everything on it comes from one API call that only staff can make. The bid we just placed appears in the counts and in the chart.

## 5. Studio management as administrator (about 2 min)

1. **Artists** (caption "Clients"). Search the list, create an artist with **Quick actions → New artist**, edit it, then delete it.
2. Try to delete an artist who still has exhibitions. Show the refusal (HTTP 409, a business error message).
3. **Exhibitions** (caption "Projets"). Create one linked to an artist, then edit it. Show the budget and duration fields.
4. **Artworks** and **Auctions.** Open an artwork, then the auction list: status badges, current price, and the form used to schedule a new auction.
5. **Users** and **Roles.** Open a user and show that a user can hold several roles and a role can belong to several users (many-to-many). Create a custom role with a profile, then assign it to a user.
6. **My profile.** Show the profile page and the password change form.

Say:

> The Studio menu follows the specification: Clients, Projets, Users. Creating and editing go through validated forms. Deleting an artist who still has exhibitions is refused with a 409 and a readable message, so the database never ends up with orphaned exhibitions. Users and roles are many-to-many, and an administrator can define a new role with a profile and attach it to any user.

Clean up: delete the artist, exhibition and role you created, so the live data stays as it was.

## 6. Studio as collaborateur (about 1 min)

Sign out, then sign in as curator@atelier.demo.

1. Open `/studio`: the Artists and Exhibitions lists load. Show that **Add** is available and that edit and delete actions are not.
2. Show that Users and Roles are missing from the menu. Type `/studio/roles` in the address bar: the guard redirects to the access denied page (`/forbidden`).
3. If you have the browser developer tools open, show that the same request made directly to the API returns 403.

Say:

> Roles are enforced twice. In Angular, `roleGuard` hides the menu entries and redirects to the forbidden page. In Spring Security, the same rules apply to the API itself: a collaborateur calling a delete or an admin endpoint gets a 403 even without the interface.

## 7. API tests with Newman (about 1 min 30)

On the local stack, from the repository root:

```bash
npx newman run postman/ATELIER.postman_collection.json --env-var baseUrl=http://localhost:8080
```

Show the per-folder results and the final summary. The last recorded run had 103 requests, 175 assertions and 0 failures. Quote the figures from the run you record if they differ.

Say:

> The Postman collection covers every endpoint for each role, including the expected 401 without a token, 403 for a collaborateur deleting, and 409 for a business conflict. Newman runs it from the command line, so the same check can run in the pipeline.

## 8. Optional: database and jar (about 1 min)

Database, local stack. Use the credentials from `compose.yaml` (defaults: user and database `atelier`, passwords set in the compose file or your `.env`):

```bash
docker compose exec db mysql -uatelier -p atelier -e "SHOW TABLES;"
docker compose exec db mysql -uatelier -p atelier -e "SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='atelier' AND REFERENCED_TABLE_NAME IS NOT NULL;"
```

Jar: show `backend/target/psm.jar`, then `java -jar backend/target/psm.jar` (it needs the database settings from `compose.yaml` in the environment). The Angular build is inside the jar, served from `static/`.

Say:

> The schema is managed by Flyway migrations and has real foreign keys. The deliverable is a single `psm.jar` with the Angular build embedded, which is the course's packaging step. The container image builds the same jar.

## 9. Wrap-up (about 30 s)

| Part | CDC step it shows |
|---|---|
| 1 Visitor tour | Angular components and navigation (step 8) |
| 2 Registration | Email to the admin after registration (step 5), login and registration tests (step 6) |
| 3 Live bidding | Extension beyond the specification: auctions, WebSocket, soft close |
| 4 Studio dashboard | Argon dashboard model (step 8), roles in the interface (step 10) |
| 5 Studio management | CRUD for Clients and Projets, Users and Roles (steps 2 and 8) |
| 6 Studio as collaborateur | Security layer and JWT (step 4), guards (step 9), roles in the interface (step 10) |
| 7 Newman | Postman tests (step 3), secured resources (step 7) |
| 8 Database and jar | Packaging `psm.jar` (step 11) |
| Live URL | Deployment (step 12) |

Say:

> Each part of the demo maps to a step of the specification: Spring CRUD and JWT security on the back end, Angular with guards and role-aware screens, and deployment as one jar in a container stack. The auction room is an addition on top of those steps. The mapping step by step is in `docs/CDC_EQUIVALENCE.md`.

## If something goes wrong

| Problem | What to do |
|---|---|
| The live URL does not load | The Quick Tunnel address changed after a restart. Read the new one from the cloudflared container logs on the server (see "Before recording"). |
| The price does not update in the second window | Refresh both windows and reopen the auction. Check that the page uses `wss://` in the browser's network tab. |
| An email does not arrive | Wait a minute for the SMTP provider and check the spam folder. A mail failure is logged and never blocks registration or a bid. |
| Live site unavailable entirely | Use the local fallback: `docker compose up` (see `compose.yaml`) and open http://localhost:4200. The local admin is admin@atelier.local. Local mail is captured by Mailpit. |

## Where the screenshots are

Captured evidence is in `docs/evidence/screenshots/`, each folder with a `manifest.json` of titles and captions:

- `app/`: `live-*` pages from the deployed site (public pages, mobile views, the Studio clients list) and `local-*` pages from a disposable local instance (Studio dashboard, every Studio list and form, collaborateur view, forbidden page, auction room before and after a bid, second viewer, Mailpit).
- `postman/`: the Newman run summary, folder runs, the HTML report and request cards (login, create artist, place bid, 401, 403, 409).
- `mysql/`: tables and foreign keys, commit and rollback, both locking strategies, delete rules, constraint errors, and the SQL Hibernate sends for one bid.

The PDFs built from them are `docs/cahier-des-charges.pdf`, `docs/compte-rendu.pdf`, `docs/study-guide.pdf` and `docs/database.pdf`.
