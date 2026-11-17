# User guide

ATELIER, by SmartSoft Solutions, has two faces: the **public gallery** that everyone can explore, and the **Studio**, the back-office used by the SmartSoft team. This guide walks through each kind of user. To try everything locally, start the stack (see the [README](../README.md#quick-start-docker)) and open http://localhost:4200.

| You are... | Account | What you can do |
|---|---|---|
| Visitor | none | Browse the gallery, artists, exhibitions and auctions; watch live auctions |
| Bidder (collector) | self-registration | Everything a visitor can, plus bid and follow your collection |
| Collaborateur | created by an admin | Studio: view and add artists, exhibitions and artworks |
| Administrator | bootstrap account or granted by an admin | Studio: full control including auctions and users |

Demo accounts (when the demo data is loaded): `admin@atelier.local` / `Admin123!`; `curator@atelier.demo` (Collaborateur), `collector@atelier.demo` and `patron@atelier.demo` (Bidders) with password `Atelier2026!`.

## Visitor

### The homepage scroll sequence
1. Open the homepage. A pile of paintings arrives and **riffles open** into a ring floating in front of a gallery wall (the first second and a half; scrolling is held briefly).
2. **Scroll down.** While the section stays pinned, the paintings gather into a shuffled pile, stretch into a deep corridor, then one painting comes forward as the featured work.
3. Move your mouse: the scene leans gently toward the pointer. Click any painting to open its page.
4. If your system is set to reduce motion, you get a calm, swipeable row of paintings instead.

### The gallery
1. Click **Discover art** (`/artworks`).
2. Use **Search** (title, artist, subject), the **Artist** selector and the **Medium** selector to narrow the collection. Switch between the **Gallery** and **Salon** layouts.
3. Click a work: the painting grows from the card into its detail page, with its description, medium, dimensions, year, estimate and artist. If the work is being auctioned, a link takes you to the auction room.

### Artists and exhibitions
- **Artists** (`/artists`): search the artists; open one to read the biography and see their works.
- **Exhibitions** (`/exhibitions`): themed shows with dates, venue and the artist behind them.
- Contact details of artists and exhibition budgets are internal and never shown publicly.

### Watching auctions
1. Open **Live auctions** (`/auctions`) to see auctions that are open, scheduled or closed.
2. Open an auction room: you see the current price, the leading bidder (shown as "First L."), the minimum next bid, a countdown and the bid history.
3. Without an account, the bid panel invites you to sign in. Prices still update live.

## Bidder

### Create an account and sign in
1. Click **Sign in**, then **Create a collector account** (`/register`).
2. Enter first name, last name, email, optional phone and a password of at least 8 characters.
3. You are signed in immediately and taken to your account. The SmartSoft administrator receives a notification email.
4. Later, use **Sign in** with your email and password. A session lasts 12 hours by default.

### Place a bid
1. Open an **open** auction room.
2. The bid field starts at the minimum next bid (current price plus the increment; for the first bid, the starting price). Type a higher amount or use a **quick bid** button.
3. Click **Place a bid**, check the amount in the confirmation dialog and click **Confirm bid**. Amounts are in euros and money is for demonstration only.
4. Your bid appears at the top of the history and you become the leading bidder.

### Live updates and being outbid
- The room is connected in real time: when anyone bids, the price, bid count, leader, minimum and countdown update on your screen without reloading. On the auctions list, a small indicator reads "Live updates on" while the connection is active and "Connecting…" while it recovers.
- If someone outbids you, a **"You have been outbid"** notification appears and you can bid again.
- A bid placed in the final minute **extends the auction** by about a minute (soft close), so there is no last-second sniping.
- You cannot outbid yourself while you hold the highest bid, and a bid below the minimum is refused with the exact minimum shown.
- When the auction ends, the highest bidder sees **"You won this auction"**.

### My collection
Open the user menu then **My collection** (`/account`):
- **My bids**: every bid you placed, with the auction status, the current price and whether you are still leading.
- **Won works**: auctions you won.
- **My account** and **Change password**: update your name and phone, or change your password (the current password is required).

Staff accounts cannot bid; use a bidder account.

## Collaborateur

Sign in; you land in the **Studio** (`/studio`).

1. **Overview**: the gradient header shows KPI cards (artists, exhibitions, bids placed, users) with weekly trends; each card links to its section. Below: **Bid activity** shows daily bids as bars and volume as a line, with a 7/14-day switch; **Auctions by status** is a doughnut with counts and shares. Then come recent bids, ending-soon auctions and a ranking of artists with progress bars. Use **Quick actions** to jump straight to a creation form.
2. **Artists** (the specification's *Clients*): search, view the list and open details; click **New artist** and fill name, email (required), phone, address, country, biography and photo URL.
3. **Exhibitions** (*Projets*): view the list and create an exhibition with title, budget, duration in days, description, optional start date, venue, cover image and the artist.
4. **Artworks**: view and create works; set the status (`DRAFT` stays hidden from the public, `PUBLISHED` is visible), the artist and optionally an exhibition of that same artist.
5. **My profile**: update your name and phone, change your password.

What is hidden from you: edit and delete actions, the **Auctions** page and the **Users** page. These are blocked by the server too, so opening their URLs shows an access-denied page.

The sidebar can be collapsed to icons with the panel button in the top bar, or with **Collapse** at the bottom of the sidebar. Your choice is remembered in this browser, and hovering an icon shows its name.

## Administrator

Everything a Collaborateur can do, plus:

### Full CRUD on the catalogue
- In **Artists**, **Exhibitions** and **Artworks**, use the row actions to **edit** or **delete**. Deleting asks for confirmation.
- An artist who still has exhibitions or artworks cannot be deleted; remove or reassign them first (you will see a clear message). If someone else changed the same record, you are asked to reload and retry.

### Auctions
1. Open **Auctions** and click **New auction**.
2. Choose a **published** artwork, a starting price, a minimum increment, and start and end times (the end must be in the future and after the start). A work can have only one scheduled or open auction at a time.
3. The auction becomes **Open** automatically at its start time and **Closed** at its end, when the leading bidder is recorded as the winner.
4. You can **edit** an auction until the first bid arrives, **cancel** a scheduled or open auction at any time, and **delete** an auction that has no bids (auctions with bids can only be cancelled).

### Users and roles
1. Open **Users** to see every account.
2. Use the switch to **enable or disable** an account; a disabled user cannot sign in.
3. Click **Roles** to grant `ADMIN`, `COLLABORATEUR` or `BIDDER` (at least one role is required). This is how a new staff member gets Studio access: they register as a collector, then an administrator adds the Collaborateur role.
4. You cannot remove your own administrator role or disable your own account.

### Profile
**My profile** in the Studio lets you update your name and phone number and change your password. Use **View public site** in the sidebar to see the gallery as visitors do.

## Tips
- Use the search box in the Studio top bar to jump to matching artworks.
- Registration emails during development appear in Mailpit at http://localhost:8025.
- If something fails, the message shown comes from the server (for example, the exact minimum bid). If the page appears stale, reload it.
