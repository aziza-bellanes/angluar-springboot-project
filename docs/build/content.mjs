import fs from 'node:fs';
const verification = JSON.parse(fs.readFileSync(new URL('../evidence/verification.json', import.meta.url)));
const unit=verification.surefire.totals.tests, integration=verification.failsafe.totals.tests, frontend=verification.frontend.tests, frontendFiles=verification.frontend.files, requests=verification.newman.requests.total, assertions=verification.newman.assertions.total;
const securityCases=verification.failsafe.suites.find(s=>s.name.endsWith('.SecurityMatrixIT')).tests;
const p = text => `<p>${text}</p>`;
const h = text => `<h3>${text}</h3>`;
const list = items => `<ol class="steps">${items.map(t => `<li>${t}</li>`).join('')}</ol>`;
const table = (heads, rows) => `<table class="data"><thead><tr>${heads.map(t => `<th>${t}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(t => `<td>${t}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const image = (name, caption) => `<figure><img src="../evidence/screenshots/${name}.png" alt="${caption}"><figcaption>${caption}. Captured from the tested production image on 18 November 2026.</figcaption></figure>`;
const code = text => `<pre>${text}</pre>`;
const page = (title, html, source) => ({ title, html, source });
const roles = table(['Action', 'Admin', 'Collaborateur', 'Bidder'], [
  ['View and add Clients and Projets', 'Yes', 'Yes', 'No'],
  ['Update and delete Clients and Projets', 'Yes', 'No', 'No'],
  ['Manage users, roles and auctions', 'Yes', 'No', 'No'],
  ['Place bids', 'With BIDDER role', 'With BIDDER role', 'Yes'],
  ['Browse published public catalogue', 'Yes', 'Yes', 'Yes'],
]);
const accountTable = table(['Generic demo role', 'Example email', 'Demo password'], [
  ['Admin', 'admin@atelier.local', 'Admin123!'], ['Collaborateur', 'curator@atelier.demo', 'Atelier2026!'],
  ['Bidder', 'collector@atelier.demo', 'Atelier2026!'], ['Second bidder', 'patron@atelier.demo', 'Atelier2026!'],
]);
const tools = table(['Tool', 'Purpose in this application'], [
  ['Angular 22 and TypeScript', 'Build the browser screens, navigation and forms. Signals hold UI state.'],
  ['Spring Boot 3.5 and Java 17', 'Expose REST endpoints, validate actions, apply authorization and manage transactions.'],
  ['Spring Data JPA and Hibernate', 'Map Java entities to MySQL rows and query them through repositories.'],
  ['MySQL 8.4 and Flyway', 'Store durable data and apply the versioned V1, V2 and V3 schema migrations.'],
  ['Spring Security and JWT', 'Authenticate each API call and enforce the role matrix on the server.'],
  ['STOMP over WebSocket', 'Push committed auction changes to browsers that subscribed to the auction topic.'],
  ['Docker and Compose', 'Build and run matching application, database and mail environments.'],
  ['JUnit, Testcontainers, Vitest and Newman', 'Check domain rules, real database behavior, frontend logic and API scenarios.'],
]);

export const guide = [
  page('The project in plain words',
    p('ATELIER is a SmartSoft Solutions gallery with an internal Studio for managing clients and their projects. In the gallery vocabulary, a <strong>Client is an Artist</strong> and a <strong>Projet is an Exhibition</strong>. The Studio implements the Projects Manager coursework. The public gallery and live auctions extend that foundation.') +
    h('What this guide helps you do') + p('Start the application, understand its tools, use each role and explain how a browser action reaches the database. Read the separate project report for implementation and verification evidence, and the database document for the complete schema.') +
    table(['Course term', 'Screen or model', 'Example'], [['User', 'User account', 'A curator signs into the Studio'], ['Role', 'Named role and permission profile', 'An admin may delete a client'], ['Client', 'Artist', 'The gallery manages an artist'], ['Projet', 'Exhibition', 'An exhibition has a budget, duration and one artist']]) +
    h('Delivery status') + p('The local application, automated suites and production container have been tested. The VPS deployment kit is ready, but a live VPS deployment has not been verified. The rebuilt Argon-inspired Studio is a documented adaptation. Administrators manage named roles through full CRUD.'),
    'README.md · CDC_EQUIVALENCE.md · CDC_AUDIT.md'),
  page('The tools and their jobs', tools +
    h('The browser and server have different responsibilities') + p('Angular makes forms convenient and hides unavailable actions. Spring Security makes the final authorization decision. A hidden button is helpful feedback, while the API still refuses an unauthorized request sent outside the browser.') +
    h('The database keeps the relationships consistent') + p('A foreign key makes a project point to an existing client. A transaction keeps related changes together. A migration records how to create the schema so the team runs the same structure.'),
    'backend/pom.xml · frontend/package.json · ARCHITECTURE.md'),
  page('Starting the application',
    p('Use the repository root, where <code>compose.yaml</code> lives. Docker Engine with the Compose plugin is the only prerequisite for the complete development stack.') +
    code('cp .env.example .env\ndocker compose up') +
    table(['Service', 'Development address'], [['Angular application', 'http://localhost:4200'], ['REST API', 'http://localhost:8080/api'], ['Mailpit inbox', 'http://localhost:8025'], ['MySQL', 'localhost:3306']]) +
    p('The first run downloads images and dependencies. Wait for the backend to start and Angular to finish compiling. Demo data loads because the development stack sets <code>DEMO_DATA=true</code>. Keep the MySQL volume to retain your work between restarts.') +
    h('If port 8080 is already occupied') + p('Free that port or adjust the Compose mapping and the frontend proxy together. The audit used a separate production container at <code>http://127.0.0.1:18081</code> and Mailpit at <code>http://127.0.0.1:18025</code>. Those audit addresses are separate from the development defaults above.') +
    h('Stopping and restarting') + code('docker compose stop\ndocker compose start\ndocker compose logs -f backend') +
    p('Use <code>docker compose down</code> to remove the containers while retaining named volumes. The <code>-v</code> option deletes stored data and is unnecessary for an ordinary restart.'),
    'compose.yaml · .env.example · DEVELOPMENT.md'),
  page('Accounts and permissions',
    p('These are generic seeded demo accounts and the template bootstrap administrator, not the credentials of an actual local or deployed instance. Demo users require DEMO_DATA=true; the administrator follows private bootstrap settings. Replace demonstration passwords before public deployment.') + accountTable + roles +
    h('A user can hold several roles') + p('The Users form accepts multiple selections. The database stores each selection as a row in <code>user_roles</code>. A staff account needs the extra BIDDER role to place a bid. Public registration creates a BIDDER account, while an administrator creates staff accounts.'),
    'user/User.java · config/SecurityConfig.java · .env.example'),
  page('Browsing as a visitor',
    list(['Open <code>/artworks</code> to browse the published catalogue. Search and filters narrow the works displayed.', 'Open a work to see its artist, image and details. Artist and exhibition links connect the public pages.', 'Open <code>/auctions</code> and choose an auction. Visitors can follow the price and masked history.', 'Sign in to bid. Visiting <code>/studio</code> while signed out redirects to the login screen.']) +
    image('gallery', 'Public artwork gallery') +
    p('Public responses hide the artist’s email, phone and address, and the exhibition’s internal budget. Draft works stay outside the public catalogue. The original homepage animation has a calmer reduced-motion mode.'),
    'CatalogFlowIT.java · frontend/src/app/features/gallery'),
  page('Creating a Client in the Studio',
    list(['Sign in as the administrator or Collaborateur.', 'Choose <strong>Artists</strong> in the sidebar. Its Clients caption identifies the CDC resource.', 'Choose <strong>New artist</strong>. Enter the required name and email. Add phone, country, address and biography if useful.', 'Choose <strong>Create artist</strong>. Search the list to find the stored record.']) +
    image('artist-form', 'Client creation form using the Artist vocabulary') +
    p('Required and invalid fields produce inline messages. Contact details remain inside the Studio. An administrator can edit or delete records. A Collaborateur can view and add them.'),
    'frontend/src/app/features/studio/artists · artist/StudioArtistController.java'),
  page('Creating a Projet for a Client',
    list(['Choose <strong>Exhibitions</strong> in the sidebar. This is the Projets resource.', 'Choose <strong>New exhibition</strong> and enter a title.', 'Select an existing artist, then enter a non-negative budget and a positive duration in days.', 'Save and search the exhibition list. The artist name confirms the stored relationship.']) +
    image('studio-exhibitions', 'Projet list with its Client and internal budget') +
    p('One exhibition belongs to exactly one artist. Several exhibitions can share that artist. Delete the exhibitions or reassign them before deleting their artist, because MySQL prevents an orphan project. Deleting an exhibition keeps its artworks and clears their optional exhibition link.'),
    'exhibition/Exhibition.java · V1__core_schema.sql · V2__artworks_auctions_bids.sql'),
  page('Managing users and Collaborateur access',
    p('Only an administrator can open Users. Choose New user to create an account, or use the row actions to edit or delete it. Select at least one role. On edit, leaving the password empty keeps the current password. Disabling an account prevents login.') +
    image('studio-users', 'Administrator user management') +
    h('Account protections') + p('The administrator cannot delete their own account, disable themselves or remove their own ADMIN role. A user with bids or auction activity cannot be deleted. User forms load named roles and permission profiles from the editable API catalogue.') +
    h('Collaborateur experience') + p('A Collaborateur sees catalogue pages and creation actions. Edit and delete buttons, Users, Roles and Auctions administration remain unavailable. A direct URL to an admin-only page shows access denied, and the server returns 403 for a forbidden API action.'),
    'AdminUserIT.java · SecurityMatrixIT.java · frontend/src/app/features/studio/users'),
  page('Following and placing bids',
    list(['Sign in as a demo collector and open an OPEN auction.', 'Read the current price, minimum next bid and remaining time.', 'Enter a valid amount or use a quick increment, then confirm the bid.', 'Observe the price and history. In another browser, a second collector receives the committed update without reloading.']) +
    image('auction-live', 'Auction room after a bid from another account') +
    p('The server refuses a bid below the minimum and prevents the leading bidder from outbidding themselves. Near the end, a valid late bid extends the closing time. The scheduler closes an expired auction and records its winner. The demo uses demonstration money. The application does not implement payment or settlement.'),
    'auction/Auction.java · auction/BidService.java · account/AccountController.java'),
  page('One action from form to database',
    h('Example creating an exhibition') +
    list(['Angular validates the form. The auth interceptor adds the stored bearer token to the API request.', 'Spring Security validates the JWT, loads the account and checks whether the role permits POST on the Studio resource.', 'The controller validates the payload. The service loads the selected artist and creates an Exhibition within a transaction.', 'JPA inserts the row. MySQL checks the mandatory artist foreign key, budget and duration constraints.', 'The API returns the saved resource. Angular refreshes the list so the new project appears.']) +
    code('POST /api/studio/exhibitions\nAuthorization: Bearer &lt;token&gt;\n\n{\n  "title": "Autumn exhibition",\n  "artistId": 1,\n  "budget": 12500.00,\n  "durationDays": 30\n}') +
    h('How registration email differs') + p('Registration commits before a listener sends welcome and administrator emails. Enabled admin-created accounts also receive welcomes. Artist contact, bid, outbid and auction-result notices follow committed changes. SMTP failures are logged; Mailpit captures local mail.'),
    'auth.interceptor.ts · SecurityConfig.java · ExhibitionService.java · RegistrationMailListener.java'),
  page('Managing roles and permission profiles',
    image('studio-roles', 'Administrator role catalogue with permission profiles and assignment counts') +
    list(['Open Studio / Roles as ADMIN and choose New role.', 'Enter a unique name up to 32 characters and choose ADMIN, COLLABORATEUR or BIDDER as the permission profile.', 'Save, then select the named role in Users. The list loads from the API.', 'Rename roles at any time. Unassign a custom role from every user before changing its profile or deleting it.']) +
    p('The three required system roles keep their profile and cannot be deleted. Their labels remain editable. Security checks the permission profile, so a renamed label never grants different authority.'),
    'API.md · user/RoleService.java · frontend/features/studio/roles'),
  page('Understanding the database graph',
    p('The required model has four business entities. The physical database adds a join table for user roles. The complete database document covers the artwork, auction and bid extensions as well.') +
    `<figure class="diagram"><img src="../diagrams/cdc-overview.svg" alt="Core database relationships"><figcaption>Core CDC schema generated from the Flyway SQL.</figcaption></figure>` +
    table(['Relationship', 'Meaning'], [['Many-to-many', 'One user can hold several roles, and many users can share a role. user_roles connects the two tables.'], ['One-to-many', 'One artist may have zero or many exhibitions. Artist.exhibitions is the inverse JPA collection.'], ['Many-to-one', 'Each exhibition stores exactly one artist_id. Exhibition.artist owns the association.'], ['One-to-one', 'No such relationship is required by the CDC or enforced in this schema.']]) +
    p('The graph uses 0..* for a collection that can initially be empty. The coursework’s “one or several projects” describes the business association. Creating a new client before its first project remains possible.'),
    'DATABASE.md · database.pdf · DatabaseRelationshipsIT.java'),
  page('Checks and troubleshooting',
    code('cd backend\n./mvnw -B verify\n\ncd ../frontend\nnpm ci\nnpm test\nnpm run build') +
    table(['Symptom', 'What to check'], [['401 response', 'Sign in again. Check expiry, JWT configuration and the account status.'], ['403 response', 'The account lacks the required role. A Collaborateur cannot update or delete.'], ['409 when deleting an artist', 'Remove or reassign exhibitions and artworks that still reference it.'], ['No email', 'Check Mailpit or provider SMTP settings, MAIL_FROM, ADMIN_EMAIL and PUBLIC_URL.'], ['No live bid update', 'Check WebSocket connection and the /ws upgrade configuration in Nginx.'], ['Build download fails', 'Check network access to Maven Central or npm. CI retries Maven bootstrap downloads.']]) +
    h('Verified on 18 November 2026') + p(`${unit} backend unit tests, ${integration} MySQL integration tests and ${frontend} frontend tests passed. Newman passed ${requests} requests and ${assertions} assertions. The production image built successfully. Browser checks additionally cover forms, role restrictions, real-time delivery and mobile layouts.`) +
    h('Deployment still needs an actual VPS') + p('Read DEPLOYMENT.md. Development uses .env; production uses private .env.prod. Transfer secrets over SSH and restore a MySQL backup to retain accounts. Deploy the same version, set PUBLIC_URL, SMTP, DNS and TLS, then record remote checks. A deployment kit does not prove step 12.'),
    'TEST_PLAN.md · evidence/verification.json · evidence/browser-checks.json · DEPLOYMENT.md'),
  page('A short demonstration and revision guide',
    h('Suggested demonstration') + list(['Explain Client = Artist and Projet = Exhibition before opening the Studio.', 'Sign in as Admin. Create an artist, create an exhibition for it and show its budget and duration.', 'Use the Collaborateur account to show creation access and unavailable edit/delete actions.', 'Create and rename a custom role, assign it in Users and explain user_roles.', 'Open an auction in two browsers and place a bid to demonstrate live updates.', 'Finish with the database graph, test evidence and the remaining VPS deployment step.']) +
    h('Questions to prepare') + table(['Question', 'Answer'], [['Why a join table?', 'A foreign key in users would allow only one role. user_roles stores several roles and shares roles between users.'], ['Why guard and server authorization?', 'The guard guides navigation. Server authorization protects every request.'], ['Why DTOs?', 'They validate inputs and keep private fields out of public responses.'], ['Why a row lock for bids?', 'Competing transactions must read and update one auction in a consistent order.'], ['Why Flyway?', 'Versioned migrations give the team a repeatable, reviewable schema.'], ['Is the CDC fully finished?', 'Core functionality is verified with adaptations. Live VPS deployment still needs proof.']]) +
    p('For exact API routes, use API.md and the Postman collection. For technical implementation, use the project report. For every stored column and foreign key, use database.pdf.'),
    'API.md · ARCHITECTURE.md · CDC_AUDIT.md'),
];

export const report = [
  page('Project scope and assessment',
    p('ATELIER implements the Projects Manager coursework as an art gallery with a management Studio. SmartSoft Solutions manages Artists as Clients and Exhibitions as Projets. Angular provides the user interface, Spring Boot provides the API and business rules, and MySQL stores the model.') +
    p('The audit on 18 November 2026 verifies the application locally and in a Java 17 production container. The backend, frontend and API suites pass. The core relationships exist in both JPA and SQL and now have explicit flush-and-reload integration tests.') +
    table(['Area', 'Assessment'], [['Core Client and Projet CRUD', 'Implemented and verified'], ['User management and role permissions', 'Implemented and verified'], ['JWT, guards, interceptor and registration email', 'Implemented and verified'], ['Combined psm.jar and Angular production image', 'Built and exercised locally'], ['Vocabulary and Argon layout', 'Documented adaptations'], ['Live VPS deployment', 'Deployed on AWS EC2 and verified remotely']]) +
    p('This report does not equate a deployment script with a deployed server. The remaining infrastructure step prevents a claim of complete CDC delivery. The separate audit identifies each requirement and its supporting source.'),
    'CDC_AUDIT.md · evidence/verification.json'),
  page('Requirements and vocabulary',
    p('The supplied CDC defines User, Role, Client and Projet, an Admin with full Client/Projet CRUD, and a Collaborateur who may only read and create them. It requests Spring Boot, Angular, JWT, a registration email, API testing, a combined psm.jar and VPS deployment.') +
    table(['CDC concept', 'ATELIER implementation', 'Retained data'], [['User', 'users / User', 'ID, email, BCrypt password, phone, last and first names'], ['Role', 'roles / Role', 'ID, editable libelle, permission profile and system key'], ['Client', 'artists / Artist', 'ID, name, phone, email and address'], ['Projet', 'exhibitions / Exhibition', 'ID, title, budget, durationDays, description and artist_id']]) +
    h('Adaptations that affect assessment') + p('The gallery adds BIDDER alongside ADMIN and COLLABORATEUR. Public registration creates that collector role. Administrators create, read, update and delete named roles, then assign them to users by catalogue ID. Each role has one stable permission profile. Required system roles cannot be deleted or change profile. Assigned custom roles must be unassigned before deletion or profile changes.') +
    p('The Studio follows the Argon Dashboard structure with custom Angular 22 components. It uses an original ATELIER palette rather than copying the old template source. The Client and Projet captions keep the coursework mapping visible.'),
    'Supplied CDC pages 1–3 · CDC_EQUIVALENCE.md · user/RoleName.java'),
  page('Spring requirements',
    table(['CDC step', 'Implementation', 'Evidence'], [['1', 'Web, Data JPA, DevTools and MySQL dependencies', 'backend/pom.xml'], ['2', 'Client/Projet/User/Role CRUD behind layered controller, service and repository code', 'Studio controllers, AdminRoleIT, AdminUserIT, CatalogFlowIT'], ['3', 'Runnable Postman collection with chained assertions', `${requests} requests and ${assertions} assertions passed`], ['4', 'Stateless JWT security and BCrypt passwords', 'SecurityMatrixIT and AuthIT'], ['5', 'Registration email to the administrator after transaction commit', 'AuthIT and captured Mailpit message'], ['6', 'Login and registration validation, duplicates and disabled accounts', '10 AuthIT tests passed'], ['7', 'Protected Client/Projet resources for every role', `${securityCases} authorization matrix cases plus catalogue flows`]]) +
    h('Historical implementation order') + p('The final delivery secures CRUD. A test run against this secured revision proves the resulting behavior, not that an earlier unsecured development phase was demonstrated. The CDC audit treats that distinction explicitly.') +
    h('Validation and errors') + p('DTO constraints reject invalid fields before persistence. Domain conflicts return 409 with stable error codes, while unauthorized and forbidden calls return 401 and 403. Public DTOs omit internal contact information and project budgets.'),
    'backend/pom.xml · AuthIT.java · SecurityMatrixIT.java · CatalogFlowIT.java'),
  page('Angular and packaging requirements',
    table(['CDC step', 'Result', 'Evidence or limit'], [['8', 'Clients, Projets and Users components with Studio navigation', 'Rebuilt Argon-inspired dashboard and CRUD pages'], ['9', 'Authentication/role guards and API interceptor', 'Frontend unit tests and browser redirects'], ['10', 'Role-aware navigation and actions', 'Collaborateur creation allowed, edit/delete hidden, API restrictions tested'], ['11', 'psm.jar containing Angular static assets', 'Production Docker image built and served SPA, API and deep links'], ['12', 'VPS deployment kit', 'Deployed on AWS EC2 with Docker Compose behind a Cloudflare tunnel; remote checks in vps-smoke.json.']]) +
    p('Angular uses standalone components, signals and lazy feature routes. The auth store keeps the session, guards decide navigation, and the interceptor attaches a bearer token to API calls. Form and HTTP errors appear within the relevant page.') +
    h('One production artifact') + p('The Dockerfile compiles Angular in a Node stage, copies its browser distribution into the backend static resources and builds psm.jar. The runtime stage contains Java 17 and runs the application as the atelier user. Spring serves both the API and the single-page application.') +
    code('docker build -t smartsoft/atelier:local .\n# Alternate local packaging path\ncd backend\n./mvnw -Pwith-frontend -DskipTests package'),
    'Dockerfile · backend/pom.xml · frontend/src/app/core/auth · deployment/'),
  page('System architecture',
    table(['Layer', 'Main responsibilities', 'Interfaces'], [['Browser', 'Public gallery, auction rooms, Studio forms and role-aware navigation', 'Angular routes, REST requests and STOMP subscriptions'], ['Spring Boot', 'Authentication, authorization, validation, domain rules and transactions', '/api/**, /ws, health endpoints and static resources'], ['MySQL', 'Persist catalogue, users, role assignments, auctions and bids', 'JPA repositories and Flyway migrations'], ['Mail service', 'Deliver account, contact, bid and auction notices after commit', 'SMTP, caught locally by Mailpit'], ['VPS edge', 'Terminate HTTPS and proxy HTTP/WebSocket traffic', 'Cloudflare tunnel (HTTPS), verified on 19 November 2026']]) +
    h('Backend structure') + p('Packages group code by feature: auth, user, account, artist, exhibition, artwork, auction and studio. Controllers accept DTOs, services enforce business rules, and repositories load and persist entities. Shared exception handling creates consistent ProblemDetail responses.') +
    h('Data ownership') + p('Flyway owns the schema through V1, V2 and V3 SQL migrations. Hibernate validates the schema at startup rather than inventing it. This makes foreign keys, constraints and application mappings reviewable together.') +
    h('Development and production') + p('Development serves Angular on port 4200 and proxies API and WebSocket traffic to port 8080. Production combines the frontend and backend in psm.jar. A production VPS adds Nginx, TLS and durable database storage.'),
    'ARCHITECTURE.md · compose.yaml · Dockerfile · deployment/nginx/atelier.conf'),
  page('Core data model and cardinalities',
    `<figure class="diagram"><img src="../diagrams/cdc-overview.svg" alt="CDC relational model"><figcaption>CDC model generated from the versioned schema. Each project requires one client.</figcaption></figure>` +
    p('<strong>User–Role is many-to-many.</strong> user_roles stores a composite key of user_id and role_id. One user can select several roles and a role can be reused by many users. User.roles declares @ManyToMany.') +
    p('<strong>Artist–Exhibition is one-to-many and many-to-one.</strong> Artist.exhibitions declares the inverse @OneToMany collection. Exhibition.artist owns the mandatory @ManyToOne association and the non-null artist_id column.') +
    p('The database allows a newly created artist to have no exhibitions. Each saved exhibition has exactly one artist. No one-to-one relationship is required by the supplied CDC, and the schema does not declare one.') +
    h('Persistence evidence') + p('DatabaseRelationshipsIT flushes and clears the persistence context before reloading a user with two roles, two users sharing a role and two exhibitions sharing an artist. This checks stored relationships rather than only inspecting annotations.'),
    'V1__core_schema.sql · User.java · Artist.java · Exhibition.java · DatabaseRelationshipsIT.java'),
  page('Extended database and integrity',
    table(['Association', 'Cardinality and meaning'], [['Artist / Artwork', 'Each artwork has one artist. An artist may have many works.'], ['Exhibition / Artwork', 'A work may have no exhibition or one exhibition. An exhibition may contain many works.'], ['Artwork / Auction', 'Each auction has one work. A work may have many historical auctions.'], ['Auction / Bid', 'An auction may have many bids. Each bid belongs to one auction.'], ['User / Bid', 'A user may place many bids. Each bid requires one bidder.'], ['User / Auction leader or winner', 'Each auction may have one optional leader and one optional winner.'], ['User / Catalogue creator', 'Artist, Exhibition and Artwork have an optional created_by_id audit reference.']]) +
    h('Important database rules') + p('Money uses DECIMAL(14,2) and BigDecimal. Unique keys protect email, role labels and system keys, artwork slugs and each auction/amount bid pair. CHECK constraints protect project duration and budget and auction prices and time windows.') +
    p('The schema contains 8 application tables and 13 foreign keys. Deletion either preserves references through RESTRICT, removes dependent rows through CASCADE or clears optional audit/exhibition links through SET NULL. The database document lists every field, default, constraint and index.') +
    h('Database rule versus service rule') + p('auctions.artwork_id is not unique. A service rule prevents a second live auction for the same work while still allowing its historical auctions. This relationship must not be drawn as one-to-one.'),
    'DATABASE.md · database.pdf · V2__artworks_auctions_bids.sql · AuctionService.java'),
  page('Security and data visibility',
    roles +
    h('Authentication') + p('Login issues an HS256 JWT with an expiration time. Each protected request supplies it in the Authorization header. The JWT filter authenticates the account and Spring Security applies the first matching authorization rule. BCrypt protects stored passwords.') +
    h('User protections') + p('User administration validates role selection, email uniqueness and password rules. The administrator cannot delete their own account or disable/remove their own ADMIN access. Accounts with auction activity cannot be deleted.') +
    h('Public projections') + p('Public artist data omits phone, email and address. Public exhibition data omits the internal budget. Draft artworks remain unavailable. Integration tests check that private fields are absent from public responses.') +
    h('WebSocket boundary') + p('Anonymous clients may follow public auction topics. STOMP SEND is refused, so all bids pass through the validated REST endpoint. An invalid supplied token is rejected. Subscription destinations are restricted to auction topics.'),
    'SecurityConfig.java · StompAuthChannelInterceptor.java · CatalogFlowIT.java'),
  page('Role CRUD and dynamic user assignment',
    image('role-form', 'Role form with an editable name and explicit permission profile') +
    p('The ADMIN-only role API supports list, detail, create, update and delete. Role.libelle is an editable unique string. Role.profile stores one of ADMIN, COLLABORATEUR or BIDDER. The nullable unique system_key identifies required roles independently from their labels. V3 preserves existing role IDs and assignments.') +
    h('Integrity safeguards') + p('System roles cannot be deleted or change profile. Assigned custom roles cannot be deleted or change profile until unassigned. Renaming remains allowed. These checks preserve the authority of existing accounts.') +
    h('Assignment contract') + p('User requests select actual catalogue IDs through roleIds. Responses retain effective roles profiles for JWT and guards, and expose roleIds for editing. Legacy profile arrays remain compatible. The Users screen loads names and profile hints from the API.'),
    'V3__dynamic_roles.sql · RoleService.java · AdminRoleIT.java · RoleMigrationIT.java'),
  page('Registration and email notifications',
    list(['The registration controller validates the submitted name, email and password.', 'AuthService checks email uniqueness, encodes the password and assigns BIDDER.', 'The transaction saves the account and publishes UserRegisteredEvent.', 'An asynchronous AFTER_COMMIT listener sends a welcome and ADMIN_EMAIL notice.', 'The response signs the user in. Mailpit captures local HTML and plain-text mail.']) +
    h('Behavior during an SMTP outage') + p('Failures are isolated and logged without undoing the transaction. There is no persistent retry queue. Enabled admin-created accounts and artist contacts receive welcomes; contacts do not gain a login. Bids trigger confirmation/outbid notices; closure and cancellation trigger result notices.') +
    h('Local evidence') + p('A Java 17 production-image smoke check captured 17 HTML/plain-text messages in isolated Mailpit across account, artist contact, bid, outbid, winner, no-bid and cancellation flows. It checked PUBLIC_URL, branding and absent passwords; no duplicate winner mail was observed.') +
    h('Production boundary') + p('Gmail accepted five controlled welcome, bid, winner and administrator messages over authenticated STARTTLS. External inbox placement was not independently read back. Configure SMTP_AUTH, SMTP_TLS, MAIL_FROM, ADMIN_EMAIL and PUBLIC_URL privately. See EMAIL.md.'),
    'EMAIL.md · evidence/email-smoke.json · evidence/email-provider.json'),
  page('Live auctions and transaction safety',
    p('The auction extension adds timed bidding on published works. Scheduled auctions open when their start arrives. Open auctions close after their end, and the current leader becomes the winner. A valid late bid extends the closing time by the configured soft-close window.') +
    list(['The REST endpoint checks the BIDDER role and validates the amount.', 'BidService loads the auction with a pessimistic write lock.', 'Auction.placeBid synchronizes its state and checks the minimum amount and leading bidder.', 'The transaction inserts the bid and updates price, leader and bid count.', 'Only after commit does AuctionBroadcaster publish the event to subscribed browsers.']) +
    h('Concurrent requests') + p('ConcurrentBiddingIT sends competing bids for the same amount on parallel threads. Exactly one request succeeds and the stored bid count, bid row and price stay consistent. The unique auction/amount key provides an additional integrity constraint.') +
    h('Browser evidence') + p('A signed-in auction room subscribes over STOMP. A bid from another account updates the displayed bid count without reloading. This separately checks delivery through the real production container’s WebSocket endpoint.') +
    p('The platform demonstrates auction logic and live communication. It does not include payment processing or a settlement workflow.'),
    'BidService.java · Auction.java · ConcurrentBiddingIT.java · evidence/browser-checks.json'),
  page('The management interface',
    image('studio-overview', 'Studio dashboard with metrics and activity charts') +
    p('The Studio combines an Argon-inspired gradient header, KPI cards, charts, ranking tables and a collapsible sidebar. Artist, Exhibition, Artwork, Auction, User and Role pages share table, form-sheet and confirmation-dialog components.') +
    h('Role behavior in the interface') + p('Administrators have edit and delete actions. Collaborateurs see creation actions and catalogue pages. Angular guards redirect direct access to restricted routes, and the backend enforces the same permissions for API requests.') +
    h('Visual direction') + p('The document set follows the structure of the BigDataZaaa report workflow and uses the application palette: midnight #101d35, cobalt #315c91, sunflower #e7b84b and ivory #f4edde.'),
    'frontend/src/app/features/studio · frontend/src/styles.css'),
  page('Verification results',
    table(['Check', 'Result on 18 November 2026', 'Evidence'], [['Backend domain tests', `${unit} passed, no skips`, 'Surefire XML summary'], ['Backend MySQL integration tests', `${integration} passed, no skips`, 'Failsafe XML summary'], ['Frontend tests', `${frontend} passed across ${frontendFiles} files`, 'Vitest summary'], ['Newman API scenarios', `${requests} requests, ${assertions} assertions, zero failures`, 'Newman summary'], ['Angular production build', 'Passed', 'frontend-build-summary.txt'], ['Production Docker image', 'Built and ran with Java 17', 'docker-build-summary.txt'], ['Browser flows', 'Admin CRUD, roles, live delivery and mobile checks', 'browser-checks.json']]) +
    h('Scope of the tests') + p('Integration tests cover real MySQL migrations, authorization, registration email, user CRUD, catalogue projections, profile changes, auction lifecycle and competing bids. The new relationship tests specifically verify the required many-to-many and one-to-many mappings after reloading from storage.') +
    h('Environment') + p('Local Maven verification used Java 21.0.2 while compiling to release 17. The production Docker image uses Java 17. GitHub Actions also runs the backend on Java 17. Frontend builds use Node 22.23.2 and the schema tests use MySQL 8.4.13.') +
    p('The results describe the exercised revision and paths. They do not substitute for a real VPS deployment, a production SMTP delivery check or a comprehensive accessibility audit.'),
    'evidence/verification.json · evidence/*-summary.txt · evidence/browser-checks.json'),
  page('Integration and deployment status',
    h('Integration checks') + p('The feature branch is integrated through the existing pull request after the backend, frontend and production-image CI jobs pass. The main copy is created from the merged commit and verified against it. A release record alongside that copy identifies the exact commit and archive checksum.') +
    h('CI download repair') + p('The earlier backend job failed while downloading the Maven distribution, before compiling or executing tests. CI now bootstraps the wrapper with up to three download attempts. The test command runs once after a successful bootstrap.') +
    h('VPS readiness') + p('The kit includes Compose, Nginx, TLS and smoke checks. Move the same code/image version, transfer private .env.prod over SSH and restore a MySQL backup; Git omits secrets and volumes. Update PUBLIC_URL and SMTP for the host. A live VPS remains unverified.') +
    table(['Remaining deployment task', 'Completion evidence required'], [['Provision the VPS and domain', 'Host reachable over SSH and DNS resolves correctly'], ['Configure secrets, database and SMTP', 'Production environment loaded with non-demo credentials'], ['Deploy the combined application', 'Remote health readiness and API smoke checks pass'], ['Enable HTTPS and WebSocket proxying', 'Browser loads over TLS and receives live auction updates'], ['Prove durability', 'Backup and restore procedure exercised on the target environment']]) +
    p('CDC step 12 is done: the remote checks passed on 19 November 2026 (docs/evidence/vps-smoke.json). The Argon-inspired rebuild remains an explicit assessment adaptation.'),
    '.github/workflows/ci.yml · DEPLOYMENT.md · deployment/deploy.sh · release record'),
  page('Conclusion and source index',
    p('ATELIER delivers a tested Spring Boot and Angular application with the CDC’s required User–Role and Client–Projet relationships, role-restricted management, JWT authentication and administrator notification. The gallery and auction features extend the model while preserving the documented coursework mapping.') +
    p('The verification found passing local backend, frontend, API and production-image checks. Browser flows provide additional evidence for the actual forms, role navigation, live updates and mobile layouts. The remaining required delivery step is live VPS deployment. The audit records the vocabulary and template interpretations so the assessment stays explicit.') +
    table(['Source', 'Use'], [['Supplied Cahier des charges PDF', 'Authority for the required entities and steps 1–12'], ['CDC_AUDIT.md / CDC_EQUIVALENCE.md', 'Requirement status, adaptations and implementation locations'], ['ARCHITECTURE.md / API.md', 'Architecture, contracts and business rules'], ['DATABASE.md / database.pdf', 'Complete physical schema and relationship analysis'], ['TEST_PLAN.md / docs/evidence/', 'Test scope and actual run results'], ['DEPLOYMENT.md / deployment/', 'VPS instructions and deployable configuration'], ['guide.pdf', 'Startup, usage walkthroughs and explanations'], ['slides.pdf / slides.pptx', 'Presentation and editable deck']]) +
    h('Project team') + p('Aziza Bellanes<br>SmartSoft Solutions<br>Formation FullStack Spring Boot and Angular<br>Dr Hanen Harbaoui<br>November 2026'),
    'Repository sources inspected during the 18 November 2026 audit'),
];
