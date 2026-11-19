---
title: ATELIER — Cahier des charges
cover: Cahier|des|charges
subtitle: The idea, the users, what the application does, its stack and its deployment
header: Cahier des charges
date: November 2026
cover_image: evidence/screenshots/app/live-home.png
---
ATELIER is a web application for an art gallery: a public site where collectors discover works and bid in live auctions, and a private Studio where the gallery team manages its artists and exhibitions.

# The idea
An art gallery represents artists, organises their exhibitions and sells their works. Today this is often done with spreadsheets, emails and phone calls: the information is scattered, anyone can change anything, and buyers cannot follow a sale remotely.

ATELIER brings all of this into one application with two sides.

```cards
[{"title":"Public gallery","text":"Visitors browse the artworks, the artists and the exhibitions. Collectors create an account and take part in live auctions from their browser."},
 {"title":"Studio","text":"The gallery team manages its clients (the artists), its projects (the exhibitions), the artworks, the auctions, the users and their roles."}]
```

> One place to manage the gallery safely, and one place where collectors can see the works and bid.

### Link with the course specification
The course asks for a "Projects Manager" that manages **clients**, their **projects**, **users** and **roles**. ATELIER applies it to a gallery:

```cols
### Course
- Client
- Projet
- User and Role
- Admin, Collaborateur
---
### ATELIER
- Artist (shown as "Clients")
- Exhibition (shown as "Projets")
- User and Role
- Admin, Collaborateur, plus Bidder for the auctions
```

![Home page — The public site as visitors see it.](evidence/screenshots/app/live-home.png "browser:/")

# Who uses it
Four kinds of people use ATELIER. Each one sees only what their role allows.

```cards
[{"title":"Visitor","text":"Anyone on the internet. Browses the artworks, artists, exhibitions and auctions. Can create an account."},
 {"title":"Bidder","text":"A collector with an account. Places bids, follows auctions live and sees the bids and wins on the account page."},
 {"title":"Collaborateur","text":"A member of the gallery team. Views and adds artists, exhibitions and artworks. Cannot change or delete them."},
 {"title":"Admin","text":"The gallery manager. Does everything: changes and deletes records, runs auctions, manages users and roles."}]
```

### What each role can do

| Action | Visitor | Bidder | Collaborateur | Admin |
| --- | --- | --- | --- | --- |
| Browse the gallery and auctions | yes | yes | yes | yes |
| Place a bid | | yes | | |
| View and add artists and exhibitions | | | yes | yes |
| Edit and delete artists and exhibitions | | | | yes |
| Manage auctions, users and roles | | | | yes |

```dot
digraph {
  rankdir=LR; nodesep=0.25; ranksep=0.8;
  node[shape=box,style="rounded,filled"];
  V[label="Visitor"]; B[label="Bidder"]; C[label="Collaborateur"]; A[label="Admin"];
  pub[label="Public gallery",fillcolor="#dfe6ef"]; bid[label="Live auctions",fillcolor="#dfe6ef"]; studio[label="Studio\n(view and add)",fillcolor="#f4edde"]; admin[label="Studio\n(edit, delete, users, roles)",fillcolor="#f4edde"];
  V -> pub; B -> pub; B -> bid; C -> studio; A -> studio; A -> admin;
}
```

# What the application does
### On the public site
- Shows the catalogue of artworks with their artist, year and medium.
- Presents each artist and their exhibitions.
- Lists the auctions: upcoming, open and closed.
- Lets a visitor register; the gallery receives an email for each new account.
- Lets a bidder place a bid. Every open browser sees the new price immediately.
- Closes each auction automatically at its end time and announces the winner by email.

![Auction room — The price and the history change as soon as someone bids.](evidence/screenshots/app/local-auction-after.png "browser:/auctions")

### In the Studio
- A dashboard with the key figures of the gallery.
- Lists with search and pages for artists, exhibitions, artworks and auctions.
- Forms to add and change records, with clear error messages.
- User management: create accounts, give one or more roles, disable an account.
- Role management: create named roles, each linked to a permission level.

![Studio dashboard — Key figures, bid activity, auctions by status and quick actions.](evidence/screenshots/app/local-studio-overview.png "browser:/studio")

### Rules the application protects
- An exhibition always belongs to one artist. An artist who still has exhibitions cannot be deleted.
- A bid must be higher than the current price plus the minimum step.
- When two people bid at the same moment, only one bid wins; the other is told the new minimum.
- If two staff members change the same record, the second one is asked to reload instead of erasing the first change.

# The data
The application stores eight kinds of information. The two links required by the course are highlighted: a user can have several roles, and an artist can have several exhibitions.

```dot
digraph {
  rankdir=TB; nodesep=0.45; ranksep=0.5;
  node[shape=box,style="rounded,filled"];
  user[label="User"]; role[label="Role"]; artist[label="Artist\n(Client)",fillcolor="#dfe6ef"]; exh[label="Exhibition\n(Projet)",fillcolor="#dfe6ef"];
  art[label="Artwork"]; auc[label="Auction"]; bid[label="Bid"];
  user -> role [label="many to many",penwidth=1.6,color="#e7b84b"];
  artist -> exh [label="one to many",penwidth=1.6,color="#e7b84b"];
  artist -> art [label="one to many"]; exh -> art [label="shows",style=dashed];
  art -> auc [label="is sold in"]; auc -> bid [label="receives"]; user -> bid [label="places"];
}
```

```stats
[{"value":"8","label":"Tables"},{"value":"13","label":"Links between tables"},{"value":"4","label":"User roles"},{"value":"4","label":"Auction states: scheduled, open, closed, cancelled"}]
```

# The technology stack
ATELIER is built with the technologies required by the course.

```cards
[{"title":"Angular 22","text":"The interface that runs in the browser: the public site and the Studio."},
 {"title":"Spring Boot 3.5","text":"The server in Java 17: the API, security, auctions, emails and the automatic closing of auctions."},
 {"title":"MySQL 8.4","text":"The database that keeps every artist, exhibition, artwork, auction, bid and user."},
 {"title":"JWT","text":"The signed token that proves who is logged in on every request."},
 {"title":"WebSocket","text":"The live connection that pushes each new bid to every open browser."},
 {"title":"SMTP","text":"The email service used for welcome messages, bids and auction results."},
 {"title":"Docker","text":"Packages the application and the database so they run the same everywhere."},
 {"title":"Postman","text":"The collection that tests every API request and every permission."}]
```

```dot
digraph {
  rankdir=LR; nodesep=0.3;
  b[label="Browser\nAngular"]; s[label="Spring Boot\n(psm.jar)"]; d[label="MySQL",shape=cylinder]; m[label="Mail server"];
  b -> s [label="requests (HTTPS)"]; s -> b [label="live bids (WebSocket)",style=dashed]; s -> d [label="reads and writes"]; s -> m [label="emails"];
}
```

# Deployment
The whole application is delivered as one file, `psm.jar`, which contains both the server and the Angular interface. It runs on a virtual server in the cloud.

```dot
digraph {
  rankdir=LR; nodesep=0.3;
  u[label="Visitor"]; cf[label="Cloudflare\n(secure HTTPS address)"];
  subgraph cluster_a { label="AWS EC2 server (Ubuntu, Docker)"; style="dashed"; color="#5b6678"; fontname="Helvetica";
    app[label="Application\npsm.jar"]; db[label="Database\nMySQL",shape=cylinder]; }
  u -> cf -> app -> db;
}
```

| Step | What is done |
| --- | --- |
| 1 | Build `psm.jar` with Angular inside it (course step 11) |
| 2 | Create a cloud server on AWS EC2 and install Docker |
| 3 | Start the database and restore the gallery data |
| 4 | Start the application and check that it answers |
| 5 | Open a secure public address through Cloudflare (course step 12) |

```note
Result
The application is online on AWS. The public pages, the login, the Studio and the API were checked on the live server on 19 November 2026.
```

# Expected deliverables
| Deliverable | Form |
| --- | --- |
| Source code of the server and the interface | Git repository and zip files |
| The executable application | `psm.jar` |
| API tests | Postman collection |
| Online application | AWS server with a public HTTPS address |
| Documents | This cahier des charges, the compte rendu, the study guide and the demo script |
