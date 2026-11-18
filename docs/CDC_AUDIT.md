# CDC audit - Projects Manager adapted as ATELIER

Audit date: 18 November 2026. Scope: the supplied three-page `../Cahier_charges_projet_Formation(1).pdf`, current source code, database migrations, and recorded verification evidence. This is a traceability audit, not a claim of 100% specification completion.

**Conclusion:** the functional Spring/Angular requirements and required database relationships are implemented in an art-gallery vocabulary. Three explicit adaptations require clear presentation: Client becomes Artist, Projet becomes Exhibition; the role catalogue is fixed/read-only; the UI is an original implementation inspired by the cited Argon dashboard. A third BIDDER role and gallery/auction extensions broaden the product. Production packaging is evidenced locally. **CDC step 12, deployment to a live VPS, remains PENDING.**

## Status definitions

- **IMPLEMENTED / VERIFIED:** implementation exists, with relevant automated or recorded runtime evidence.
- **ADAPTED:** requirement intent is addressed with a stated design deviation; do not describe as an exact reproduction.
- **NOT HISTORICALLY EVIDENCED:** final behavior exists but an intermediate training step cannot be proven from the current repository.
- **PENDING:** required external outcome lacks evidence.

## Entity and field traceability

| CDC entity / field | ATELIER equivalent | Finding |
|---|---|---|
| User: id, email, password, tel, nom, prénom | users: id, email, password, phone, last_name, first_name | Present. password is a BCrypt hash. enabled and created_at extend the model. |
| Role: id, libellé | roles: id, libelle | Present. Enum labels ADMIN, COLLABORATEUR, BIDDER; role assignments editable through user administration. |
| Client: id, nom, tel, email, adresse | artists: id, name, phone, email, address | ADAPTED naming, all listed data represented. country, biography, photo_url, active and audit/version fields are extensions. |
| Projet: id, libellé, budget, durée, description, idClient | exhibitions: id, title, budget, duration_days, description, artist_id | ADAPTED naming, all listed data represented. starts_on, venue, cover_url and audit/version fields extend the model. |

Source: `backend/src/main/resources/db/migration/V1__core_schema.sql`; `backend/src/main/java/com/sip/psm/{user,artist,exhibition}/`.

## Required relationships

| Requirement | Database / JPA implementation | Evidence and boundary |
|---|---|---|
| User has one or more roles; role may be assigned to several users | True many-to-many through user_roles(user_id, role_id); composite PK; User.roles uses @ManyToMany | `DatabaseRelationshipsIT` verifies multiple roles per user and sharing one role across users after flush/clear/reload. Validated user DTOs require @NotEmpty role sets. SQL alone allows zero assignments. |
| Client has one or more projects; each project belongs to a client | Artist.exhibitions uses @OneToMany(mappedBy="artist"); Exhibition.artist uses @ManyToOne(optional=false); exhibitions.artist_id is NOT NULL | `DatabaseRelationshipsIT` verifies two exhibitions for one artist and both navigation directions after reload. A new artist can have zero exhibitions, then many; every stored exhibition requires one artist. |
| One-to-one | No such requirement appears in the supplied CDC | No one-to-one mapping or unique artwork_id exists. Artwork → Auction is one-to-many over history. Live overlap is a service rule. |

There are 8 application tables and 13 foreign keys in V1/V2. Their deletion actions are 2 CASCADE, 4 SET NULL, and 7 default RESTRICT. See `DATABASE.md` and `database.pdf` for the complete 70-column dictionary and all cardinalities. `docs/evidence/live-foreign-keys.tsv` records the 13 runtime FK endpoints, but does not record deletion actions; deletion rules above are traced to migrations.

## Numbered requirement audit

| CDC step | Status | Implementation / evidence | Qualification |
|---|---|---|---|
| 1. Create Spring Boot with Web, Data JPA, DevTools, MySQL driver | IMPLEMENTED / VERIFIED | `backend/pom.xml`: Web, Data JPA, optional runtime DevTools, MySQL connector; Spring Boot 3.5.16 and Java 17 target. Backend verification evidence passes. | Modern current stack retains the requested dependencies. |
| 2. Develop entity CRUD without security first | IMPLEMENTED / ADAPTED; intermediate phase NOT HISTORICALLY EVIDENCED | Artist, exhibition and user controllers/services provide CRUD. Role assignments are mutable through users; `AdminRoleController` exposes GET catalogue only. | Final application is secured. The repository does not independently establish that an unsecured intermediate development stage occurred. Full role create/update/delete is intentionally absent for the fixed security enum. |
| 3. Test APIs with Postman | IMPLEMENTED / VERIFIED | `postman/ATELIER.postman_collection.json`; recorded Newman run: 77 requests, 136 assertions, zero failures. | Newman runs the Postman collection; no claim of manual Postman session history is needed. |
| 4. Add security and JWT | IMPLEMENTED / VERIFIED | `SecurityConfig`, `JwtService`, `JwtAuthenticationFilter`, `TokenAuthenticator`; `AuthIT`, `SecurityMatrixIT`. | Server enforces authorization; frontend visibility is supplementary. |
| 5. Email administrator after registration | IMPLEMENTED / VERIFIED | `RegistrationMailListener` handles after-commit registration events asynchronously; `AuthIT.registrationSendsExactlyOneEmailToTheAdmin`; captured Mailpit notification in `docs/captures/29-mailpit-inbox.png` and `30-mailpit-registration-email.png`. | SMTP delivery failure is logged and does not roll back registration; no persistent email retry queue is implemented. Local Mailpit evidence does not establish remote production mail delivery. |
| 6. Test login and registration | IMPLEMENTED / VERIFIED | `AuthIT` has 10 passing tests in recorded evidence, including registration, duplicate email, validation, authentication, disabled users and mail paths; Postman collection also covers auth. | Automated result supported by `docs/evidence/verification.json`. |
| 7. Test Client/Projet resources after security | IMPLEMENTED / VERIFIED | Artist/Exhibition equivalent APIs covered by `CatalogFlowIT` and authorization matrix; `SecurityMatrixIT` records 84 passing cases across anonymous, BIDDER, COLLABORATEUR and ADMIN. | Adapted resource names are explicit. |
| 8. Angular components and navbar for Clients, Projets, Users using supplied dashboard mockup | IMPLEMENTED / ADAPTED | Artist, exhibition and user Studio features; route/layout navigation; browser captures and frontend tests. | Original ATELIER UI reimplements the dashboard approach inspired by Argon. It is not represented as an unchanged import or pixel-identical reproduction of the external template. |
| 9. Guard and interceptor | IMPLEMENTED / VERIFIED | `frontend/src/app/core/auth/guards.ts`, `auth.interceptor.ts`, and their specs; 61 frontend tests pass across 10 files. | Guards cover authentication/roles; interceptor attaches JWT to /api/ requests and handles rejected sessions. |
| 10. Respect roles | IMPLEMENTED / VERIFIED | ADMIN full artist/exhibition CRUD; COLLABORATEUR consult/add, no update/delete; BIDDER additional collector role. Backend matrix and Angular role guards/menu behavior. | BIDDER is an extension, not a replacement of the two required roles. Public gallery reads are a product extension; private Studio permissions remain enforced. |
| 11. Build psm.jar containing Angular in Spring static | IMPLEMENTED / VERIFIED | `Dockerfile` builds Angular, copies dist/atelier/browser into backend/src/main/resources/static, packages target/psm.jar; Maven with-frontend profile also copies Angular output. Recorded image `smartsoft/atelier:audit-20261118` uses Java 17 and was exercised locally. | Local production-container run at http://127.0.0.1:18081 provides packaging/runtime evidence. Image build uses -DskipTests; test evidence comes from separate completed verification runs. |
| 12. Deploy everything to a VPS | PENDING | No live VPS hostname, remote service evidence or authenticated remote deployment verification is supplied. | Docker packaging, local Compose and documentation do not prove this final deployment step. |

## Permission model against the CDC

| Operation on adapted Client / Projet | ADMIN | COLLABORATEUR | BIDDER |
|---|---|---|---|
| Consult Studio resources | Allowed | Allowed | Forbidden |
| Add | Allowed | Allowed | Forbidden |
| Modify | Allowed | Forbidden | Forbidden |
| Delete | Allowed, subject to integrity safeguards | Forbidden | Forbidden |

Role enumeration is a closed application contract. Treating the catalogue as read-only prevents arbitrary role labels that the authorization code does not recognize, but this remains a deviation if the broad wording “CRUD relative to the project entities” is interpreted to require independent Role CRUD. It should be acknowledged in presentation or agreed with the evaluator; it is not silently counted as exact compliance.

## Verification evidence and environment

Recorded in `docs/evidence/verification.json`:

| Suite / check | Result |
|---|---|
| Backend unit | 8 passed, 0 failed/errors/skipped |
| MySQL integration | 129 passed, 0 failed/errors/skipped |
| DatabaseRelationshipsIT subset | 2 passed, included in the 129 total |
| Frontend | 61 passed, 10 files, 0 failures |
| Newman | 77 requests, 136 assertions, 0 failures |
| Local backend Java | 21.0.2 compiling target release 17 |
| Production container Java | 17 |
| MySQL | 8.4.13 |
| Node | 22.23.2 |

This audit consumes the recorded results and source; it does not claim to have independently rerun every suite. The Java 17 backend, frontend and production-image jobs passed in [GitHub CI run 44268274452](https://github.com/aziza-bellanes/angluar-springboot-project/actions/runs/44268274452). UI evidence and a local production container demonstrate concrete flows but cannot substitute for unperformed VPS verification.

## Remaining acceptance work

1. Deploy the production image / psm.jar and database configuration to the intended VPS, configure its public route and environment, then record remote health, login, secured CRUD, registration email and Angular deep-link evidence. Until then step 12 remains PENDING.
2. Present Client → Artist, Projet → Exhibition, the read-only fixed role catalogue, added BIDDER role and Argon-inspired redesign as explicit adaptations. If strict role CRUD or exact template integration is required by the evaluator, obtain acceptance or implement that specifically rather than describing it as complete.
3. Preserve evidence that distinguishes database constraints from service rules: at least one role, matching artwork/exhibition artist, current auction overlap, transitions and bid increments are not SQL-wide guarantees.

## Reproducible supporting database reference

`python3 docs/database/generate.py` regenerates the schema JSON, relationship graph, editable HTML/CSS and `DATABASE.md` from the current V1/V2 migrations. `node docs/database/render.mjs` prints the 15-page A4 `database.pdf` using the shared Playwright/font dependencies. The PDF renderer fails on content/footer collision. Visual review images are QA intermediates under `/tmp/atelier-audit/db-qa`, not duplicate deliverables.
